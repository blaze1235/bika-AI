import math
import os
import time
import urllib.request
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import mediapipe as mp

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
    (11,12),(11,13),(13,15),(12,14),(14,16),
    (11,23),(12,24),(23,24),(23,25),(24,26),
    (25,27),(26,28),(27,29),(28,30),(29,31),(30,32),
]


def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("[fall_detector] Downloading pose model (~5MB)…")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"[fall_detector] Model saved to {MODEL_PATH}")


def _midpoint(a, b):
    return ((a.x + b.x) / 2, (a.y + b.y) / 2)


def _angle_from_vertical(top, bottom) -> float:
    """Angle in degrees of top→bottom vector from vertical. 0 = upright, 90 = flat."""
    dx = bottom[0] - top[0]
    dy = bottom[1] - top[1]
    return math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6))


@dataclass
class _FallState:
    fallen_at: Optional[float] = None
    torso_angles: deque = field(default_factory=lambda: deque(maxlen=30))


class FallDetector:
    """
    Detects falls using MediaPipe Tasks PoseLandmarker (mediapipe >= 0.10.30).
    Falls are confirmed only after the person stays horizontal for `confirmation_seconds`
    to avoid false alarms from bending/sitting.
    """

    def __init__(
        self,
        angle_threshold: float = 55.0,
        confirmation_seconds: float = 2.0,
        cooldown_seconds: float = 8.0,
    ):
        self.angle_threshold = angle_threshold
        self.confirmation_seconds = confirmation_seconds
        self.cooldown_seconds = cooldown_seconds

        self._state = _FallState()
        self._last_event_at: Optional[float] = None
        self._frame_ts_ms = 0  # monotonic ms counter for Tasks API

        _ensure_model()

        BaseOptions = mp.tasks.BaseOptions
        PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=VisionRunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)

    def process(self, frame_rgb) -> dict:
        """
        Feed one RGB frame. Returns:
          landmarks, torso_angle, is_fallen, event (True once per confirmed fall), confidence
        """
        self._frame_ts_ms += 67  # ~15 fps

        out = {
            "landmarks": None,
            "torso_angle": None,
            "is_fallen": False,
            "event": False,
            "confidence": 0.0,
        }

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        result = self._landmarker.detect_for_video(mp_image, self._frame_ts_ms)

        if not result.pose_landmarks:
            self._state.fallen_at = None
            return out

        lm = result.pose_landmarks[0]
        out["landmarks"] = lm

        shoulder_mid = _midpoint(lm[_LEFT_SHOULDER], lm[_RIGHT_SHOULDER])
        hip_mid = _midpoint(lm[_LEFT_HIP], lm[_RIGHT_HIP])
        angle = _angle_from_vertical(shoulder_mid, hip_mid)

        out["torso_angle"] = round(angle, 1)
        self._state.torso_angles.append(angle)

        in_cooldown = (
            self._last_event_at is not None
            and (time.time() - self._last_event_at) < self.cooldown_seconds
        )

        is_horizontal = angle > self.angle_threshold
        out["is_fallen"] = is_horizontal

        if is_horizontal and not in_cooldown:
            now = time.time()
            if self._state.fallen_at is None:
                self._state.fallen_at = now
            elif (now - self._state.fallen_at) >= self.confirmation_seconds:
                out["event"] = True
                out["confidence"] = min(1.0, (angle - self.angle_threshold) / 30.0)
                self._last_event_at = now
                self._state.fallen_at = None
        else:
            if not is_horizontal:
                self._state.fallen_at = None

        return out

    def close(self):
        self._landmarker.close()
