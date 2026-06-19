"""
Bika AI — Main detection loop (multi-person fall detection).

Usage:
  python -m detector.detector                       # built-in webcam
  python -m detector.detector --source video.mp4    # video file
  python -m detector.detector --source rtsp://...    # IP camera

Detected fall events are POSTed to the backend API. The detector also:
  - tracks multiple people with stable IDs
  - tags each event with the zone the person was in (drawn in the Zones page)
  - pushes a live snapshot so the Zones editor has a background image
  - pulls the auto-calibrated fall threshold learned from staff reviews
"""

import argparse
import os
import sys
import time
import threading

import requests
import cv2

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from detector.buffer import RollingBuffer
from detector.fall_detector import FallDetector, POSE_CONNECTIONS
from detector.zones import ZoneManager

BACKEND_URL = os.environ.get("BIKA_BACKEND", "http://127.0.0.1:8000")
CLIPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "clips")
SNAPSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "snapshots")
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

PERSON_COLORS = [
    (66, 135, 245), (245, 167, 66), (66, 245, 156),
    (245, 66, 197), (245, 230, 66),
]


def color_for(track_id: int):
    return PERSON_COLORS[track_id % len(PERSON_COLORS)]


def draw_person(frame, person):
    h, w = frame.shape[:2]
    lm = person["landmarks"]
    col = color_for(person["track_id"])
    if person["is_fallen"]:
        col = (0, 0, 255)

    for a, b in POSE_CONNECTIONS:
        if a < len(lm) and b < len(lm):
            x1, y1 = int(lm[a].x * w), int(lm[a].y * h)
            x2, y2 = int(lm[b].x * w), int(lm[b].y * h)
            cv2.line(frame, (x1, y1), (x2, y2), col, 2)
    for pt in lm:
        cv2.circle(frame, (int(pt.x * w), int(pt.y * h)), 3, (255, 255, 255), -1)

    cx, cy = int(person["centroid"][0] * w), int(person["centroid"][1] * h)
    label = f"ID {person['track_id']}  {person['torso_angle']:.0f}deg"
    cv2.putText(frame, label, (cx - 30, cy - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2)


def draw_zones(frame, zones):
    h, w = frame.shape[:2]
    for z in zones:
        x1, y1 = int(z["x1"] * w), int(z["y1"] * h)
        x2, y2 = int(z["x2"] * w), int(z["y2"] * h)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (160, 160, 160), 1)
        cv2.putText(frame, z["name"], (x1 + 4, y1 + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)


def draw_overlay(frame, num_people, any_fallen, flash):
    cv2.rectangle(frame, (0, 0), (320, 78), (0, 0, 0), -1)
    cv2.putText(frame, "Bika AI - Fall Detector", (8, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
    cv2.putText(frame, f"People tracked: {num_people}", (8, 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
    status = "FALL DETECTED" if any_fallen else "Normal"
    scol = (0, 0, 255) if any_fallen else (0, 200, 0)
    cv2.putText(frame, status, (8, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, scol, 2)

    if flash:
        h, w = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w, h), (0, 0, 255), 6)


def save_clip_and_snapshot(frames, tag: int):
    ts = int(time.time())
    clip_path = os.path.join(CLIPS_DIR, f"event_{tag}_{ts}.mp4")
    snap_path = os.path.join(SNAPSHOTS_DIR, f"event_{tag}_{ts}.jpg")
    if frames:
        h, w = frames[0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(clip_path, fourcc, 15, (w, h))
        for f in frames:
            out.write(f)
        out.release()
        cv2.imwrite(snap_path, frames[len(frames) // 2])
    return clip_path, snap_path


def post_event(payload):
    try:
        r = requests.post(f"{BACKEND_URL}/events", json=payload, timeout=5)
        if r.ok:
            print(f"[detector] Event saved (id={r.json().get('id')})")
    except requests.exceptions.ConnectionError:
        print("[detector] Backend not reachable — event not saved.")
    except Exception as e:
        print(f"[detector] post_event error: {e}")


def post_snapshot(camera_id, frame):
    try:
        ok, buf = cv2.imencode(".jpg", frame)
        if ok:
            requests.post(
                f"{BACKEND_URL}/cameras/{camera_id}/snapshot",
                data=buf.tobytes(),
                headers={"Content-Type": "image/jpeg"},
                timeout=3,
            )
    except requests.exceptions.RequestException:
        pass


def fetch_calibrated_threshold():
    try:
        r = requests.get(f"{BACKEND_URL}/calibration", timeout=3)
        if r.ok:
            data = r.json()
            if data.get("suggested_threshold") and data.get("reviewed_count", 0) >= 10:
                return data["suggested_threshold"]
    except requests.exceptions.RequestException:
        pass
    return None


def run(source, camera_id, show_window):
    cap_source = int(source) if str(source).isdigit() else source
    cap = cv2.VideoCapture(cap_source)
    if not cap.isOpened():
        print(f"[detector] Cannot open source: {source}")
        sys.exit(1)

    fps = int(cap.get(cv2.CAP_PROP_FPS) or 15)
    buffer = RollingBuffer(fps=fps, seconds=10)
    detector = FallDetector()

    # Apply auto-calibrated threshold learned from staff reviews
    calibrated = fetch_calibrated_threshold()
    if calibrated:
        detector.set_threshold(calibrated)
        print(f"[detector] Using calibrated fall threshold from reviews: {calibrated} deg")

    zones = ZoneManager(BACKEND_URL, camera_id)
    zones.refresh()

    captures = []  # active clip captures: {remaining, frames, payload}
    flash = 0
    last_snapshot = 0
    last_zone_refresh = time.time()
    last_calib_refresh = time.time()

    print(f"[detector] Running. Source={source}  Camera={camera_id}. Press Q to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[detector] Stream ended.")
            break

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        people = detector.process(frame_rgb)

        draw_zones(frame, zones.zones)
        for p in people:
            draw_person(frame, p)

        buffer.add(frame)

        # advance active captures
        still_active = []
        for c in captures:
            c["frames"].append(frame.copy())
            c["remaining"] -= 1
            if c["remaining"] <= 0:
                threading.Thread(
                    target=_finalize_capture, args=(c,), daemon=True
                ).start()
            else:
                still_active.append(c)
        captures = still_active

        any_fallen = any(p["is_fallen"] for p in people)
        for p in people:
            if p["event"]:
                flash = 45
                zone_name = zones.zone_for_point(*p["centroid"])
                payload = {
                    "camera_id": camera_id,
                    "event_type": "fall",
                    "confidence": p["confidence"],
                    "torso_angle": p["torso_angle"],
                    "person_track_id": p["track_id"],
                    "zone_name": zone_name,
                }
                pre = buffer.frames_before(time.time(), pre_seconds=3)
                captures.append({
                    "remaining": int(fps * 5),
                    "frames": list(pre),
                    "payload": payload,
                })
                z = f" in zone '{zone_name}'" if zone_name else ""
                print(f"[detector] FALL: person {p['track_id']}{z} "
                      f"angle={p['torso_angle']} conf={p['confidence']:.2f}")

        flash = max(0, flash - 1)
        draw_overlay(frame, len(people), any_fallen, flash > 0)

        # periodic background tasks
        now = time.time()
        if now - last_snapshot > 5:
            post_snapshot(camera_id, frame.copy())
            last_snapshot = now
        if now - last_zone_refresh > 15:
            zones.refresh()
            last_zone_refresh = now
        if now - last_calib_refresh > 60:
            c = fetch_calibrated_threshold()
            if c and abs(c - detector.angle_threshold) > 0.1:
                detector.set_threshold(c)
                print(f"[detector] Threshold auto-updated to {c} deg")
            last_calib_refresh = now

        if show_window:
            cv2.imshow("Bika AI - Detector", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    detector.close()
    if show_window:
        cv2.destroyAllWindows()


def _finalize_capture(c):
    clip, snap = save_clip_and_snapshot(c["frames"], c["payload"]["person_track_id"])
    payload = dict(c["payload"])
    payload["clip_path"] = clip
    payload["snapshot_path"] = snap
    post_event(payload)


def main():
    parser = argparse.ArgumentParser(description="Bika AI detector")
    parser.add_argument("--source", default="0", help="Camera index, video file, or RTSP URL")
    parser.add_argument("--camera-id", default="cam-01", help="Logical camera identifier")
    parser.add_argument("--no-window", action="store_true", help="Run headless")
    args = parser.parse_args()
    run(args.source, args.camera_id, not args.no_window)


if __name__ == "__main__":
    main()
