"""Step 6 — Fine-tune ResNet18 on the exported wafer labels.

Reads :data:`TRAINING_LABELS_CSV`, performs a stratified 80/20 split (when
possible), and saves the best checkpoint to :data:`MODEL_PATH`. The output
checkpoint contains everything ``inference.py`` needs to rebuild the model
without recomputing the label list.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

from .constants import (
    IMAGE_DIR,
    MODEL_PATH,
    TRAIN_SPLIT_CSV,
    TRAINING_HISTORY_PATH,
    TRAINING_LABELS_CSV,
    VAL_SPLIT_CSV,
    VALID_PATTERNS,
)

EPOCHS = 20
BATCH_SIZE = 16
LR = 3e-4
VAL_FRACTION = 0.2
SEED = 42


LABEL_TO_IDX = {label: idx for idx, label in enumerate(VALID_PATTERNS)}
IDX_TO_LABEL = {idx: label for label, idx in LABEL_TO_IDX.items()}


class WaferDataset(Dataset):
    train_transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    val_transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    def __init__(self, df: pd.DataFrame, mode: str = "train") -> None:
        self.transform = self.train_transform if mode == "train" else self.val_transform
        self.records: list[tuple[str, int]] = []
        for _, row in df.iterrows():
            label = row["label"]
            if label not in LABEL_TO_IDX:
                continue

            label_hash = row.get("label_hash")
            label_hash = "" if not isinstance(label_hash, str) else label_hash
            filename = row.get("filename") or ""

            candidates = [
                row.get("local_path"),
                IMAGE_DIR / str(filename),
            ]
            if label_hash and filename:
                candidates.append(IMAGE_DIR / f"{label_hash[:8]}_{filename}")

            for path in candidates:
                if path and Path(path).exists():
                    self.records.append((str(path), LABEL_TO_IDX[label]))
                    break
        print(f"  [{mode}] kept {len(self.records)} usable images")

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int):
        path, label = self.records[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


def _stratified_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    try:
        from sklearn.model_selection import train_test_split

        eligible = df[df["label"].map(df["label"].value_counts()) >= 2]
        leftover = df.drop(eligible.index)
        train, val = train_test_split(
            eligible,
            test_size=VAL_FRACTION,
            random_state=SEED,
            stratify=eligible["label"],
        )
        if not leftover.empty:
            train = pd.concat([train, leftover], ignore_index=True)
        return train, val
    except Exception as exc:
        print(f"Stratified split unavailable ({exc}); falling back to random split.")
        val = df.sample(frac=VAL_FRACTION, random_state=SEED)
        train = df.drop(val.index)
        return train, val


def _build_model(num_classes: int) -> nn.Module:
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    for param in model.parameters():
        param.requires_grad = False
    for param in model.layer4.parameters():
        param.requires_grad = True
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def main() -> None:
    if not TRAINING_LABELS_CSV.exists():
        print(
            f"Missing {TRAINING_LABELS_CSV}. Run step5_export_labels first.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    df = pd.read_csv(TRAINING_LABELS_CSV)
    df = df[df["label"].isin(VALID_PATTERNS)].reset_index(drop=True)
    if df.empty:
        raise SystemExit("No usable rows in training_labels.csv.")

    print(f"Total labelled samples: {len(df)}")
    print("Class distribution:\n" + df["label"].value_counts().to_string())

    train_df, val_df = _stratified_split(df)
    train_df.to_csv(TRAIN_SPLIT_CSV, index=False)
    val_df.to_csv(VAL_SPLIT_CSV, index=False)
    print(f"\nTrain: {len(train_df)}  Val: {len(val_df)}")

    train_ds = WaferDataset(train_df, mode="train")
    val_ds = WaferDataset(val_df, mode="val")
    if len(train_ds) == 0:
        raise SystemExit("No training images found on disk.")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    model = _build_model(len(VALID_PATTERNS)).to(device)

    class_counts = df["label"].value_counts()
    weights = torch.tensor(
        [1.0 / max(1, class_counts.get(label, 1)) for label in VALID_PATTERNS],
        dtype=torch.float,
    ).to(device)
    weights = weights / weights.sum() * len(VALID_PATTERNS)

    criterion = nn.CrossEntropyLoss(weight=weights)
    optimiser = torch.optim.AdamW(
        [
            {"params": model.layer4.parameters(), "lr": LR},
            {"params": model.fc.parameters(), "lr": LR * 5},
        ]
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimiser, T_max=EPOCHS)

    history: list[dict] = []
    best_val_acc = 0.0
    last_per_class_total: dict[str, int] = {}

    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        train_correct = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimiser.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimiser.step()
            running_loss += loss.item() * images.size(0)
            train_correct += int((outputs.argmax(1) == labels).sum().item())
        scheduler.step()

        train_acc = train_correct / max(1, len(train_ds))

        model.eval()
        val_correct = 0
        per_class_correct = {label: 0 for label in VALID_PATTERNS}
        per_class_total = {label: 0 for label in VALID_PATTERNS}
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                preds = model(images).argmax(1)
                val_correct += int((preds == labels).sum().item())
                for pred, true in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                    label_name = IDX_TO_LABEL[true]
                    per_class_total[label_name] += 1
                    if pred == true:
                        per_class_correct[label_name] += 1

        val_acc = val_correct / max(1, len(val_ds))
        per_class_acc = {
            label: round(per_class_correct[label] / max(1, per_class_total[label]), 3)
            for label in VALID_PATTERNS
        }
        last_per_class_total = per_class_total

        marker = " best" if val_acc > best_val_acc else ""
        print(
            f"Epoch {epoch+1:2d}/{EPOCHS}  "
            f"loss={running_loss/max(1,len(train_ds)):.3f}  "
            f"train={train_acc*100:5.1f}%  "
            f"val={val_acc*100:5.1f}%{marker}"
        )

        history.append(
            {
                "epoch": epoch + 1,
                "train_acc": round(train_acc, 4),
                "val_acc": round(val_acc, 4),
                "per_class_acc": per_class_acc,
            }
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "labels": VALID_PATTERNS,
                    "label_to_idx": LABEL_TO_IDX,
                    "val_acc": val_acc,
                    "per_class_acc": per_class_acc,
                    "epoch": epoch + 1,
                    "config": {
                        "architecture": "resnet18",
                        "num_classes": len(VALID_PATTERNS),
                        "image_size": 224,
                        "trained_on_n_images": len(train_ds),
                    },
                },
                MODEL_PATH,
            )

    TRAINING_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    TRAINING_HISTORY_PATH.write_text(json.dumps(history, indent=2))

    print("\nDone.")
    print(f"Best validation accuracy: {best_val_acc*100:.1f}%")
    print(f"Checkpoint: {MODEL_PATH}")
    print(f"History:    {TRAINING_HISTORY_PATH}")
    print("\nPer-class accuracy at best epoch:")
    best_epoch = max(history, key=lambda entry: entry["val_acc"])
    for label in VALID_PATTERNS:
        acc = best_epoch["per_class_acc"].get(label, 0)
        bar = "#" * int(acc * 20)
        print(
            f"  {label:<10} {acc*100:5.1f}%  {bar}  "
            f"(n={last_per_class_total.get(label, 0)})"
        )


if __name__ == "__main__":
    main()
