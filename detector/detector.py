"""
Main detection loop.

Usage:
  python detector.py                    # built-in webcam
  python detector.py --source 0         # webcam index 0
  python detector.py --source video.mp4 # video file
  python detector.py --source rtsp://...  # IP camera

Detected fall events are POSTed to the backend API.
"""

import argparse
import os
import sys
import time
import threading
import requests
import cv2
import mediapipe as mp
import numpy as np

# Allow running from project root or detector/ dir
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from detector.buffer import RollingBuffer
from detector.fall_detector import FallDetector

BACKEND_URL = os.environ.get("BIKA_BACKEND", "http://127.0.0.1:8000")
CLIPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "clips")
SNAPSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "snapshots")
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

MP_POSE = mp.solutions.pose
MP_DRAWING = mp.solutions.drawing_utils
MP_DRAWING_STYLES = mp.solutions.drawing_styles


def draw_overlay(frame, angle, is_fallen, event_fired):
    h, w = frame.shape[:2]
    status_color = (0, 0, 255) if is_fallen else (0, 200, 0)
    status_text = "FALL DETECTED" if is_fallen else "Normal"

    cv2.rectangle(frame, (0, 0), (300, 80), (0, 0, 0), -1)
    cv2.putText(frame, "Bika AI — Fall Detector", (8, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
    if angle is not None:
        cv2.putText(frame, f"Torso angle: {angle:.1f} deg", (8, 46),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
    cv2.putText(frame, status_text, (8, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

    if event_fired:
        cv2.rectangle(frame, (0, 0), (w, h), (0, 0, 255), 6)
        cv2.putText(frame, "! EVENT SAVED !", (w // 2 - 120, h // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
    return frame


def save_clip_and_snapshot(frames, event_id: int) -> tuple[str, str]:
    """Write pre+post frames to a clip file; return (clip_path, snapshot_path)."""
    ts = int(time.time())
    clip_name = f"event_{event_id}_{ts}.mp4"
    snap_name = f"event_{event_id}_{ts}.jpg"
    clip_path = os.path.join(CLIPS_DIR, clip_name)
    snap_path = os.path.join(SNAPSHOTS_DIR, snap_name)

    if frames:
        h, w = frames[0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(clip_path, fourcc, 15, (w, h))
        for f in frames:
            out.write(f)
        out.release()
        # Snapshot = middle frame with boxes already drawn
        cv2.imwrite(snap_path, frames[len(frames) // 2])

    return clip_path, snap_path


def post_event(event_type: str, confidence: float, torso_angle: float,
               clip_path: str, snapshot_path: str, camera_id: str):
    try:
        resp = requests.post(
            f"{BACKEND_URL}/events",
            json={
                "camera_id": camera_id,
                "event_type": event_type,
                "confidence": round(confidence, 3),
                "torso_angle": torso_angle,
                "clip_path": clip_path,
                "snapshot_path": snapshot_path,
            },
            timeout=5,
        )
        if resp.ok:
            return resp.json().get("id")
    except requests.exceptions.ConnectionError:
        print("[detector] Backend not reachable — event not saved. Is the server running?")
    except Exception as e:
        print(f"[detector] Failed to post event: {e}")
    return None


def run(source, camera_id: str, show_window: bool):
    cap_source = int(source) if str(source).isdigit() else source
    cap = cv2.VideoCapture(cap_source)
    if not cap.isOpened():
        print(f"[detector] Cannot open source: {source}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 15
    buffer = RollingBuffer(fps=int(fps), seconds=10)
    detector = FallDetector()

    # We collect POST-event frames for ~5s to append to the clip
    post_frames: list = []
    post_collecting = False
    post_target = 0
    pending_event: dict = {}

    event_flash = 0  # frames to show the flash overlay

    print(f"[detector] Running. Source={source}  Camera ID={camera_id}")
    print("[detector] Press Q to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[detector] Stream ended or frame read failed.")
            break

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = detector.process(frame_rgb)

        # Draw pose skeleton
        if result["landmarks"]:
            MP_DRAWING.draw_landmarks(
                frame,
                result["landmarks"],
                MP_POSE.POSE_CONNECTIONS,
                landmark_drawing_spec=MP_DRAWING_STYLES.get_default_pose_landmarks_style(),
            )

        # Add to rolling buffer
        buffer.add(frame)

        # Collect post-event frames
        if post_collecting:
            post_frames.append(frame.copy())
            if len(post_frames) >= post_target:
                post_collecting = False
                # Now we have pre + post frames; save in background thread
                pre = buffer.frames_before(pending_event["t"], pre_seconds=3)
                all_frames = pre + post_frames

                def _save(ev, frames):
                    clip, snap = save_clip_and_snapshot(frames, ev.get("tmp_id", 0))
                    post_event(
                        event_type=ev["type"],
                        confidence=ev["confidence"],
                        torso_angle=ev["angle"],
                        clip_path=clip,
                        snapshot_path=snap,
                        camera_id=ev["camera_id"],
                    )
                    print(f"[detector] Event saved: {clip}")

                threading.Thread(target=_save, args=(pending_event, all_frames), daemon=True).start()
                post_frames = []
                pending_event = {}

        if result["event"]:
            event_flash = 45  # show flash for 45 frames
            post_collecting = True
            post_target = int(fps * 5)
            post_frames = []
            pending_event = {
                "t": time.time(),
                "type": "fall",
                "confidence": result["confidence"],
                "angle": result["torso_angle"],
                "camera_id": camera_id,
                "tmp_id": int(time.time()),
            }
            print(f"[detector] FALL EVENT FIRED — angle={result['torso_angle']} conf={result['confidence']:.2f}")

        event_flash = max(0, event_flash - 1)
        draw_overlay(frame, result["torso_angle"], result["is_fallen"], event_flash > 0)

        if show_window:
            cv2.imshow("Bika AI — Detector", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    detector.close()
    if show_window:
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Bika AI detector")
    parser.add_argument("--source", default="0", help="Camera index, video file, or RTSP URL")
    parser.add_argument("--camera-id", default="cam-01", help="Logical camera identifier")
    parser.add_argument("--no-window", action="store_true", help="Run headless (no display)")
    args = parser.parse_args()

    run(source=args.source, camera_id=args.camera_id, show_window=not args.no_window)


if __name__ == "__main__":
    main()
