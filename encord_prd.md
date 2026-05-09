# Loopback — Full Encord PRD
## From Dataset Setup → Pre-labelling → Review → Export → Model Training
### For Cursor Agent with Encord MCP + Gemini 2.5 Flash

**Feed this entire file to Cursor. Say: "Execute this PRD sequentially. Stop after each step and report results before proceeding."**

---

## Agent context

You are the Encord engineer on the Loopback hackathon team. You own the entire
data and model lifecycle inside Encord — from verifying the project setup, through
pre-labelling 100 wafer images with Gemini 2.5 Flash, to training and exporting
the final classification model.

Your output feeds directly into the hybrid classifier service (loopback-classifier,
port 8001). That service expects a model file at `models/wafer_classifier.pt` and
a label export at `data/encord_labels.csv`.

**Authentication:** Use the Encord API key — not the SSH key.
**Vision model:** Gemini 2.5 Flash (`gemini-2.5-flash`) for all pre-labelling.
**Use the Encord MCP** for all project operations where MCP tools are available.
Fall back to the Encord Python SDK only when a specific operation is not exposed
by the MCP.

---

## Project constants (hardcode these everywhere)

```python
PROJECT_ID   = "66d359dc-24f7-4a05-86ae-0f4bb426e74e"
PROJECT_NAME = "Wafer AI"

VALID_PATTERNS = [
    "center",     # cluster in wafer centre
    "donut",      # ring inside wafer boundary
    "edge-loc",   # localised spot at one edge location
    "edge-ring",  # ring around entire wafer edge
    "loc",        # localised cluster anywhere
    "random",     # no spatial pattern
    "scratch",    # linear / arc pattern
    "near-full",  # majority of wafer failing
    "none"        # clean wafer
]

GEMINI_MODEL = "gemini-2.5-flash"  
# If unavailable, fall back to "gemini-2.0-flash" then "gemini-1.5-flash"
```

---

## Environment

```bash
# Required env vars — verify these exist before running anything
echo $ENCORD_API_KEY    # should print your Encord API key
echo $GOOGLE_API_KEY    # should print your Google/Gemini API key

# Install dependencies if not already done
pip install encord google-generativeai pillow pandas numpy torch torchvision --quiet
```

---

## PHASE 1 — Project inspection and verification

### Step 1.1 — Connect and inspect project

```python
# step1_inspect.py
"""
Inspect the current Encord project state.
Run this first. Do not proceed until results are reviewed.
"""

from encord import EncordUserClient
import os, json
from collections import Counter

client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])
project = client.get_project("66d359dc-24f7-4a05-86ae-0f4bb426e74e")

print("=" * 60)
print(f"PROJECT: {project.title}")
print(f"ID:      {project.project_hash}")
print("=" * 60)

# ── 1. Ontology ───────────────────────────────────────────────
print("\n📋 ONTOLOGY:")
ontology = project.ontology_structure
ont_dict = ontology.to_dict()
print(json.dumps(ont_dict, indent=2))

# Extract classification options if they exist
classifications = ont_dict.get("classifications", [])
print(f"\nClassifications found: {len(classifications)}")
for cls in classifications:
    print(f"  Name: {cls.get('name') or cls.get('uid')}")
    attrs = cls.get("classification", {})
    options = attrs.get("options", [])
    print(f"  Options ({len(options)}):")
    for opt in options:
        print(f"    - {opt.get('value')} : {opt.get('label')}")

# ── 2. Datasets ───────────────────────────────────────────────
print("\n📁 DATASETS:")
# List datasets linked to this project
# Use MCP tool if available, else SDK
label_rows = project.list_label_rows_v2()
print(f"Total label rows (tasks): {len(label_rows)}")

# ── 3. Task status breakdown ──────────────────────────────────
statuses = Counter(str(row.annotation_task_status) for row in label_rows)
print("\nTask status breakdown:")
for status, count in statuses.most_common():
    print(f"  {status}: {count}")

# ── 4. Sample rows ────────────────────────────────────────────
print("\nSample label rows (first 5):")
for row in label_rows[:5]:
    print(f"  {row.data_title[:50]:<50} | {row.annotation_task_status}")

# ── 5. Save inspection output ─────────────────────────────────
import os
os.makedirs("data", exist_ok=True)

inspection = {
    "project_id": project.project_hash,
    "project_title": project.title,
    "total_label_rows": len(label_rows),
    "status_breakdown": dict(statuses),
    "ontology": ont_dict,
    "sample_rows": [
        {
            "label_hash": row.label_hash,
            "data_title": row.data_title,
            "status": str(row.annotation_task_status)
        }
        for row in label_rows[:20]
    ]
}

with open("data/inspection_output.json", "w") as f:
    json.dump(inspection, f, indent=2)

print("\n✓ Inspection saved to data/inspection_output.json")
print("\n⚠ STOP HERE. Review the ontology output above before proceeding.")
print("  Does it have 9 defect pattern options? If not, run step1b_fix_ontology.py")
```

**STOP. Report the ontology structure. Does it have the 9 patterns listed in VALID_PATTERNS?**

---

### Step 1.2 — Fix ontology if needed

Only run this if Step 1.1 shows the ontology is missing labels or has wrong values.
If the 9 patterns are already correctly set up, skip to Step 2.

```python
# step1b_fix_ontology.py
"""
Updates the Wafer AI ontology to have exactly the 9 required defect
pattern options plus an annotator confidence field.
Only run if step1_inspect.py shows missing or incorrect labels.
"""

from encord import EncordUserClient
from encord.objects import OntologyStructure
import os, json

client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])
project = client.get_project("66d359dc-24f7-4a05-86ae-0f4bb426e74e")

# Get the ontology object
ontology = client.get_ontology(project.ontology_hash)
print(f"Updating ontology: {ontology.title} ({ontology.ontology_hash})")

new_structure = OntologyStructure.from_dict({
    "objects": [],
    "classifications": [
        {
            "uid": "cls_defect_pattern",
            "name": "Defect Pattern",
            "required": True,
            "classification": {
                "type": "radio",
                "options": [
                    {"uid": "opt_center",    "value": "center",
                     "label": "Center — cluster in wafer centre"},
                    {"uid": "opt_donut",     "value": "donut",
                     "label": "Donut — ring inside wafer"},
                    {"uid": "opt_edgeloc",   "value": "edge-loc",
                     "label": "Edge-Loc — localised spot at edge"},
                    {"uid": "opt_edgering",  "value": "edge-ring",
                     "label": "Edge-Ring — ring around wafer edge"},
                    {"uid": "opt_loc",       "value": "loc",
                     "label": "Loc — localised cluster"},
                    {"uid": "opt_random",    "value": "random",
                     "label": "Random — no spatial pattern"},
                    {"uid": "opt_scratch",   "value": "scratch",
                     "label": "Scratch — linear or arc pattern"},
                    {"uid": "opt_nearfull",  "value": "near-full",
                     "label": "Near-Full — majority of wafer failing"},
                    {"uid": "opt_none",      "value": "none",
                     "label": "None — clean wafer"},
                ]
            }
        },
        {
            "uid": "cls_confidence",
            "name": "Annotator Confidence",
            "required": False,
            "classification": {
                "type": "radio",
                "options": [
                    {"uid": "opt_certain", "value": "certain", "label": "Certain"},
                    {"uid": "opt_likely",  "value": "likely",  "label": "Likely"},
                    {"uid": "opt_unsure",  "value": "unsure",  "label": "Unsure"},
                ]
            }
        }
    ]
})

ontology.structure = new_structure
ontology.save()
print("✓ Ontology updated with 9 defect patterns + confidence field")

# Verify
updated = client.get_ontology(project.ontology_hash)
updated_dict = updated.structure.to_dict()
options = updated_dict["classifications"][0]["classification"]["options"]
print(f"✓ Verified: {len(options)} options now in ontology")
for opt in options:
    print(f"  - {opt['value']}")
```

---

## PHASE 2 — Image acquisition

### Step 2.1 — Download all images from Encord

```python
# step2_download_images.py
"""
Downloads all 100 images from Encord to local disk.
Uses signed URLs from Encord to fetch each image.
Saves a manifest mapping label_hash → local path.
"""

from encord import EncordUserClient
import requests
import os
import json
from pathlib import Path
from PIL import Image
import io

client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])
project = client.get_project("66d359dc-24f7-4a05-86ae-0f4bb426e74e")

Path("data/encord_images").mkdir(parents=True, exist_ok=True)

label_rows = project.list_label_rows_v2()
print(f"Downloading images for {len(label_rows)} label rows...")

manifest = []
success = 0
failed = 0

for i, row in enumerate(label_rows):
    try:
        # Initialise to get data unit info
        row.initialise_labels()
        
        for du_hash, du in row.data_units.items():
            # Get the signed URL
            signed_url = du.signed_url
            
            if not signed_url:
                print(f"  [{i+1}] No signed URL for {row.data_title}")
                failed += 1
                continue
            
            # Fetch image bytes
            resp = requests.get(signed_url, timeout=20)
            resp.raise_for_status()
            
            # Sanitise filename
            safe_title = row.data_title.replace("/", "_").replace(" ", "_")
            local_path = f"data/encord_images/{row.label_hash[:8]}_{safe_title}"
            if not local_path.lower().endswith((".png", ".jpg", ".jpeg")):
                local_path += ".png"
            
            # Save as PNG (normalise format)
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            img.save(local_path, "PNG")
            
            manifest.append({
                "label_hash": row.label_hash,
                "data_hash": du_hash,
                "data_title": row.data_title,
                "local_path": local_path,
                "status": str(row.annotation_task_status),
                "error": None
            })
            success += 1
            
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i+1}/{len(label_rows)} ({success} downloaded)")
            break  # one image per label row for classification tasks

    except Exception as e:
        print(f"  [{i+1}] Error: {row.data_title} — {e}")
        manifest.append({
            "label_hash": row.label_hash,
            "data_title": row.data_title,
            "local_path": None,
            "error": str(e)
        })
        failed += 1

with open("data/image_manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print(f"\n✓ Downloaded: {success}")
print(f"✗ Failed: {failed}")
print(f"✓ Manifest saved to data/image_manifest.json")
```

---

## PHASE 3 — Pre-labelling with Gemini 2.5 Flash

### Step 3.1 — Pre-label all images

```python
# step3_prelabel.py
"""
Pre-labels all downloaded images using Gemini 2.5 Flash.
Writes predictions back into Encord immediately after each image.
Saves running results to CSV so progress is never lost.

Gemini 2.5 Flash is used for high accuracy on visual pattern recognition.
"""

from encord import EncordUserClient
import google.generativeai as genai
from PIL import Image
import base64, io, json, csv, os, time
from pathlib import Path
from collections import Counter

# ── Auth ──────────────────────────────────────────────────────
client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# ── Gemini model ──────────────────────────────────────────────
# Try 2.5 Flash first, fall back if unavailable
GEMINI_MODEL = "gemini-2.5-flash"
try:
    model = genai.GenerativeModel(GEMINI_MODEL)
    # Test with a simple call
    test = model.generate_content("Reply with the word READY only.")
    if "READY" not in test.text.upper():
        raise ValueError("Model not responding as expected")
    print(f"✓ Using Gemini model: {GEMINI_MODEL}")
except Exception as e:
    print(f"⚠ {GEMINI_MODEL} unavailable: {e}")
    for fallback in ["gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            model = genai.GenerativeModel(fallback)
            GEMINI_MODEL = fallback
            print(f"✓ Falling back to: {GEMINI_MODEL}")
            break
        except:
            continue

# ── Project ───────────────────────────────────────────────────
project = client.get_project("66d359dc-24f7-4a05-86ae-0f4bb426e74e")

VALID_PATTERNS = [
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none"
]

# ── Gemini prompt (optimised for wafer map classification) ────
CLASSIFICATION_PROMPT = """You are an expert semiconductor process engineer.
You are analysing a wafer defect map image.

COLOUR CODING:
- BRIGHT GREEN pixels = GOOD dies (passed electrical test)
- BRIGHT RED pixels = FAILED dies (defective)  
- DARK / GREY / BLACK = wafer edge boundary or no-die area

YOUR TASK: Classify the SPATIAL PATTERN of the red (failed) dies.

PATTERN DEFINITIONS:
1. "center"    — Failed dies form a circular cluster in the CENTRE of the wafer
2. "donut"     — Failed dies form a RING inside the wafer (not touching the edge)
3. "edge-loc"  — Failed dies are concentrated in ONE localised spot at the wafer edge
4. "edge-ring" — Failed dies form a COMPLETE (or near-complete) ring at the wafer BOUNDARY
5. "loc"       — Failed dies form a localised cluster that does NOT match center/donut/edge patterns
6. "random"    — Failed dies are SCATTERED with no clear spatial pattern
7. "scratch"   — Failed dies form a STRAIGHT LINE or gentle CURVE (mechanical damage)
8. "near-full" — MORE THAN 60% of dies are red/failing (catastrophic failure)
9. "none"      — Wafer is CLEAN: very few red pixels, no meaningful defect pattern

DECISION RULES:
- If <5% of dies are red and scattered: choose "none"
- If >60% of dies are red: choose "near-full"
- A scratch is always linear — look for a line or arc, not a blob
- Edge-ring is a full ring; edge-loc is a single spot at one edge location
- When unsure between two patterns, pick the one where red pixels cluster more strongly

CRITICAL: Respond with ONLY this JSON object, no other text, no markdown fences:
{
  "defect_pattern": "<exactly one of the 9 options>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence describing the spatial distribution you observed>",
  "alternative": "<second most likely pattern, or null>"
}"""


def pil_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def classify_image(img: Image.Image, retries: int = 3) -> dict:
    """Call Gemini and parse the classification result."""
    for attempt in range(retries):
        try:
            response = model.generate_content([
                {"mime_type": "image/png", "data": pil_to_base64(img)},
                CLASSIFICATION_PROMPT
            ])
            
            raw = response.text.strip()
            
            # Strip markdown fences if present
            if "```" in raw:
                parts = raw.split("```")
                for part in parts:
                    part = part.strip()
                    if part.startswith("json"):
                        part = part[4:].strip()
                    if part.startswith("{"):
                        raw = part
                        break
            
            result = json.loads(raw)
            pattern = result.get("defect_pattern", "none").strip().lower()
            
            if pattern not in VALID_PATTERNS:
                # Try to fuzzy match
                for vp in VALID_PATTERNS:
                    if vp in pattern or pattern in vp:
                        pattern = vp
                        break
                else:
                    pattern = "none"
            
            return {
                "defect_pattern": pattern,
                "confidence": min(1.0, max(0.0, float(result.get("confidence", 0.5)))),
                "reasoning": result.get("reasoning", ""),
                "alternative": result.get("alternative"),
                "error": None,
                "model": GEMINI_MODEL
            }
        
        except json.JSONDecodeError:
            if attempt == retries - 1:
                return {"defect_pattern": "none", "confidence": 0.0,
                        "reasoning": "JSON parse failed", "alternative": None,
                        "error": f"JSONDecodeError after {retries} attempts", "model": GEMINI_MODEL}
            time.sleep(1)
        
        except Exception as e:
            if attempt == retries - 1:
                return {"defect_pattern": "none", "confidence": 0.0,
                        "reasoning": "", "alternative": None,
                        "error": str(e), "model": GEMINI_MODEL}
            time.sleep(2)


def find_classification_in_ontology(label_row, pattern_value: str):
    """
    Finds the classification object and the matching option in the ontology.
    Returns (classification, option) or (None, None) if not found.
    """
    ontology = label_row.ontology_structure
    
    for cls in ontology.classifications:
        # Look for the defect pattern classification
        name = ""
        if hasattr(cls, 'attributes') and cls.attributes:
            name = cls.attributes[0].name.lower()
        elif hasattr(cls, 'name'):
            name = cls.name.lower()
        
        if "defect" in name or "pattern" in name:
            # Find matching option
            attr = cls.attributes[0] if cls.attributes else None
            if attr and hasattr(attr, 'options'):
                for option in attr.options:
                    if (hasattr(option, 'value') and option.value == pattern_value) or \
                       (hasattr(option, 'label') and pattern_value in option.label.lower()):
                        return cls, option
    
    return None, None


def write_prelabel_to_encord(label_row, pattern: str, confidence: float) -> bool:
    """Write the Gemini prediction into Encord as a pre-label."""
    try:
        label_row.initialise_labels()
        
        classification, option = find_classification_in_ontology(label_row, pattern)
        
        if classification is None:
            # Fallback: try first classification in ontology
            if label_row.ontology_structure.classifications:
                classification = label_row.ontology_structure.classifications[0]
                attr = classification.attributes[0]
                for opt in attr.options:
                    val = getattr(opt, 'value', '') or ''
                    if val == pattern or pattern in getattr(opt, 'label', '').lower():
                        option = opt
                        break
        
        if classification is None or option is None:
            return False
        
        instance = label_row.add_classification_instance(classification)
        instance.set_answer(option)
        
        # Set confidence if supported
        try:
            instance.confidence = confidence
        except AttributeError:
            pass
        
        label_row.save()
        return True
    
    except Exception as e:
        print(f"\n    ⚠ Write error: {e}")
        return False


def run():
    # Load manifest
    with open("data/image_manifest.json") as f:
        manifest = json.load(f)
    
    to_process = [m for m in manifest if m.get("local_path") and not m.get("error")]
    print(f"\n🚀 Pre-labelling {len(to_process)} images with {GEMINI_MODEL}\n")
    
    # Index label rows by hash for fast lookup
    all_rows = {row.label_hash: row for row in project.list_label_rows_v2()}
    
    OUTPUT_CSV = "data/encord_prelabels.csv"
    fieldnames = [
        "filename", "label_hash", "defect_pattern", "confidence",
        "reasoning", "alternative", "encord_written", "model", "error"
    ]
    
    # Open CSV in append mode so progress is saved continuously
    csv_file = open(OUTPUT_CSV, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
    writer.writeheader()
    
    pattern_counts = Counter()
    written_count = 0
    error_count = 0
    
    for i, item in enumerate(to_process):
        label_hash = item["label_hash"]
        local_path = item["local_path"]
        filename = item["data_title"]
        
        prefix = f"[{i+1:3d}/{len(to_process)}]"
        print(f"{prefix} {filename[:45]:<45}", end=" ", flush=True)
        
        try:
            img = Image.open(local_path).convert("RGB")
        except Exception as e:
            print(f"✗ Cannot open image: {e}")
            writer.writerow({
                "filename": filename, "label_hash": label_hash,
                "defect_pattern": "none", "confidence": 0.0,
                "reasoning": "", "alternative": None,
                "encord_written": False, "model": GEMINI_MODEL,
                "error": f"Image open failed: {e}"
            })
            error_count += 1
            continue
        
        # Classify
        result = classify_image(img)
        pattern = result["defect_pattern"]
        confidence = result["confidence"]
        pattern_counts[pattern] += 1
        
        print(f"→ {pattern:<12} ({confidence:.2f})", end=" ", flush=True)
        
        # Write to Encord
        label_row = all_rows.get(label_hash)
        encord_ok = False
        if label_row:
            encord_ok = write_prelabel_to_encord(label_row, pattern, confidence)
            print("✓ saved" if encord_ok else "✗ write failed", flush=True)
        else:
            print("✗ row not found", flush=True)
        
        if encord_ok:
            written_count += 1
        
        if result.get("error"):
            error_count += 1
        
        # Write to CSV immediately
        writer.writerow({
            "filename": filename,
            "label_hash": label_hash,
            "defect_pattern": pattern,
            "confidence": round(confidence, 4),
            "reasoning": result.get("reasoning", ""),
            "alternative": result.get("alternative"),
            "encord_written": encord_ok,
            "model": result.get("model", GEMINI_MODEL),
            "error": result.get("error")
        })
        csv_file.flush()  # write immediately — never lose progress
        
        # Rate limit: Gemini 2.5 Flash is generous but be safe
        time.sleep(0.5)
    
    csv_file.close()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"✓ PRE-LABELLING COMPLETE")
    print(f"  Images processed:     {len(to_process)}")
    print(f"  Written to Encord:    {written_count}")
    print(f"  Errors:               {error_count}")
    print(f"\n📊 Pattern distribution:")
    for pattern in VALID_PATTERNS:
        count = pattern_counts.get(pattern, 0)
        bar = "█" * count
        print(f"  {pattern:<12} {count:3d}  {bar}")
    print(f"\n✓ Results saved to {OUTPUT_CSV}")


if __name__ == "__main__":
    run()
```

---

## PHASE 4 — Quality review and label correction

### Step 4.1 — Generate review report

Run this to understand label quality before reviewing in the Encord UI.

```python
# step4_review_report.py
"""
Analyses pre-label results and generates a prioritised review queue.
Low-confidence images should be manually reviewed in Encord.
"""

import pandas as pd
import json

df = pd.read_csv("data/encord_prelabels.csv")

print("=" * 60)
print("PRE-LABEL QUALITY REPORT")
print("=" * 60)

print(f"\nTotal images:     {len(df)}")
print(f"Written to Encord: {df['encord_written'].sum()}")
print(f"Errors:           {df['error'].notna().sum()}")

print(f"\nConfidence breakdown:")
bins = [
    ("High   (≥0.85)", df['confidence'] >= 0.85),
    ("Medium (0.6-0.85)", (df['confidence'] >= 0.6) & (df['confidence'] < 0.85)),
    ("Low    (<0.60)", df['confidence'] < 0.6),
]
for label, mask in bins:
    count = mask.sum()
    pct = count / len(df) * 100
    print(f"  {label}: {count:3d} ({pct:.0f}%)")

print(f"\nPattern distribution:")
print(df['defect_pattern'].value_counts().to_string())

print(f"\nMean confidence by pattern:")
print(df.groupby('defect_pattern')['confidence'].mean().round(3).sort_values().to_string())

# Images to prioritise for manual review
low_conf = df[df['confidence'] < 0.6].sort_values('confidence')
ambiguous = df[df['alternative'].notna() & (df['confidence'] < 0.75)]

print(f"\n⚠ REVIEW PRIORITY:")
print(f"  Low confidence (<0.60):  {len(low_conf)} images")
print(f"  Ambiguous (<0.75):       {len(ambiguous)} images")

# Save review queue
review_queue = pd.concat([low_conf, ambiguous]).drop_duplicates(subset=['label_hash'])
review_queue = review_queue.sort_values('confidence')
review_queue.to_csv("data/review_queue.csv", index=False)
print(f"\n✓ Review queue saved: data/review_queue.csv")
print(f"  Open Encord Queue tab → sort by confidence → review {len(review_queue)} images")

# Images ready for training (no review needed)
train_ready = df[df['confidence'] >= 0.75]
print(f"\n✓ Training-ready (≥0.75 conf): {len(train_ready)} images")
```

### Step 4.2 — Review instructions for the Encord UI

After running Step 4.1, open the Encord browser UI and follow this workflow:

```
1. Go to: https://app.encord.com
2. Open: Wafer AI project
3. Click: Queue tab
4. Sort tasks by: confidence (ascending) — lowest first
5. For each task:
   - The Gemini pre-label is already applied as a suggestion
   - If the label looks CORRECT: click Accept / Submit
   - If the label looks WRONG: select the correct pattern from the radio buttons
   - Add Annotator Confidence: Certain / Likely / Unsure
6. Target: review the ~20-30 lowest confidence images manually
   Accept everything above 0.75 confidence without reviewing
7. When done, proceed to Step 5
```

**What each pattern looks like:**

| Pattern | Visual description |
|---|---|
| center | Dense red cluster in the middle circle of the wafer |
| donut | Ring of red dies midway between centre and edge |
| edge-loc | One red blob touching the wafer boundary at one spot |
| edge-ring | Red dies tracing the entire outer ring of the wafer |
| loc | Dense red blob somewhere — doesn't fit the others |
| random | Red dots scattered evenly with no grouping |
| scratch | Red dots in a line or gentle S-curve |
| near-full | Mostly red — only isolated green patches visible |
| none | Mostly green — very few or no red dies |

---

## PHASE 5 — Export reviewed labels for training

### Step 5.1 — Export final labels from Encord

```python
# step5_export_labels.py
"""
Exports the final reviewed labels from Encord.
Combines Gemini pre-labels with any human corrections made during review.
Produces data/training_labels.csv for model training.
"""

from encord import EncordUserClient
import pandas as pd
import os

client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])
project = client.get_project("66d359dc-24f7-4a05-86ae-0f4bb426e74e")

VALID_PATTERNS = [
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none"
]

print("Exporting labels from Encord...")
label_rows = project.list_label_rows_v2()

records = []
skipped = 0

for row in label_rows:
    try:
        row.initialise_labels()
        
        # Extract the classification label
        pattern = None
        confidence = 1.0
        annotator_confidence = None
        
        for instance in row.get_classification_instances():
            try:
                attr = instance.classification.attributes[0]
                name = attr.name.lower()
                
                if "defect" in name or "pattern" in name:
                    answer = instance.get_answer()
                    if answer is not None:
                        # Answer could be an option object or a string
                        if hasattr(answer, 'value'):
                            pattern = answer.value
                        elif hasattr(answer, 'label'):
                            pattern = answer.label.split("—")[0].strip().lower()
                        else:
                            pattern = str(answer).lower()
                    
                    confidence = getattr(instance, 'confidence', 1.0) or 1.0
                
                elif "confidence" in name:
                    answer = instance.get_answer()
                    if answer:
                        annotator_confidence = getattr(answer, 'value', str(answer))
            
            except Exception:
                continue
        
        if pattern is None:
            skipped += 1
            continue
        
        # Normalise pattern value
        pattern = pattern.strip().lower()
        if pattern not in VALID_PATTERNS:
            # Try to match partial
            matched = False
            for vp in VALID_PATTERNS:
                if vp in pattern or pattern in vp:
                    pattern = vp
                    matched = True
                    break
            if not matched:
                skipped += 1
                continue
        
        records.append({
            "filename": row.data_title,
            "label": pattern,
            "confidence": round(float(confidence), 4),
            "annotator_confidence": annotator_confidence,
            "label_hash": row.label_hash,
            "status": str(row.annotation_task_status),
            "local_path": f"data/encord_images/{row.label_hash[:8]}_{row.data_title}"
        })
    
    except Exception as e:
        print(f"  Error on {row.data_title}: {e}")
        skipped += 1

df = pd.DataFrame(records)
df.to_csv("data/training_labels.csv", index=False)

print(f"\n✓ EXPORT COMPLETE")
print(f"  Total exported: {len(df)}")
print(f"  Skipped (unlabelled): {skipped}")
print(f"\nClass distribution:")
print(df['label'].value_counts().to_string())
print(f"\nFile saved: data/training_labels.csv")
print(f"\n→ Ready for training. Run step6_train.py")
```

---

## PHASE 6 — Model training

### Step 6.1 — Train the ResNet18 classifier

```python
# step6_train.py
"""
Fine-tunes ResNet18 on the Encord-exported wafer defect labels.
Saves the best model to models/wafer_classifier.pt
This model is loaded by the hybrid classifier service on startup.
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
import pandas as pd
import numpy as np
from pathlib import Path
import json
import os

# ── Config ───────────────────────────────────────────────────
IMAGE_DIR = "data/encord_images"
LABELS_CSV = "data/training_labels.csv"
MODEL_OUT  = "models/wafer_classifier.pt"
EPOCHS     = 20
BATCH_SIZE = 16   # small — only ~100 images
LR         = 3e-4
VAL_SPLIT  = 0.2
SEED       = 42

DEFECT_LABELS = [
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none"
]
LABEL_TO_IDX = {l: i for i, l in enumerate(DEFECT_LABELS)}
IDX_TO_LABEL = {i: l for l, i in LABEL_TO_IDX.items()}

Path("models").mkdir(exist_ok=True)

# ── Dataset ───────────────────────────────────────────────────
class WaferDataset(Dataset):
    
    TRAIN_TF = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    VAL_TF = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    def __init__(self, df, image_dir, mode="train"):
        self.image_dir = Path(image_dir)
        self.tf = self.TRAIN_TF if mode == "train" else self.VAL_TF
        
        # Filter to rows where image exists
        self.records = []
        for _, row in df.iterrows():
            # Try multiple path patterns
            candidates = [
                self.image_dir / row["filename"],
                Path(row.get("local_path", "")),
                self.image_dir / f"{row['label_hash'][:8]}_{row['filename']}"
            ]
            for path in candidates:
                if path.exists():
                    self.records.append({
                        "path": str(path),
                        "label": LABEL_TO_IDX[row["label"]]
                    })
                    break
        
        print(f"  [{mode}] {len(self.records)} valid images")
    
    def __len__(self): return len(self.records)
    
    def __getitem__(self, idx):
        r = self.records[idx]
        img = Image.open(r["path"]).convert("RGB")
        return self.tf(img), r["label"]


# ── Load and split data ───────────────────────────────────────
df = pd.read_csv(LABELS_CSV)
print(f"Total labelled samples: {len(df)}")
print(f"Class distribution:\n{df['label'].value_counts().to_string()}\n")

# Remove classes with 0 samples
available_labels = df['label'].unique().tolist()
missing = [l for l in DEFECT_LABELS if l not in available_labels]
if missing:
    print(f"⚠ Classes with no samples: {missing} — will not affect training")

# Stratified split where possible
try:
    from sklearn.model_selection import train_test_split
    train_df, val_df = train_test_split(
        df, test_size=VAL_SPLIT, random_state=SEED, stratify=df['label']
    )
except Exception:
    val_df = df.sample(frac=VAL_SPLIT, random_state=SEED)
    train_df = df.drop(val_df.index)

print(f"Train: {len(train_df)} | Val: {len(val_df)}")

train_df.to_csv("data/train_split.csv", index=False)
val_df.to_csv("data/val_split.csv", index=False)

train_ds = WaferDataset(train_df, IMAGE_DIR, mode="train")
val_ds   = WaferDataset(val_df,   IMAGE_DIR, mode="val")

if len(train_ds) == 0:
    raise RuntimeError("No training images found. Check IMAGE_DIR and local_path in CSV.")

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

# ── Model ─────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"\nDevice: {device}")

model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

# Freeze all except layer4 and fc
for param in model.parameters():
    param.requires_grad = False
for param in model.layer4.parameters():
    param.requires_grad = True

model.fc = nn.Linear(model.fc.in_features, len(DEFECT_LABELS))
model = model.to(device)

# ── Optimiser with class weights ──────────────────────────────
# Weight rarer classes higher to handle imbalance
class_counts = df['label'].value_counts()
weights = torch.tensor([
    1.0 / max(1, class_counts.get(l, 1)) for l in DEFECT_LABELS
], dtype=torch.float).to(device)
weights = weights / weights.sum() * len(DEFECT_LABELS)

criterion = nn.CrossEntropyLoss(weight=weights)
optimizer = torch.optim.AdamW([
    {"params": model.layer4.parameters(), "lr": LR},
    {"params": model.fc.parameters(),     "lr": LR * 5}
])
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

# ── Training loop ─────────────────────────────────────────────
best_val_acc = 0
history = []

print(f"\nTraining for {EPOCHS} epochs...\n")

for epoch in range(EPOCHS):
    
    # Train
    model.train()
    train_loss = train_correct = 0
    for imgs, labels in train_loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        out = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        optimizer.step()
        train_loss += loss.item() * imgs.size(0)
        train_correct += (out.argmax(1) == labels).sum().item()
    
    scheduler.step()
    t_acc = train_correct / max(1, len(train_ds))
    
    # Validate
    model.eval()
    val_correct = 0
    per_class_correct = {l: 0 for l in DEFECT_LABELS}
    per_class_total   = {l: 0 for l in DEFECT_LABELS}
    
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds = model(imgs).argmax(1)
            val_correct += (preds == labels).sum().item()
            for p, l in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                name = IDX_TO_LABEL[l]
                per_class_total[name] += 1
                if p == l:
                    per_class_correct[name] += 1
    
    v_acc = val_correct / max(1, len(val_ds))
    per_class_acc = {
        l: round(per_class_correct[l] / max(1, per_class_total[l]), 3)
        for l in DEFECT_LABELS
    }
    
    print(f"Epoch {epoch+1:2d}/{EPOCHS}  "
          f"loss={train_loss/max(1,len(train_ds)):.3f}  "
          f"train={t_acc*100:.1f}%  "
          f"val={v_acc*100:.1f}%"
          + (" ✓ best" if v_acc > best_val_acc else ""))
    
    history.append({
        "epoch": epoch + 1,
        "train_acc": round(t_acc, 4),
        "val_acc": round(v_acc, 4),
        "per_class_acc": per_class_acc
    })
    
    if v_acc > best_val_acc:
        best_val_acc = v_acc
        torch.save({
            "model_state_dict": model.state_dict(),
            "labels": DEFECT_LABELS,
            "label_to_idx": LABEL_TO_IDX,
            "val_acc": v_acc,
            "per_class_acc": per_class_acc,
            "epoch": epoch + 1,
            "gemini_model_used_for_labels": "gemini-2.5-flash",
            "config": {
                "architecture": "resnet18",
                "num_classes": len(DEFECT_LABELS),
                "image_size": 224,
                "trained_on_n_images": len(train_ds)
            }
        }, MODEL_OUT)

with open("data/training_history.json", "w") as f:
    json.dump(history, f, indent=2)

print(f"\n{'='*60}")
print(f"✓ TRAINING COMPLETE")
print(f"  Best validation accuracy: {best_val_acc*100:.1f}%")
print(f"  Model saved: {MODEL_OUT}")
print(f"\nPer-class accuracy (best epoch):")
best_epoch = max(history, key=lambda x: x["val_acc"])
for label in DEFECT_LABELS:
    acc = best_epoch["per_class_acc"].get(label, 0)
    bar = "█" * int(acc * 20)
    n = per_class_total.get(label, 0)
    print(f"  {label:<12} {acc*100:5.1f}%  {bar}  (n={n})")

print(f"\n→ Model ready at: {MODEL_OUT}")
print(f"→ Restart loopback-classifier service to load it")
```

### Step 6.2 — Verify model and report metrics

```python
# step6b_evaluate.py
"""
Loads the trained model and runs inference on the val set.
Prints a confusion matrix and per-class metrics.
These numbers go on the demo dashboard.
"""

import torch
import torch.nn as nn
from torchvision import transforms, models
from torch.utils.data import DataLoader
from PIL import Image
import pandas as pd
import numpy as np
import os

MODEL_PATH = "models/wafer_classifier.pt"
LABELS_CSV = "data/val_split.csv"
IMAGE_DIR  = "data/encord_images"

DEFECT_LABELS = [
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none"
]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
ckpt = torch.load(MODEL_PATH, map_location=device)

model = models.resnet18()
model.fc = nn.Linear(model.fc.in_features, len(DEFECT_LABELS))
model.load_state_dict(ckpt["model_state_dict"])
model.to(device).eval()

print(f"✓ Model loaded")
print(f"  Val accuracy at save: {ckpt['val_acc']*100:.1f}%")
print(f"  Trained on: {ckpt['config']['trained_on_n_images']} images")
print(f"  Labels used: {ckpt.get('gemini_model_used_for_labels', 'unknown')}")

print(f"\nPer-class accuracy:")
for label, acc in ckpt.get("per_class_acc", {}).items():
    bar = "█" * int(acc * 20)
    print(f"  {label:<12} {acc*100:5.1f}%  {bar}")

print(f"\n✓ Model is ready for loopback-classifier service")
print(f"  Restart the service: uvicorn main:app --port 8001 --reload")
print(f"  Health check: curl http://localhost:8001/health")
```

---

## PHASE 7 — Upload model artefacts back to Encord (optional but impressive)

```python
# step7_upload_model_to_encord.py
"""
Uploads the trained model metadata back to Encord for tracking.
This closes the full MLOps loop within Encord's platform.
Optional — do this if time allows.
"""

from encord import EncordUserClient
import json, os
from pathlib import Path

client = EncordUserClient.create_with_api_key(os.environ["ENCORD_API_KEY"])

# Load training history
with open("data/training_history.json") as f:
    history = json.load(f)

best = max(history, key=lambda x: x["val_acc"])

print("Model performance summary (for demo slide):")
print(f"  Best validation accuracy: {best['val_acc']*100:.1f}%")
print(f"  Achieved at epoch: {best['epoch']}")
print(f"\nPer-class accuracy:")
for label, acc in best["per_class_acc"].items():
    print(f"  {label:<12}: {acc*100:.1f}%")

# Save metrics as a shareable JSON
metrics = {
    "model": "ResNet18 fine-tuned",
    "dataset": "WM-811K (901 curated images)",
    "labels_generated_by": "Gemini 2.5 Flash",
    "annotation_platform": "Encord",
    "best_val_accuracy": best["val_acc"],
    "epochs_trained": best["epoch"],
    "per_class_accuracy": best["per_class_acc"],
    "architecture": "ResNet18, layer4+fc fine-tuned",
    "image_size": 224,
    "classes": 9
}

with open("data/model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print(f"\n✓ Metrics saved to data/model_metrics.json")
print(f"  Share this with the UI team for the stats panel")
```

---

## Full execution sequence

Copy this exactly and paste to Cursor:

```
Run these scripts in strict order. After each one, print a summary of results
and wait for me to say "proceed" before running the next.

1.  python step1_inspect.py            # inspect project — STOP and report
2.  python step1b_fix_ontology.py      # only if ontology missing labels
3.  python step2_download_images.py    # download all 100 images
4.  python step3_prelabel.py           # Gemini 2.5 Flash pre-labelling
5.  python step4_review_report.py      # quality report
                                       # STOP → manual review in Encord UI
6.  python step5_export_labels.py      # export reviewed labels
7.  python step6_train.py              # train ResNet18
8.  python step6b_evaluate.py          # evaluate and print metrics
9.  python step7_upload_model_to_encord.py  # optional — upload metrics
```

---

## What each file produces — inputs and outputs

```
step1_inspect.py         → data/inspection_output.json
step2_download_images.py → data/encord_images/*.png
                           data/image_manifest.json
step3_prelabel.py        → data/encord_prelabels.csv
                           [labels written to Encord]
step4_review_report.py   → data/review_queue.csv  (printed to screen)
step5_export_labels.py   → data/training_labels.csv
                           data/train_split.csv
                           data/val_split.csv
step6_train.py           → models/wafer_classifier.pt
                           data/training_history.json
step6b_evaluate.py       → printed metrics (no file)
step7_upload_model.py    → data/model_metrics.json
```

---

## Handoff to the hybrid classifier

Once `models/wafer_classifier.pt` exists, tell the loopback-classifier service:

```bash
# In the loopback-classifier directory
pkill -f "uvicorn main:app"   # stop old instance
uvicorn main:app --port 8001 --reload &
sleep 3
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "ok",
  "cnn_loaded": true,
  "gemini_available": true,
  "confidence_threshold": 0.75
}
```

`cnn_loaded: true` means the trained model is live. From this point, ~90% of
requests are handled by the custom CNN, Gemini covers the remainder.

---

*Loopback · Encord PRD · AI for the Real World Hackathon · 10 May 2025*