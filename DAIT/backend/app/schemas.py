from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: EmailStr


class SignupOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: EmailStr
    pin: str  # Display PIN on signup


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(pattern="^(radiologist|doctor|sonographer)$")


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    age: int = Field(ge=0, le=130)
    dvt_year: int | None = Field(default=None, ge=1900, le=2100)
    notes: str | None = Field(default=None, max_length=5000)


class PatientOut(BaseModel):
    id: int
    full_name: str
    age: int
    dvt_year: int | None
    notes: str | None
    visit_date: datetime


class Box(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    score: float


class ImagePredictionOut(BaseModel):
    image_id: int
    filename: str
    label: str
    score: float
    width: int | None = None
    height: int | None = None
    boxes: list[Box] = []
    feedback: int | None = None


class StudyOut(BaseModel):
    study_id: int
    patient_id: int
    created_at: datetime
    images: list[ImagePredictionOut]


class FeedbackIn(BaseModel):
    image_id: int
    feedback: int = Field(ge=0, le=1)


class MetricsOut(BaseModel):
    total_predictions: int
    thrombus: int
    non_thrombus: int
    thumb_up: int
    thumb_down: int
    precision_from_feedback: float | None


class TimelinePoint(BaseModel):
    day: str
    total: int
    thrombus: int
    non_thrombus: int
    thumb_up: int = 0
    thumb_down: int = 0
    precision: float | None = None


class AnalyticsOut(BaseModel):
    metrics: MetricsOut
    timeline: list[TimelinePoint]


class PatientHistoryRow(BaseModel):
    patient_id: int
    full_name: str
    age: int
    dvt_year: int | None
    visit_date: datetime
    studies: int
    predictions: int
    last_study_at: datetime | None
    last_study_id: int | None = None


class TuningRequest(BaseModel):
    epochs: int = Field(default=2, ge=1, le=20)
    batch_size: int = Field(default=8, ge=1, le=64)


class TuningResultOut(BaseModel):
    used_samples: int
    epochs: int
    batch_size: int
    final_loss: float | None
    final_accuracy: float | None
    saved_model_path: str | None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordWithPinIn(BaseModel):
    email: EmailStr
    pin: str = Field(min_length=4, max_length=4)  # 4-digit PIN
    new_password: str = Field(min_length=6, max_length=128)


class ForgotPasswordOut(BaseModel):
    message: str
    reset_token: str

