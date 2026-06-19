"""
Bika AI — FastAPI Backend

Endpoints:
  POST /events               — detector posts a new event
  GET  /events               — list events (with optional ?status=pending)
  GET  /events/{id}          — single event detail
  POST /events/{id}/review   — staff submits a review
  GET  /clips/{filename}     — serve video clips
  GET  /snapshots/{filename} — serve snapshot images
  GET  /                     — serve the review UI
  GET  /stats                — accuracy stats for the testing dashboard
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import Base, engine, get_db
from backend.models import Event, EventReview

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bika AI", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.mount("/clips", StaticFiles(directory=CLIPS_DIR), name="clips")
app.mount("/snapshots", StaticFiles(directory=SNAPSHOTS_DIR), name="snapshots")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    camera_id: str
    event_type: str
    confidence: float
    torso_angle: Optional[float] = None
    clip_path: Optional[str] = None
    snapshot_path: Optional[str] = None


class ReviewCreate(BaseModel):
    verdict: str                         # "correct" | "false_alarm" | "unsure"
    actual_label: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None


# ── Helper ────────────────────────────────────────────────────────────────────

def _event_to_dict(ev: Event) -> dict:
    snap_file = os.path.basename(ev.snapshot_path) if ev.snapshot_path else None
    clip_file = os.path.basename(ev.clip_path) if ev.clip_path else None
    return {
        "id": ev.id,
        "camera_id": ev.camera_id,
        "event_type": ev.event_type,
        "confidence": ev.confidence,
        "torso_angle": ev.torso_angle,
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


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/events", status_code=201)
def create_event(body: EventCreate, db: Session = Depends(get_db)):
    ev = Event(**body.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return {"id": ev.id, "status": "created"}


@app.get("/events")
def list_events(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Event)
    if status:
        q = q.filter(Event.status == status)
    total = q.count()
    events = q.order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "events": [_event_to_dict(e) for e in events]}


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
        # Update existing review
        for k, v in body.model_dump().items():
            setattr(ev.review, k, v)
        ev.review.reviewed_at = datetime.utcnow()
    else:
        rev = EventReview(event_id=event_id, **body.model_dump())
        db.add(rev)
    ev.status = "reviewed"
    db.commit()
    return {"status": "ok"}


@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.query(Event).count()
    reviewed = db.query(Event).filter(Event.status == "reviewed").count()
    pending = db.query(Event).filter(Event.status == "pending").count()

    from sqlalchemy import func
    verdict_rows = (
        db.query(EventReview.verdict, func.count(EventReview.id))
        .group_by(EventReview.verdict)
        .all()
    )
    verdicts = {v: c for v, c in verdict_rows}
    correct = verdicts.get("correct", 0)
    false_alarms = verdicts.get("false_alarm", 0)
    precision = round(correct / (correct + false_alarms) * 100, 1) if (correct + false_alarms) > 0 else None

    label_rows = (
        db.query(EventReview.actual_label, func.count(EventReview.id))
        .filter(EventReview.actual_label.isnot(None))
        .group_by(EventReview.actual_label)
        .all()
    )

    return {
        "total_events": total,
        "reviewed": reviewed,
        "pending": pending,
        "verdicts": verdicts,
        "precision_pct": precision,
        "actual_labels": {label: count for label, count in label_rows},
    }


@app.get("/", response_class=HTMLResponse)
def serve_ui():
    html_path = os.path.join(FRONTEND_DIR, "index.html")
    with open(html_path) as f:
        return f.read()
