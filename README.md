<div align="center">

# CoWoS

### The autonomous AI process engineer for advanced semiconductor packaging.

**It detects defects on the line, diagnoses why the factory created them, and prescribes the corrective process change — closing a multi-week, multi-million-dollar root-cause loop in minutes.**

🏆 *Winner — AI for the Real World Hack · Operators & Friends · NEA · Transition*

</div>

---

## Why this exists

The AI revolution is not bottlenecked by compute or data. It is bottlenecked by **chip packaging** — the physical layer that stacks silicon dies, HBM, interposers, and substrates into the chips that train every frontier model. TSMC's CoWoS-L, the package that holds Nvidia's Blackwell, has a **12–18 month waitlist**. Inside that queue is a hidden catastrophe.

| Number | What it is | Source |
|---|---|---|
| **$627.6B** | Global semiconductor sales, 2024 | SIA / WSTS |
| **10–30%** | Cost of Poor Quality benchmark | Juran / ASQ |
| **~$100B** | Annual yield-loss envelope, industry-wide | Derived (COPQ × sales) |
| **~1 in 5** | Blackwell packages scrapped during current ramp | Epoch AI Monte Carlo |
| **~$4,300** | Integrated silicon lost per scrapped CoWoS-L package | Epoch AI cost waterfall |
| **~$21M** | Cost of one inline-undetected excursion (25K WSPM fab) | KLA |
| **3–5 days → 1–2 mo** | Time-to-root-cause: routine → cross-departmental | MST 2024 / KLA |
| **67,000** | Unfilled US semi jobs by 2030 | SIA + Oxford Economics |

> *"It is not the shortage of AI chips. It is the shortage of our CoWoS capacity."*
> — **Mark Liu**, TSMC Chairman, September 2023

When a defect pattern emerges, a process engineer hunts the root cause manually. The line keeps running while the engineer thinks. CoWoS replaces the loop.

---

## What CoWoS does

**Act 1 — See it.** A CNN trained on Encord-labeled wafer/package imagery detects defects in real time. Type, coordinate, severity, confidence. Falls back to Gemini for low-confidence patterns.

**Act 2 — Understand it.** The agent correlates the defect signature across batches, machines, shifts, suppliers, and recipe history. Not *"this package is bad"* — *"these 40 packages share the same void signature, all from machine 3, shift 2, Tuesday 14:00–16:00, after a late delivery from supplier B."*

**Act 3 — Fix it.** It computes a corrective protocol — *"reduce reflow zone 3 by 3°C, increase paste viscosity 5%; estimated defect rate 23% → 4%"* — scores the projected RPN delta, then watches the next batch to verify. Closed loop. No human in the chain.

The whole flow is grounded in the standards every fab and OSAT already speaks: **MIL-STD-1629A** (FMECA), **IPC-A-610J Class 3** (acceptability), **JEDEC JESD22** (stress-test qualification), **SEMI E142 / E10 / E79** (substrate maps, equipment state, OEE), and **AIAG-VDA 2019** Action Priority lookups.

---

## Architecture

CoWoS is three processes wired together. All three auto-load `.env.local` at startup. The frontend ships with mock fallbacks ([`src/api.js`](src/api.js)) so the UI is developable without the backends, but the live demo runs all three.

| Port | Service | Stack | Purpose |
|---|---|---|---|
| **5173** | React + Vite + Tailwind frontend | Bricolage Grotesque · Geist · JetBrains Mono | Pitch landing page (`/`), live dashboard (`/demo`, `/defect`, `/fix`) |
| **8000** | `loopback_api` (FastAPI) | Pandas · Gemini · ReportLab | FMECA scoring, root-cause correlation, fix-and-verify, audit-ready PDF |
| **8001** | `classifier_service` (FastAPI) | PyTorch · Gemini fallback | Hybrid wafer-defect classifier |

### Data flow

```
       Wafer image (UI upload)
                |
                v
   classifier_service /classify          <- CNN trained via encord_pipeline
                |  { defect_pattern, confidence }
                v
       loopback_api /enrich              <- FMECA score (S, O, D, RPN)
                |
                v
       loopback_api /correlate           <- Pandas + Gemini root-cause analysis
                |
                v
       loopback_api /fix-and-verify      <- Simulate fix, verify, RPN delta
                |
                v
       loopback_api /report              <- Generate audit-ready PDF
```

---

## Quickstart

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.13** (a `.venv` is already set up at the repo root)
- **`.env.local`** populated with `ENCORD_SSH_KEY_FILE` and `GOOGLE_API_KEY` — see [`.env.example`](.env.example)
- **Trained model** at `models/wafer_classifier.pt` (produced by [`encord_pipeline`](encord_pipeline/README.md))
- **Simulated batch data** at `data/batches.json`
  *(regenerate with `python -m loopback_api.data_sim.batch_simulator`)*

### Run all three (one terminal each)

```bash
# Terminal 1 — frontend (Vite)
npm install
npm run dev

# Terminal 2 — CoWoS API (FMECA · correlation · fix-and-verify · PDF)
source .venv/bin/activate
uvicorn loopback_api.main:app --port 8000 --reload

# Terminal 3 — classifier (CNN + Gemini hybrid)
source .venv/bin/activate
uvicorn classifier_service.main:app --port 8001 --reload
```

Then open the URL Vite prints (default `http://localhost:5173`). The frontend hits `localhost:8000` and `localhost:8001` automatically — override with `VITE_API_BASE_URL` and `VITE_CLASSIFIER_URL` at build/dev time.

### Smoke tests

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

---

## API surface

### `classifier_service` · :8001

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET`  | `/health`   | — | `{ status: "ok" }` |
| `POST` | `/classify` | `multipart/form-data file=` | `{ defect_pattern, confidence, method }` |

### `loopback_api` · :8000

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET`  | `/health`           | — | `{ status: "ok" }` |
| `POST` | `/enrich`           | `{ image_id, defect_pattern, confidence }` | `{ severity, occurrence, detection, rpn, ipc_a_610_class }` |
| `POST` | `/correlate`        | `{ defect_pattern }` | `{ root_cause, evidence[], shift_window, machine_id }` |
| `POST` | `/fix-and-verify`   | `{ target_defect }` | `{ recommendation, projected_rpn, verification }` |
| `POST` | `/report`           | `{ target_defect }` | `application/pdf` |

---

## Frontend surfaces

| Route | Page | Purpose |
|---|---|---|
| `/`       | **Landing**     | Six-section scroll-driven pitch deck — problem · market · logistics · founders · solution · demo CTA |
| `/demo`   | **Pipeline**    | Live 8-stage CoWoS-L line with selectable stages, fleet yield card, inspector terminal |
| `/defect` | **Defect**      | Failure mode A247293C3 — SEM-style visualization, Hugo correlation, FMECA scoring (S=8, O=4, D=3, RPN=96) |
| `/fix`    | **Resolution**  | RPN 187 → 42, schematic with crosshair targeting, FMECA report export |

---

## Repository layout

| Path | Purpose |
|---|---|
| `src/`                  | React + Vite + Tailwind frontend |
| `src/pages/Landing.jsx` | Scroll-driven pitch landing page |
| `src/pages/TheLine.jsx` · `TheDefect.jsx` · `TheFix.jsx` | Dashboard surfaces |
| `loopback_api/`         | FastAPI backend on `:8000` — standards intelligence, reporting *(directory name retained to avoid breaking imports; brand is CoWoS)* |
| `classifier_service/`   | FastAPI backend on `:8001` — CNN + Gemini hybrid |
| `encord_pipeline/`      | One-shot scripts for dataset prep, pre-labeling, training. See its [README](encord_pipeline/README.md) |
| `models/`               | Trained PyTorch checkpoints |
| `data/`                 | Generated batches, label CSVs, image mirror |
| `reports/`              | PDF outputs from `/report` |
| `Engineer_notes.md`     | Pitch research pack & engineering PRD (source of every number on the landing page) |
| `encord_prd.md`         | Engineer 1 PRD (source spec for `encord_pipeline`) |
| `demo-2.md` · `demo-script.md` | Demo flow & narration script |
| `linkedin-post.txt`     | Win announcement post |

---

## Standards spoken natively

`MIL-STD-1629A`  ·  `IPC-A-610J`  ·  `J-STD-001J`  ·  `JEDEC JESD22-A101 / A104 / A108 / A110 / A113 / B111A`  ·  `JEDEC JESD47`  ·  `SEMI E10`  ·  `SEMI E79`  ·  `SEMI E142`  ·  `KLARF`  ·  `SAE J1739:2021`  ·  `AIAG-VDA FMEA Handbook 2019`

The pitch pack ([`Engineer_notes.md`](Engineer_notes.md)) carries the full primary-source citation list, including caveat flags for any number that should not be asserted as primary disclosure.

---

## Team

| | |
|---|---|
| **Richard Lao**       | Co-founder · CEO    |
| **Gaurav**            | Co-founder · Engineering |
| **Harper**            | Co-founder · Standards & GTM |
| **Vikkash**           | Co-founder · ML & Perception |

Built in a weekend at the AI for the Real World Hack, May 2026.

---

## Backed by

**Sponsored by [Operators & Friends](http://www.operatorsandfriends.com)** with **[NEA](https://www.nea.com/)** & **[Transition](https://transition.vc/)**.

## Powered by

**[ElevenLabs](https://elevenlabs.io/)** · **[OpenAI](https://openai.com/)** · **[Google DeepMind](https://deepmind.google/)** · **[Encord](https://encord.com/)** · **[Lovable](https://lovable.dev/?via=operatorsandfriends)**

## Acknowledgments

The Encord team for the track and the perception toolkit that made Act 1 real. **David Pacák** and the Transition team for the energy. **Michelangelo Pagliara** and **Juhana Peltomaa** at Operators & Friends for hosting. **Elie de Fressenel** at NEA for backing it.

---

<div align="center">

**AI can finally move atoms, not just pixels.**

</div>
