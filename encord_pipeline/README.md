# Loopback Encord pipeline

Operational scripts for the Wafer AI defect-pattern dataset. Implements the
flow described in [`encord_prd.md`](../encord_prd.md) using the canonical
Encord Python SDK patterns and the Gemini 2.5 Flash model.

## Prerequisites

### Encord credentials

The Encord SDK uses an Ed25519 SSH keypair. The 64-character hex string the
Encord UI displays next to a key is only the **identifier** for that key, not
the credential. The SDK needs the contents of the `.txt` file Encord
downloaded when the key was generated. Configure one of:

1. `ENCORD_SSH_KEY_FILE=/absolute/path/to/key.txt` (recommended)
2. `ENCORD_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"`

If your service-account flow gives you a bearer token instead of an SSH key,
set `ENCORD_API_KEY` to that token. The pipeline auto-detects the case where
`ENCORD_API_KEY` is the short hex identifier and tells you what to do.

### Gemini

`GOOGLE_API_KEY` (or `GEMINI_API_KEY`) for pre-labelling.

### .env.local

Variables in `.env.local` at the repo root are auto-loaded by
`encord_pipeline/__init__.py` whenever you run `python -m encord_pipeline.X`,
so you can keep the keys there instead of exporting them every session.

### Install

```bash
pip install -r encord_pipeline/requirements.txt
```

## Execution sequence

Run from the repo root. Each step prints a summary; stop and review before
moving on.

```bash
python -m encord_pipeline.step1_inspect            # print + save ontology snapshot
python -m encord_pipeline.step1b_setup_ontology    # only if step1 reports missing options
python -m encord_pipeline.step2_download_images    # mirror images locally
python -m encord_pipeline.step3_prelabel           # Gemini -> Encord pre-labels
python -m encord_pipeline.step4_review_report      # generate review queue (then review in UI)
python -m encord_pipeline.step5_export_labels      # export reviewed labels to CSV
python -m encord_pipeline.step6_train              # train ResNet18 on the exports
python -m encord_pipeline.step6b_evaluate          # print metrics from the checkpoint
python -m encord_pipeline.step7_metrics            # package metrics for the UI panel
```

## What each step writes

| Step | Output |
| --- | --- |
| `step1_inspect` | `data/inspection_output.json` |
| `step1b_setup_ontology` | new ontology hash printed to stdout (and a project hash if `--create-project` is used) |
| `step2_download_images` | `data/encord_images/*.png`, `data/image_manifest.json` |
| `step3_prelabel` | classifications written to Encord, `data/encord_prelabels.csv` |
| `step4_review_report` | `data/review_queue.csv` |
| `step5_export_labels` | `data/training_labels.csv`, `data/encord_labels.csv` (used by `loopback-classifier`) |
| `step6_train` | `models/wafer_classifier.pt`, `data/training_history.json`, train/val splits |
| `step6b_evaluate` | per-class metrics to stdout |
| `step7_metrics` | `data/model_metrics.json` |

## Label contract

`encord_pipeline/constants.py` defines `VALID_PATTERNS`. These nine strings are
the wire contract with Engineer 2's `/enrich` endpoint and the literal type in
`Engineer_notes.md`. The ontology option `value` fields, the prediction CSV,
and the trained checkpoint all use the same strings unchanged.
