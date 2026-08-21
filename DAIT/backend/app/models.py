import enum
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Role(str, enum.Enum):
    radiologist = "radiologist"
    doctor = "doctor"
    sonographer = "sonographer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    pin: Mapped[str] = mapped_column(String(10))  # 4-digit PIN for password recovery
    role: Mapped[Role] = mapped_column(Enum(Role), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patients: Mapped[list["Patient"]] = relationship(back_populates="created_by")
    password_resets: Mapped[list["PasswordReset"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    age: Mapped[int] = mapped_column(Integer)
    visit_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    dvt_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped["User"] = relationship(back_populates="patients")

    studies: Mapped[list["Study"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class Study(Base):
    __tablename__ = "studies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="studies")
    images: Mapped[list["StudyImage"]] = relationship(back_populates="study", cascade="all, delete-orphan")


class StudyImage(Base):
    __tablename__ = "study_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"), index=True)

    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(80))
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    prediction_label: Mapped[str] = mapped_column(String(40))
    prediction_score: Mapped[float] = mapped_column(Float)
    boxes_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    feedback: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1=thumb_up, 0=thumb_down
    feedback_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    study: Mapped["Study"] = relationship(back_populates="images")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reset_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    verification_code: Mapped[str] = mapped_column(String(10))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="password_resets")

