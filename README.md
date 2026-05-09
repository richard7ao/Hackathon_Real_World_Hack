# CoWoS

Three processes wired together:

| Port | Service | Owner | Purpose |
| --- | --- | --- | --- |
| 5173 | React + Vite + Tailwind frontend | teammate | Demo UI |
| 8000 | `loopback_api` (FastAPI) | this repo | FMECA / standards intelligence per Engineer_notes.md |
| 8001 | `classifier_service` (FastAPI) | this repo | Hybrid wafer-defect classifier (CNN + Gemini fallback) |

Both backends auto-load `.env.local` at startup. The frontend has built-in mock
fallbacks per [`src/api.js`](src/api.js), so you can develop the UI without the
backends running, but for the real demo you want all three.

## Prerequisites

- Node.js 18+ and npm
- Python 3.13 (a `.venv` is already set up at the repo root)
- `.env.local` populated with `ENCORD_SSH_KEY_FILE` and `GOOGLE_API_KEY`
  (see [`.env.example`](.env.example))
- Trained model at `models/wafer_classifier.pt` (produced by
  [`encord_pipeline`](encord_pipeline/README.md))
- Simulated batch data at `data/batches.json` (regenerate with
  `python -m loopback_api.data_sim.batch_simulator`)

## Run all three (one terminal each)

```bash
# Terminal 1 — frontend
npm install
npm run dev

# Terminal 2 — CoWoS API (FMECA, correlation, fix-and-verify, PDF)
source .venv/bin/activate
uvicorn loopback_api.main:app --port 8000 --reload

# Terminal 3 — Classifier (POST /classify with a wafer image)
source .venv/bin/activate
uvicorn classifier_service.main:app --port 8001 --reload
```

Then open the URL Vite prints (default `http://localhost:5173`). The frontend
will hit `localhost:8000` and `localhost:8001` automatically (override with
`VITE_API_BASE_URL` / `VITE_CLASSIFIER_URL` env vars at build/dev time).

## Smoke tests

```bash
# Health
curl -s http://localhost:8000/health
curl -s http://localhost:8001/health

# Full chain on a real wafer image
SAMPLE=$(ls data/encord_images/*.jpg | head -1)
curl -s -X POST -F "file=@$SAMPLE" http://localhost:8001/classify
curl -s -X POST http://localhost:8000/enrich \
    -H 'Content-Type: application/json' \
    -d '{"image_id":"smoke","defect_pattern":"edge-ring","confidence":0.91}'
curl -s -X POST http://localhost:8000/fix-and-verify \
    -H 'Content-Type: application/json' \
    -d '{"target_defect":"edge-ring"}'
curl -s -X POST http://localhost:8000/report \
    -H 'Content-Type: application/json' \
    -d '{"target_defect":"edge-ring"}' -o /tmp/report.pdf
```

## How the data flows

```
Wafer image (UI upload)
        |
        v
classifier_service /classify          <- CNN trained via encord_pipeline
        |  {defect_pattern, confidence}
        v
loopback_api /enrich                  <- FMECA score (S, O, D, RPN)
        |
        v
loopback_api /correlate               <- Pandas + Gemini root-cause analysis
        |
        v
loopback_api /fix-and-verify          <- Simulate fix, verify, RPN delta
        |
        v
loopback_api /report                  <- Generate audit-ready PDF
```

## Repo layout

| Path | What |
| --- | --- |
| `src/` | React frontend (Lovable-style) |
| `loopback_api/` | FastAPI backend on :8000 — standards, intelligence, reporting |
| `classifier_service/` | FastAPI backend on :8001 — CNN + Gemini hybrid |
| `encord_pipeline/` | One-shot scripts for dataset / pre-label / train. See its [README](encord_pipeline/README.md) |
| `models/` | Trained PyTorch checkpoints |
| `data/` | Generated batches, label CSVs, image mirror |
| `reports/` | PDF outputs from `/report` |
| `Engineer_notes.md` | Engineer 2 PRD (the source spec for `loopback_api`) |
| `encord_prd.md` | Engineer 1 PRD (the source spec for `encord_pipeline`) |
| `demo-2.md`, `demo-script.md` | Pitch + research |
