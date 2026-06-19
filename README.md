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
2. MediaPipe Pose tracks body keypoints every frame
3. If the torso angle goes horizontal (>55°) for 2+ seconds → fall event fires
4. A 10-second clip (3s before + 5s after) + snapshot is saved
5. Event appears in the review dashboard
6. Staff clicks ✓ / ✗ / ? and selects what actually happened
7. Each review = labeled training data for future model improvement

## Tuning fall sensitivity

Edit `detector/fall_detector.py`:
- `angle_threshold` (default 55°) — lower = more sensitive, more false alarms
- `confirmation_seconds` (default 2.0) — higher = fewer false alarms but slower detection
- `cooldown_seconds` (default 8.0) — minimum gap between events from the same fall
