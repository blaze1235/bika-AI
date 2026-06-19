import collections
import time


class RollingBuffer:
    """Keeps the last `seconds` worth of (timestamp, frame) tuples in memory."""

    def __init__(self, fps: int = 15, seconds: int = 10):
        self.fps = fps
        self.seconds = seconds
        maxlen = fps * seconds
        self._frames: collections.deque = collections.deque(maxlen=maxlen)

    def add(self, frame):
        self._frames.append((time.time(), frame.copy()))

    def get_frames(self) -> list:
        return list(self._frames)

    def frames_before(self, t: float, pre_seconds: int = 3) -> list:
        cutoff = t - pre_seconds
        return [f for ts, f in self._frames if ts >= cutoff]
