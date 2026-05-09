# LOOPBACK — YC PRODUCT VIDEO
**Runtime: 3:00 · Format: YC launch-style · NEA HQ Hackathon, 10 May 2025**

---

## TIMING & VOICEOVER BUDGET

Total runtime **180 seconds**. Spoken word target: **~430 words** at 145 wpm (YC pace, slightly fast).

| Section | In | Out | Duration | VO words |
|---|---|---|---|---|
| 1. Cold open (in-person hook) | 0:00 | 0:18 | 18s | 38 |
| 2. Camera dive into MacBook | 0:18 | 0:25 | 7s | 14 |
| 3. Chip zoom-in (stock + VO) | 0:25 | 0:50 | **25s** | 60 |
| 4. Webpage problem statement | 0:50 | 1:15 | 25s | 60 |
| 5. Founders + cost reveal | 1:15 | 1:35 | 20s | 48 |
| 6. Technical solution (3 acts) | 1:35 | 2:05 | 30s | 72 |
| 7. Live demo | 2:05 | 2:45 | 40s | 95 |
| 8. Close + CTA | 2:45 | 3:00 | 15s | 35 |
| **TOTAL** | | | **180s** | **422 words** |

---

## CAST & LOCATIONS

- **HARPER** — on-camera presenter (you). Crewneck, no logo. Holds a MacBook.
- **MACBOOK SCREEN** — the bridge between physical and digital.
- **LOOPBACK WEBPAGE** — Lovable-built landing page, must exist by Saturday morning.
- **DEMO UI** — the 3-panel app: defect feed / pattern view / corrective action log.

**Locations:**
- INT. NEA HQ MAIN ROOM (or hallway with industrial backdrop) — for cold open
- DESK SETUP — clean wood desk, MacBook, single window of natural light camera-left

---

## SCREENPLAY

---

### 1. COLD OPEN — 0:00–0:18

**FADE IN:**

**EXT./INT. NEA HQ — DAY**

Wide shot. HARPER walks into frame holding a MacBook, closed. Direct address to camera. No music yet — just room tone.

**HARPER**
*(walking, casual, eye contact)*
Right now, somewhere in a Taiwanese fab, a process engineer is staring at a wafer. Twenty-three percent of it just came back defective. They have no idea why.

*(stops walking, opens the MacBook to camera)*

It will take them three days to find out. By then, ten thousand more chips are in the bin. Two million dollars — gone.

**[CAMERA PUSHES IN on the MacBook screen as Harper holds it open toward us. Music sting in: low, urgent, semi-industrial — building.]**

---

### 2. CAMERA DIVE — 0:18–0:25

**TRANSITION: MATCH-DISSOLVE INTO SCREEN**

The MacBook screen fills frame. We push *through* the screen — a brief CSS-grid / wireframe blur — and emerge into a microscope view.

**HARPER (V.O.)**
This is the inside of an Nvidia H100. The most valuable square inch of silicon on Earth.

---

### 3. CHIP ZOOM-IN — 0:25–0:50 *(25 seconds, voiceover-driven)*

**FOOTAGE:** Stock microscopy — start at a full GPU package, zoom progressively into transistor-level imagery. (Sources: TSMC promo footage, Nvidia keynote stills, microscopy from publicly licensed scientific archives. Do **not** lift directly from copyrighted Nvidia keynotes — use stock or Pexels equivalents.)

The zoom is one continuous motion. Each beat below is roughly 4 seconds. Match VO to visual scale.

**HARPER (V.O.)**
*(0:25 — wide chip package, gold contacts visible)*
Every modern AI model in the world runs on chips like this one.

*(0:29 — zoom past the package edge, into the substrate layer)*
And every chip like this one passes through five hundred manufacturing steps. Five hundred chances to fail.

*(0:33 — closer, copper interconnect lattice visible)*
A solder void here. A misaligned bump there. A reflow oven that drifts three degrees on a Tuesday afternoon.

*(0:38 — deep into the metallization layers, abstract circuitry)*
One in five high-end packages — scrapped. Each one carries four thousand dollars of integrated silicon.

*(0:43 — transistor-level, almost abstract — gates and traces)*
The defect is detected in seconds. The cause? Three days. Sometimes a month.

*(0:47 — pull back slightly, hold)*
Three days the line keeps running. Three days the bin keeps filling.

**[SHARP CUT to webpage]**

---

### 4. WEBPAGE — PROBLEM STATEMENT — 0:50–1:15

**INT. SCREEN-CAPTURE / LOVABLE LANDING PAGE**

Hero section of the Loopback webpage, clean YC-style. Big serif headline appears on screen as VO hits it:

> **The AI process engineer that closes the loop.**

Below, three stat cards animate in, one per beat:

- **$100B** — Lost to chip yield defects every year
- **3 days → 4 minutes** — Time to root cause
- **0** — Human engineers required

**HARPER (V.O.)**
*(brisk, factual — the explainer voice)*
The semiconductor industry shipped six hundred and twenty-seven billion dollars of chips last year. Roughly one hundred billion of that bled out to defects nobody could diagnose fast enough.

Detection is solved — every fab has cameras, every fab has microscopes. **Diagnosis** is not solved. That's where the bleeding happens.

Loopback closes the loop.

---

### 5. FOUNDERS + COST REVEAL — 1:15–1:35

**SCROLL DOWN the webpage.** Four founder photos appear — clean headshots on neutral background. Names and roles overlay each.

**HARPER (V.O.)**
We're four people who've spent way too much time thinking about why factories break.

**[Cut to a dynamic stat card section as the page scrolls]**

A side-by-side animated table appears, each row dropping in as VO hits it:

| Today | With Loopback |
|---|---|
| 3 days to root cause | 4 minutes |
| $2M lost per incident | $40K |
| 1 senior engineer | 0 |

**HARPER (V.O.)**
A single yield excursion at a leading-edge fab costs around two million dollars. That's one event. Most fabs see dozens a year. We're going after every dollar of it.

---

### 6. TECHNICAL SOLUTION — 1:35–2:05 *(three acts, 10 seconds each)*

**MOTION GRAPHIC SECTION.** Three numbered panels animate in left-to-right.

**[Panel 1 — SEE IT — defect imagery with bounding boxes drawing in]**

**HARPER (V.O.)**
Act one — **see it.** Computer vision flags every defect on the line in real time. Type, location, severity, confidence — in seconds.

**[Panel 2 — UNDERSTAND IT — grid of batches with one cluster lighting up red]**

Act two — **understand it.** We correlate defects across thousands of batches. Same signature, same machine, same shift, same oven temperature drift. We fingerprint the cause.

**[Panel 3 — FIX IT — a parameter slider adjusts itself, then a green CHECK appears]**

Act three — **fix it.** The AI issues a corrective action. Reduce reflow zone three by three degrees. Then it watches the next batch and verifies the fix worked. No human in the chain.

---

### 7. LIVE DEMO — 2:05–2:45 *(the money shot)*

**TRANSITION: webpage fades, demo UI fills frame.**

Three-panel UI: defect feed (left), pattern map (center), corrective action log (right).

**ON SCREEN:**
- A WM-811K wafer image gets dropped into the feed.
- Bounding boxes draw in. Tags appear: `solder void · severity 8 · conf 0.94`.
- The pattern view scrolls. 200 batches. A red cluster pulses on Machine 3, Tuesday 14:00.

**HARPER (V.O.)**
*(present-tense, demo voice)*
Watch this. We drop in a real microscopy image. Gemini Vision tags the defect in under two seconds.

Now look at the pattern view — two hundred batches. Forty packages, same signature, all clustered on machine three, Tuesday afternoon shift.

**[The corrective action panel fills with text. The text reads itself onto the screen as VO catches up:]**

> **Root cause:** Reflow oven Zone 3 thermal drift, +4.2°C over baseline.
> **Action:** Reduce Zone 3 by 3°C. Increase paste viscosity 5%.
> **Confidence:** 87%.
> **Predicted defect rate:** 23% → 4%.

**HARPER (V.O.)**
The AI files its diagnosis. Fires the corrective action. The next simulated batch comes back —

**[The defect-rate gauge ticks down. Hold on a beat. Then the screen flashes GREEN with one word: **VERIFIED.**]**

— clean. Closed loop. No engineer, no email thread, no three-day investigation.

---

### 8. CLOSE — 2:45–3:00

**TRANSITION:** demo screen pulls back. We're back inside the MacBook view. Camera retreats out of the screen — match-dissolve — Harper's face fills frame again. He's closing the laptop.

**HARPER**
*(direct address, calm)*
Every fab on Earth has this problem. Nobody has closed this loop.

*(beat)*

We're Loopback. We're hiring.

**[CUT TO:** end card. Logo. URL. Tagline:]

> **LOOPBACK** — *the AI that fixes itself.*
> loopback.ai

**FADE OUT.**

---

## PRODUCTION NOTES

### Camera & motion
- **Cold open**: handheld, slight movement, walking pace. Natural light.
- **Dive into screen**: keep the MacBook physically open and tilted toward camera. The "push through the screen" is done in post — match the angle of the screen exactly to your incoming digital footage so the dissolve sells.
- **Chip zoom**: must be one continuous-feeling motion. If you can't find a single 25-second clip, stitch 3–4 clips with seamless cross-dissolves at scene-change moments.
- **Demo**: screen recording at 60fps. Clean cursor. Pre-script the click path so there are zero hesitations. Record 3 takes minimum.
- **Close**: mirror the cold open framing exactly. Shooting back-to-back at the same location/lighting matters here.

### Audio
- **Music**: one track, builds gradually. Cut it out completely on the GREEN VERIFIED beat — silence is the punctuation. Bring it back swelling for the close.
- **VO**: record separately in a quiet room with a decent mic. Do not rely on on-camera audio for anything beyond the cold open and final line.
- **Pace**: 145 wpm is firm-but-not-rushed. Practice with a stopwatch.

### Visual references
- YC video model: Cluely launch video, Lovable launch video, Mercury launch video. Watch these for pacing.
- Chip-zoom reference: opening of *The Insider* (Branagh), or the chip-fly-through in any Apple silicon keynote.

### Demo dependencies (NEEDED BY SATURDAY 2 PM)
- Loopback webpage live on Lovable with hero, problem stats, founders, three-act explainer
- Demo UI with three panels working end-to-end
- Pre-loaded WM-811K image to drop in
- Hardcoded "victory path" through the demo — do **not** improvise on camera

### What to film tonight (Friday)
- Dry runs of the cold open and close — get the framing locked
- Test push-into-screen transition with a 5-second dummy version
- Record VO scratch track to confirm timing — if any section runs over budget, cut from sections 5 or 6, never the demo

### Deliverable cuts
- **3:00 master** for the pitch
- **0:60 highlight** (sections 1, 6, 7 only) for socials
- **0:30 hook** (section 1 + 7 ending) for X/LinkedIn

---

*End of screenplay.*