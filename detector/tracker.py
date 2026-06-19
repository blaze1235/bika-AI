"""
Lightweight centroid tracker — assigns stable IDs to people across frames.

MediaPipe gives us N poses per frame but no identity. We match each pose to the
nearest one from the previous frame by hip-centroid distance. Good enough for
indoor scenes where people don't teleport.
"""

import math
from typing import Dict, List, Tuple


class CentroidTracker:
    def __init__(self, max_distance: float = 0.18, max_missed: int = 20):
        # max_distance: normalized (0-1) image distance to consider "same person"
        # max_missed: frames a track survives without a match before being dropped
        self.max_distance = max_distance
        self.max_missed = max_missed
        self._next_id = 1
        self._tracks: Dict[int, dict] = {}  # id -> {centroid, missed}

    def update(self, centroids: List[Tuple[float, float]]) -> List[int]:
        """Given this frame's centroids, return a track ID per centroid (same order)."""
        assigned = [None] * len(centroids)

        # Mark all existing tracks as unmatched this frame
        for t in self._tracks.values():
            t["matched"] = False

        # Greedy nearest matching: for each detection, find closest free track
        used_ids = set()
        for i, c in enumerate(centroids):
            best_id, best_dist = None, self.max_distance
            for tid, t in self._tracks.items():
                if tid in used_ids:
                    continue
                d = math.dist(c, t["centroid"])
                if d < best_dist:
                    best_id, best_dist = tid, d
            if best_id is not None:
                self._tracks[best_id]["centroid"] = c
                self._tracks[best_id]["matched"] = True
                self._tracks[best_id]["missed"] = 0
                used_ids.add(best_id)
                assigned[i] = best_id
            else:
                # New person
                tid = self._next_id
                self._next_id += 1
                self._tracks[tid] = {"centroid": c, "matched": True, "missed": 0}
                used_ids.add(tid)
                assigned[i] = tid

        # Age out unmatched tracks
        dead = []
        for tid, t in self._tracks.items():
            if not t["matched"]:
                t["missed"] += 1
                if t["missed"] > self.max_missed:
                    dead.append(tid)
        for tid in dead:
            del self._tracks[tid]

        return assigned

    def active_ids(self) -> set:
        return set(self._tracks.keys())
