import math
import os
import time
import urllib.request
from typing import Optional

import mediapipe as mp

from detector.tracker import CentroidTracker

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_lite.task")

# Landmark indices
_LEFT_SHOULDER  = 11
_RIGHT_SHOULDER = 12
_LEFT_HIP       = 23
_RIGHT_HIP      = 24

# Skeleton connections for manual drawing
POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24), (23, 25), (24, 26),
    (25, 27), (26, 28), (27, 29), (28, 30), (29, 31), (30, 32),
]


def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("[fall_detector] Downloading pose model (~5MB)…")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"[fall_detector] Model saved to {MODEL_PATH}")


def _midpoint(a, b):
    return ((a.x + b.x) / 2, (a.y + b.y) / 2)


def _angle_from_vertical(top, bottom) -> float:
    """Angle (deg) of top→bottom vector from vertical. 0 = upright, 90 = flat."""
    dx = bottom[0] - top[0]
    dy = bottom[1] - top[1]
    return math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6))


class FallDetector:
    """
    Multi-person fall detection using MediaPipe Tasks PoseLandmarker.

    Each detected person gets a stable track ID. A fall fires for a person only
    after they stay horizontal for `confirmation_seconds`, with a per-person
    cooldown to avoid duplicate events for the same fall.
    """

    def __init__(
        self,
        angle_threshold: float = 55.0,
        confirmation_seconds: float = 2.0,
        cooldown_seconds: float = 8.0,
        max_people: int = 4,
    ):
        self.angle_threshold = angle_threshold
        self.confirmation_seconds = confirmation_seconds
        self.cooldown_seconds = cooldown_seconds

        self._tracker = CentroidTracker()
        self._track_states: dict = {}  # track_id -> {fallen_at, last_event_at}
        self._frame_ts_ms = 0

        _ensure_model()

        BaseOptions = mp.tasks.BaseOptions
        PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=VisionRunningMode.VIDEO,
            num_poses=max_people,
            min_pose_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)

    def _state(self, tid: int) -> dict:
        if tid not in self._track_states:
            self._track_states[tid] = {"fallen_at": None, "last_event_at": None}
        return self._track_states[tid]

    def process(self, frame_rgb) -> list:
        """
        Feed one RGB frame. Returns a list (one dict per person):
          { track_id, landmarks, centroid, torso_angle, is_fallen, event, confidence }
        """
        self._frame_ts_ms += 67  # ~15 fps

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        result = self._landmarker.detect_for_video(mp_image, self._frame_ts_ms)

        people = []
        if not result.pose_landmarks:
            # prune stale states
            self._tracker.update([])
            self._track_states = {
                k: v for k, v in self._track_states.items() if k in self._tracker.active_ids()
            }
            return people

        # Compute centroid + angle for each detected pose
        raw = []
        for lm in result.pose_landmarks:
            hip_mid = _midpoint(lm[_LEFT_HIP], lm[_RIGHT_HIP])
            shoulder_mid = _midpoint(lm[_LEFT_SHOULDER], lm[_RIGHT_SHOULDER])
            angle = _angle_from_vertical(shoulder_mid, hip_mid)
            raw.append({"lm": lm, "centroid": hip_mid, "angle": angle})

        ids = self._tracker.update([r["centroid"] for r in raw])

        now = time.time()
        for r, tid in zip(raw, ids):
            st = self._state(tid)
            angle = r["angle"]
            is_horizontal = angle > self.angle_threshold

            in_cooldown = (
                st["last_event_at"] is not None
                and (now - st["last_event_at"]) < self.cooldown_seconds
            )

            event = False
            confidence = 0.0
            if is_horizontal and not in_cooldown:
                if st["fallen_at"] is None:
                    st["fallen_at"] = now
                elif (now - st["fallen_at"]) >= self.confirmation_seconds:
                    event = True
                    confidence = min(1.0, (angle - self.angle_threshold) / 30.0)
                    st["last_event_at"] = now
                    st["fallen_at"] = None
            elif not is_horizontal:
                st["fallen_at"] = None

            people.append({
                "track_id": tid,
                "landmarks": r["lm"],
                "centroid": r["centroid"],
                "torso_angle": round(angle, 1),
                "is_fallen": is_horizontal,
                "event": event,
                "confidence": round(confidence, 3),
            })

        # prune states for dropped tracks
        self._track_states = {
            k: v for k, v in self._track_states.items() if k in self._tracker.active_ids()
        }
        return people

    def set_threshold(self, angle_threshold: float):
        self.angle_threshold = angle_threshold

    def close(self):
        self._landmarker.close()
