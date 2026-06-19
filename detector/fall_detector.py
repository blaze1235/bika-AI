import math
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import mediapipe as mp


# MediaPipe landmark indices
_LEFT_SHOULDER = 11
_RIGHT_SHOULDER = 12
_LEFT_HIP = 23
_RIGHT_HIP = 24
_LEFT_ANKLE = 27
_RIGHT_ANKLE = 28
_NOSE = 0


@dataclass
class FallState:
    fallen_at: Optional[float] = None          # timestamp when fall posture first detected
    confirmed_at: Optional[float] = None        # timestamp when event was fired
    torso_angles: deque = field(default_factory=lambda: deque(maxlen=30))
    hip_heights: deque = field(default_factory=lambda: deque(maxlen=30))


def _midpoint(a, b):
    return ((a.x + b.x) / 2, (a.y + b.y) / 2)


def _angle_from_vertical(top, bottom) -> float:
    """Returns angle in degrees of the top→bottom vector from vertical (0 = upright)."""
    dx = bottom[0] - top[0]
    dy = bottom[1] - top[1]
    angle = math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6))
    return angle


class FallDetector:
    """
    Detects falls using MediaPipe Pose keypoints.

    Fall = torso becomes nearly horizontal (angle > threshold)
          AND stays that way for at least `confirmation_seconds`.
    After firing, the detector cools down for `cooldown_seconds` to avoid
    sending duplicate events for the same fall.
    """

    def __init__(
        self,
        angle_threshold: float = 55.0,       # degrees from vertical — above this = "horizontal"
        confirmation_seconds: float = 2.0,    # must stay fallen this long before event fires
        cooldown_seconds: float = 8.0,        # won't fire again until person stands back up (or cooldown)
    ):
        self.angle_threshold = angle_threshold
        self.confirmation_seconds = confirmation_seconds
        self.cooldown_seconds = cooldown_seconds

        self._state = FallState()
        self._last_event_at: Optional[float] = None

        self.pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process(self, frame_rgb) -> dict:
        """
        Feed one BGR→RGB frame. Returns a dict:
          { "landmarks": ..., "torso_angle": float, "is_fallen": bool, "event": bool }
        "event" is True exactly once per fall (when confirmation period elapses).
        """
        result = self.pose.process(frame_rgb)

        out = {
            "landmarks": None,
            "torso_angle": None,
            "is_fallen": False,
            "event": False,
            "confidence": 0.0,
        }

        if not result.pose_landmarks:
            self._state.fallen_at = None
            return out

        lm = result.pose_landmarks.landmark
        out["landmarks"] = result.pose_landmarks

        # Torso vector: mid-shoulders → mid-hips
        shoulder_mid = _midpoint(lm[_LEFT_SHOULDER], lm[_RIGHT_SHOULDER])
        hip_mid = _midpoint(lm[_LEFT_HIP], lm[_RIGHT_HIP])
        angle = _angle_from_vertical(shoulder_mid, hip_mid)

        out["torso_angle"] = round(angle, 1)
        self._state.torso_angles.append(angle)

        # Track hip height (normalized 0–1, higher y = lower in image)
        hip_y = hip_mid[1]
        self._state.hip_heights.append(hip_y)

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
                # Fire event
                out["event"] = True
                out["confidence"] = min(1.0, (angle - self.angle_threshold) / 30.0)
                self._last_event_at = now
                self._state.fallen_at = None   # reset so we don't fire again immediately
        else:
            if not is_horizontal:
                self._state.fallen_at = None

        return out

    def close(self):
        self.pose.close()
