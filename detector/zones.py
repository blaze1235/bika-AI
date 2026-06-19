"""Zone management — fetch drawn zones from backend and test which zone a point is in."""

import requests


class ZoneManager:
    def __init__(self, backend_url: str, camera_id: str):
        self.backend_url = backend_url
        self.camera_id = camera_id
        self.zones = []  # list of {name, x1, y1, x2, y2} in normalized 0-1 coords

    def refresh(self):
        try:
            r = requests.get(
                f"{self.backend_url}/cameras/{self.camera_id}/zones", timeout=3
            )
            if r.ok:
                self.zones = r.json().get("zones", [])
        except requests.exceptions.RequestException:
            pass  # keep last known zones if backend is briefly down

    def zone_for_point(self, x: float, y: float):
        """Return the name of the first zone containing (x, y), or None."""
        for z in self.zones:
            if z["x1"] <= x <= z["x2"] and z["y1"] <= y <= z["y2"]:
                return z["name"]
        return None
