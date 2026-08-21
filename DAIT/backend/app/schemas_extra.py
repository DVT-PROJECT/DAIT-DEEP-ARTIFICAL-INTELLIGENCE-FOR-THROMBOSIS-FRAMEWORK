from datetime import datetime

from pydantic import BaseModel

from .schemas import ImagePredictionOut


class StudyWithPatientOut(BaseModel):
    study_id: int
    patient_id: int
    created_at: datetime
    images: list[ImagePredictionOut]

