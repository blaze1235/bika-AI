# Bika AI — MVP

AI camera analytics: fall detection + staff review dashboard.

## Setup

```bash
pip install -r requirements.txt
```

## Run

**Terminal 1 — Backend + Review UI:**
```bash
./start.sh
# Open http://127.0.0.1:8000 in your browser
```

**Terminal 2 — Detector (MacBook webcam):**
```bash
python -m detector.detector
# Press Q to quit
```

**Detector with a video file (for testing without a camera):**
```bash
python -m detector.detector --source path/to/video.mp4
```

**Detector with IP camera (next week):**
```bash
python -m detector.detector --source rtsp://192.168.1.x:554/stream --camera-id cam-01
```

## How it works

1. Detector reads frames from the camera
2. MediaPipe tracks **multiple people** with stable IDs (Person 1, Person 2…)
3. If a person's torso goes horizontal (>threshold) for 2+ seconds → fall event fires
4. The event is tagged with the **zone** the person was in (if zones are drawn)
5. A 10-second clip (3s before + 5s after) + snapshot is saved
6. Event appears **instantly** in the review dashboard (WebSocket live push)
7. Staff clicks ✓ / ✗ / ? and selects what actually happened
8. Each review feeds the **self-calibration loop** (below)

## Pages

- **`/`** — Review dashboard: live events, confirm form, accuracy stats
- **`/zones`** — Zone editor: draw named areas on the camera view (Playground, Hallway…)

## The self-improvement loop (no model training needed yet)

Every review teaches the system. The `/calibration` endpoint scans all reviewed
falls and finds the torso-angle threshold that best separates **real falls** from
**false alarms** based on staff verdicts. The detector pulls this calibrated
threshold automatically — so the more you review, the fewer false alarms you get.

Once you've collected enough labeled events, export them for real model training:

```bash
# CSV of every reviewed event with its label
curl http://127.0.0.1:8000/export?format=csv -o training_data.csv
```

(Or click **Export training data** in the dashboard.)

## Tuning fall sensitivity

Edit `detector/fall_detector.py`:
- `angle_threshold` (default 55°) — lower = more sensitive, more false alarms
- `confirmation_seconds` (default 2.0) — higher = fewer false alarms but slower detection
- `cooldown_seconds` (default 8.0) — minimum gap between events from the same fall
