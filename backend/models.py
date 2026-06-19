from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    camera_id: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(64))   # "fall", "crowd", etc.
    confidence: Mapped[float] = mapped_column(Float)
    torso_angle: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    clip_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    snapshot_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    review: Mapped[Optional["EventReview"]] = relationship("EventReview", back_populates="event", uselist=False)


class EventReview(Base):
    __tablename__ = "event_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), unique=True)
    verdict: Mapped[str] = mapped_column(String(32))          # "correct" | "false_alarm" | "unsure"
    actual_label: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    event: Mapped["Event"] = relationship("Event", back_populates="review")
