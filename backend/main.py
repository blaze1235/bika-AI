"""
Bika AI — FastAPI Backend

Events:
  POST /events                       — detector posts a new event (broadcasts via WS)
  GET  /events                       — list events (?status=pending)
  GET  /events/{id}                  — single event
  POST /events/{id}/review           — staff submits a review
  GET  /stats                        — accuracy stats
  GET  /calibration                  — fall threshold learned from reviews
  GET  /export?format=json|csv       — labeled training data

Cameras & zones:
  GET  /cameras                      — list known cameras
  POST /cameras/{id}/snapshot        — detector pushes a live frame (raw jpg body)
  GET  /cameras/{id}/snapshot        — latest snapshot image
  GET  /cameras/{id}/zones           — zones for a camera
  POST /cameras/{id}/zones           — create a zone
  DELETE /zones/{zone_id}            — delete a zone

Realtime:
  WS   /ws                           — pushes new events live

UI:
  GET  /                             — review dashboard
  GET  /zones                        — zone editor
"""

import csv
import io
import os
import json
import asyncio
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import Base, engine, get_db, SessionLocal
from backend.models import Event, EventReview, Zone

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

Base.metadata.create_all(bind=engine)


def _migrate():
    """Add columns introduced after the first MVP without wiping existing data."""
    from sqlalchemy import text
    new_cols = {
        "person_track_id": "INTEGER",
        "zone_name": "VARCHAR(128)",
    }
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(events)"))}
        for col, coltype in new_cols.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE events ADD COLUMN {col} {coltype}"))
        conn.commit()


_migrate()

app = FastAPI(title="Bika AI", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/clips", StaticFiles(directory=CLIPS_DIR), name="clips")
app.mount("/snapshots", StaticFiles(directory=SNAPSHOTS_DIR), name="snapshots")


# ── WebSocket connection manager ────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


@app.on_event("startup")
async def _capture_loop():
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive; we don't expect client messages
    except WebSocketDisconnect:
        manager.disconnect(ws)


def _broadcast_sync(message: dict):
    """Schedule a broadcast from sync request handlers (runs in a threadpool)."""
    if MAIN_LOOP is None:
        return
    try:
        asyncio.run_coroutine_threadsafe(manager.broadcast(message), MAIN_LOOP)
    except Exception:
        pass


# ── Schemas ──────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    camera_id: str
    event_type: str
    confidence: float
    torso_angle: Optional[float] = None
    person_track_id: Optional[int] = None
    zone_name: Optional[str] = None
    clip_path: Optional[str] = None
    snapshot_path: Optional[str] = None


class ReviewCreate(BaseModel):
    verdict: str
    actual_label: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None


class ZoneCreate(BaseModel):
    name: str
    x1: float
    y1: float
    x2: float
    y2: float


def _event_to_dict(ev: Event) -> dict:
    snap_file = os.path.basename(ev.snapshot_path) if ev.snapshot_path else None
    clip_file = os.path.basename(ev.clip_path) if ev.clip_path else None
    return {
        "id": ev.id,
        "camera_id": ev.camera_id,
        "event_type": ev.event_type,
        "confidence": ev.confidence,
        "torso_angle": ev.torso_angle,
        "person_track_id": ev.person_track_id,
        "zone_name": ev.zone_name,
        "clip_url": f"/clips/{clip_file}" if clip_file else None,
        "snapshot_url": f"/snapshots/{snap_file}" if snap_file else None,
        "status": ev.status,
        "created_at": ev.created_at.isoformat(),
        "review": {
            "verdict": ev.review.verdict,
            "actual_label": ev.review.actual_label,
            "severity": ev.review.severity,
            "notes": ev.review.notes,
            "reviewed_at": ev.review.reviewed_at.isoformat(),
        } if ev.review else None,
    }


# ── Events ───────────────────────────────────────────────────────────────────

@app.post("/events", status_code=201)
def create_event(body: EventCreate, db: Session = Depends(get_db)):
    ev = Event(**body.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    _broadcast_sync({"type": "new_event", "event": _event_to_dict(ev)})
    return {"id": ev.id, "status": "created"}


@app.get("/events")
def list_events(status: Optional[str] = None, limit: int = 100, offset: int = 0,
                db: Session = Depends(get_db)):
    q = db.query(Event)
    if status:
        q = q.filter(Event.status == status)
    total = q.count()
    rows = q.order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "events": [_event_to_dict(e) for e in rows]}


@app.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Event not found")
    return _event_to_dict(ev)


@app.post("/events/{event_id}/review")
def review_event(event_id: int, body: ReviewCreate, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Event not found")
    if ev.review:
        for k, v in body.model_dump().items():
            setattr(ev.review, k, v)
        ev.review.reviewed_at = datetime.utcnow()
    else:
        db.add(EventReview(event_id=event_id, **body.model_dump()))
    ev.status = "reviewed"
    db.commit()
    return {"status": "ok"}


# ── Stats & self-calibration ─────────────────────────────────────────────────

@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.query(Event).count()
    reviewed = db.query(Event).filter(Event.status == "reviewed").count()
    pending = db.query(Event).filter(Event.status == "pending").count()

    verdict_rows = (
        db.query(EventReview.verdict, func.count(EventReview.id))
        .group_by(EventReview.verdict).all()
    )
    verdicts = {v: c for v, c in verdict_rows}
    correct = verdicts.get("correct", 0)
    false_alarms = verdicts.get("false_alarm", 0)
    precision = round(correct / (correct + false_alarms) * 100, 1) if (correct + false_alarms) else None

    label_rows = (
        db.query(EventReview.actual_label, func.count(EventReview.id))
        .filter(EventReview.actual_label.isnot(None))
        .group_by(EventReview.actual_label).all()
    )
    return {
        "total_events": total,
        "reviewed": reviewed,
        "pending": pending,
        "verdicts": verdicts,
        "precision_pct": precision,
        "actual_labels": {l: c for l, c in label_rows},
    }


@app.get("/calibration")
def calibration(db: Session = Depends(get_db)):
    """
    Learn the best fall-angle threshold from staff reviews.

    We take every reviewed fall event with a recorded torso angle, then scan
    candidate thresholds to find the one that best separates confirmed real
    falls (should be ABOVE threshold) from false alarms (should be BELOW).
    """
    rows = (
        db.query(Event.torso_angle, EventReview.verdict)
        .join(EventReview, EventReview.event_id == Event.id)
        .filter(Event.event_type == "fall", Event.torso_angle.isnot(None))
        .all()
    )
    correct_angles = [a for a, v in rows if v == "correct"]
    false_angles = [a for a, v in rows if v == "false_alarm"]
    reviewed_count = len(correct_angles) + len(false_angles)

    default_threshold = 55.0
    if reviewed_count < 10 or not correct_angles or not false_angles:
        return {
            "reviewed_count": reviewed_count,
            "current_default": default_threshold,
            "suggested_threshold": None,
            "accuracy_at_suggested": None,
            "message": "Need at least 10 reviewed falls (with both correct and false-alarm examples) to calibrate.",
        }

    best_t, best_acc = default_threshold, 0.0
    for t10 in range(300, 901):  # 30.0 .. 90.0 in 0.1 steps
        t = t10 / 10.0
        tp = sum(1 for a in correct_angles if a >= t)   # real falls correctly above
        tn = sum(1 for a in false_angles if a < t)      # false alarms correctly below
        acc = (tp + tn) / reviewed_count
        if acc > best_acc:
            best_acc, best_t = acc, t

    return {
        "reviewed_count": reviewed_count,
        "current_default": default_threshold,
        "suggested_threshold": round(best_t, 1),
        "accuracy_at_suggested": round(best_acc * 100, 1),
        "avg_real_fall_angle": round(sum(correct_angles) / len(correct_angles), 1),
        "avg_false_alarm_angle": round(sum(false_angles) / len(false_angles), 1),
        "message": f"Calibrated from {reviewed_count} reviewed falls.",
    }


@app.get("/export")
def export(format: str = "json", db: Session = Depends(get_db)):
    """Export reviewed events as labeled training data."""
    rows = (
        db.query(Event, EventReview)
        .join(EventReview, EventReview.event_id == Event.id)
        .order_by(Event.created_at).all()
    )
    records = [{
        "event_id": ev.id,
        "camera_id": ev.camera_id,
        "event_type": ev.event_type,
        "torso_angle": ev.torso_angle,
        "confidence": ev.confidence,
        "zone_name": ev.zone_name,
        "verdict": rv.verdict,
        "actual_label": rv.actual_label,
        "severity": rv.severity,
        "clip": os.path.basename(ev.clip_path) if ev.clip_path else None,
        "created_at": ev.created_at.isoformat(),
    } for ev, rv in rows]

    if format == "csv":
        buf = io.StringIO()
        if records:
            w = csv.DictWriter(buf, fieldnames=list(records[0].keys()))
            w.writeheader()
            w.writerows(records)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=bika_training_data.csv"},
        )
    return {"count": len(records), "records": records}


# ── Cameras & zones ──────────────────────────────────────────────────────────

@app.get("/cameras")
def list_cameras(db: Session = Depends(get_db)):
    ids = set()
    for (cid,) in db.query(Event.camera_id).distinct().all():
        ids.add(cid)
    for (cid,) in db.query(Zone.camera_id).distinct().all():
        ids.add(cid)
    for fn in os.listdir(SNAPSHOTS_DIR):
        if fn.startswith("cam_") and fn.endswith("_latest.jpg"):
            ids.add(fn[len("cam_"):-len("_latest.jpg")])
    cameras = []
    for cid in sorted(ids):
        snap = os.path.join(SNAPSHOTS_DIR, f"cam_{cid}_latest.jpg")
        cameras.append({
            "camera_id": cid,
            "has_snapshot": os.path.exists(snap),
            "snapshot_url": f"/cameras/{cid}/snapshot" if os.path.exists(snap) else None,
        })
    return {"cameras": cameras}


@app.post("/cameras/{camera_id}/snapshot")
async def upload_snapshot(camera_id: str, request: Request):
    data = await request.body()
    if not data:
        raise HTTPException(400, "Empty body")
    path = os.path.join(SNAPSHOTS_DIR, f"cam_{camera_id}_latest.jpg")
    with open(path, "wb") as f:
        f.write(data)
    return {"status": "ok"}


@app.get("/cameras/{camera_id}/snapshot")
def get_snapshot(camera_id: str):
    path = os.path.join(SNAPSHOTS_DIR, f"cam_{camera_id}_latest.jpg")
    if not os.path.exists(path):
        raise HTTPException(404, "No snapshot yet")
    return FileResponse(path, media_type="image/jpeg",
                        headers={"Cache-Control": "no-store"})


@app.get("/cameras/{camera_id}/zones")
def get_zones(camera_id: str, db: Session = Depends(get_db)):
    rows = db.query(Zone).filter(Zone.camera_id == camera_id).all()
    return {"zones": [
        {"id": z.id, "name": z.name, "x1": z.x1, "y1": z.y1, "x2": z.x2, "y2": z.y2}
        for z in rows
    ]}


@app.post("/cameras/{camera_id}/zones", status_code=201)
def create_zone(camera_id: str, body: ZoneCreate, db: Session = Depends(get_db)):
    # normalize so x1<x2, y1<y2
    x1, x2 = sorted((body.x1, body.x2))
    y1, y2 = sorted((body.y1, body.y2))
    z = Zone(camera_id=camera_id, name=body.name, x1=x1, y1=y1, x2=x2, y2=y2)
    db.add(z)
    db.commit()
    db.refresh(z)
    return {"id": z.id, "status": "created"}


@app.delete("/zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(404, "Zone not found")
    db.delete(z)
    db.commit()
    return {"status": "deleted"}


# ── UI ───────────────────────────────────────────────────────────────────────

def _serve(name: str):
    with open(os.path.join(FRONTEND_DIR, name)) as f:
        return f.read()


@app.get("/", response_class=HTMLResponse)
def serve_ui():
    return _serve("index.html")


@app.get("/zones", response_class=HTMLResponse)
def serve_zones():
    return _serve("zones.html")
