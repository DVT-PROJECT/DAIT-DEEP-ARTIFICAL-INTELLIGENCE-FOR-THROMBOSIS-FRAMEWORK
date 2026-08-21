import hashlib
import json
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from PIL import Image
import io

from .db import Base, engine, get_db
from .deps import get_current_user
from .ml import boxes_to_json, predict, train_on_feedback
from .models import Patient, PasswordReset, Role, Study, StudyImage, User
from .reporting import build_study_report_pdf
from .schemas import (
    AnalyticsOut,
    FeedbackIn,
    ForgotPasswordIn,
    ForgotPasswordOut,
    MetricsOut,
    PatientHistoryRow,
    PatientCreate,
    PatientOut,
    ResetPasswordWithPinIn,
    SignupOut,
    StudyOut,
    TimelinePoint,
    TokenOut,
    TuningRequest,
    TuningResultOut,
    UserCreate,
)
from .security import create_access_token, hash_password, verify_password
from .settings import settings
from . import idle_shutdown

Base.metadata.create_all(bind=engine)


def _ensure_schema():
    # lightweight migration for existing sqlite db
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info('study_images')")).fetchall()
        col_names = {c[1] for c in cols}  # (cid, name, type, notnull, dflt_value, pk)
        if "file_path" not in col_names:
            conn.execute(text("ALTER TABLE study_images ADD COLUMN file_path TEXT"))


_ensure_schema()


def _storage_root() -> Path:
    # resolved relative to backend/ (one level above this file's directory)
    backend_dir = Path(__file__).resolve().parents[1]
    return (backend_dir / settings.storage_dir).resolve()


def _safe_filename(name: str) -> str:
    name = (name or "image").strip().replace("\\", "_").replace("/", "_")
    return "".join(ch if ch.isalnum() or ch in ("-", "_", ".", " ") else "_" for ch in name)[:200] or "image"


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _validate_dait_email(email: str):
    if not email.endswith("@dait.com"):
        raise HTTPException(status_code=400, detail="Only @dait.com email addresses are allowed")


def _frontend_dist_dir() -> Path | None:
    backend_dir = Path(__file__).resolve().parents[1]
    candidates = [
        backend_dir / "app" / "static",          # copied build for packaging
        backend_dir.parent / "frontend" / "dist" # dev/local build output
    ]
    for path in candidates:
        if (path / "index.html").exists():
            return path
    return None

app = FastAPI(title=settings.app_name)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.on_event("startup")
def _startup_idle_monitor():
    idle_shutdown.start()


@app.get("/api/runtime")
def api_runtime():
    """LAN URL + share code + ping secret for desktop bundle (run_desktop)."""
    port = int(os.environ.get("DAIT_PORT", "8000"))
    lan = os.environ.get("DAIT_LAN_IP", "127.0.0.1")
    token = (settings.shutdown_token or "").strip()
    share = None
    if token:
        share = hashlib.sha256(f"{lan}:{port}:{token}".encode()).hexdigest()[:12]
    return {
        "port": port,
        "lan_ip": lan,
        "lan_url": f"http://{lan}:{port}",
        "loopback_url": f"http://127.0.0.1:{port}",
        "ping_token": token or None,
        "ping_interval_ms": 20_000,
        "share_code": share,
    }


@app.post("/internal/ping")
def internal_ping(x_dait_session: str | None = Header(default=None, alias="X-DAIT-Session")):
    if not settings.shutdown_token:
        raise HTTPException(status_code=404, detail="Not available")
    if not x_dait_session or x_dait_session != settings.shutdown_token:
        raise HTTPException(status_code=403, detail="Invalid session")
    idle_shutdown.mark_ping()
    return {"ok": True}


@app.post("/auth/signup", response_model=SignupOut)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    _validate_dait_email(normalized_email)
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate random 4-digit PIN
    import secrets
    pin = ''.join([str(secrets.randbelow(10)) for _ in range(4)])
    
    user = User(
        full_name=payload.full_name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        pin=pin,
        role=Role(payload.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return SignupOut(access_token=token, role=user.role.value, full_name=user.full_name, email=user.email, pin=pin)


@app.post("/auth/login", response_model=TokenOut)
def login(email: Annotated[str, Form()], password: Annotated[str, Form()], db: Session = Depends(get_db)):
    normalized_email = _normalize_email(email)
    _validate_dait_email(normalized_email)
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role.value, full_name=user.full_name, email=user.email)


@app.post("/auth/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    _validate_dait_email(normalized_email)
    
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return ForgotPasswordOut(
        message=f"Enter your 4-digit PIN from account creation to reset password.",
        reset_token=""
    )


@app.post("/auth/reset-password-with-pin", response_model=TokenOut)
def reset_password_with_pin(payload: ResetPasswordWithPinIn, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    _validate_dait_email(normalized_email)
    
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify PIN
    if user.pin != payload.pin:
        raise HTTPException(status_code=400, detail="Invalid PIN. PIN should be 4 digits from account creation.")
    
    # Update password
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate new token
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role.value, full_name=user.full_name, email=user.email)


@app.post("/patients", response_model=PatientOut)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = Patient(
        full_name=payload.full_name,
        age=payload.age,
        dvt_year=payload.dvt_year,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        visit_date=datetime.utcnow(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientOut(
        id=patient.id,
        full_name=patient.full_name,
        age=patient.age,
        dvt_year=patient.dvt_year,
        notes=patient.notes,
        visit_date=patient.visit_date,
    )
@app.post("/studies/predict", response_model=StudyOut)
async def predict_study(
    patient_id: Annotated[int, Form()],
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")

    study = Study(patient_id=patient.id)
    db.add(study)
    db.flush()

    out_images = []
    for f in files:
        b = await f.read()
        # capture original dimensions for UI/bboxes
        try:
            pil = Image.open(io.BytesIO(b))
            w, h = pil.size
        except Exception:
            w, h = None, None

        # Wrapped model prediction with full exception logging
        try:
            res = predict(b)
        except FileNotFoundError as e:
            raise HTTPException(status_code=500, detail=f"Model file not found: {e}")
        except Exception as e:
            import traceback
            traceback.print_exc()  # prints full error in backend logs
            raise HTTPException(status_code=500, detail=f"Model prediction failed: {e}")

        img = StudyImage(
            study_id=study.id,
            filename=f.filename or "image",
            content_type=f.content_type or "application/octet-stream",
            width=w,
            height=h,
            prediction_label=res.label,
            prediction_score=float(res.score),
            boxes_json=boxes_to_json(res.boxes) if res.boxes else None,
        )
        db.add(img)
        db.flush()

        # store uploaded bytes on disk
        root = _storage_root()
        study_dir = root / "studies" / str(study.id)
        study_dir.mkdir(parents=True, exist_ok=True)
        safe = _safe_filename(img.filename)
        path = study_dir / f"{img.id}_{safe}"
        path.write_bytes(b)
        img.file_path = str(path)

        out_images.append(
            {
                "image_id": img.id,
                "filename": img.filename,
                "label": img.prediction_label,
                "score": img.prediction_score,
                "width": img.width,
                "height": img.height,
                "boxes": res.boxes,
                "feedback": img.feedback,
            }
        )

    db.commit()
    db.refresh(study)
    return {"study_id": study.id, "patient_id": patient.id, "created_at": study.created_at, "images": out_images}


@app.get("/study-images/{image_id}/file")
def get_study_image_file(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    img = db.query(StudyImage).filter(StudyImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    study = db.query(Study).filter(Study.id == img.study_id).first()
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first() if study else None
    if not patient:
        raise HTTPException(status_code=404, detail="Study/patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")
    if not img.file_path or not os.path.exists(img.file_path):
        raise HTTPException(status_code=404, detail="Image file not available")
    return FileResponse(path=img.file_path, media_type=img.content_type, filename=img.filename)


@app.post("/feedback")
def set_feedback(
    payload: FeedbackIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    img = db.query(StudyImage).filter(StudyImage.id == payload.image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    study = db.query(Study).filter(Study.id == img.study_id).first()
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first() if study else None
    if not patient:
        raise HTTPException(status_code=404, detail="Study/patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")
    img.feedback = int(payload.feedback)
    img.feedback_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@app.get("/metrics", response_model=MetricsOut)
def metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(StudyImage)
    total = q.count()
    thrombus = q.filter(StudyImage.prediction_label == "thrombus").count()
    non_thrombus = q.filter(StudyImage.prediction_label == "non-thrombus").count()
    thumb_up = q.filter(StudyImage.feedback == 1).count()
    thumb_down = q.filter(StudyImage.feedback == 0).count()
    precision = None
    if (thumb_up + thumb_down) > 0:
        precision = thumb_up / float(thumb_up + thumb_down)
    return {
        "total_predictions": total,
        "thrombus": thrombus,
        "non_thrombus": non_thrombus,
        "thumb_up": thumb_up,
        "thumb_down": thumb_down,
        "precision_from_feedback": precision,
    }


@app.get("/analytics", response_model=AnalyticsOut)
def analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = metrics(db, current_user)
    rows = db.execute(
        text(
            """
            SELECT
                date(studies.created_at) AS day,
                count(study_images.id) AS total,
                sum(CASE WHEN study_images.prediction_label='thrombus' THEN 1 ELSE 0 END) AS thrombus,
                sum(CASE WHEN study_images.prediction_label='non-thrombus' THEN 1 ELSE 0 END) AS non_thrombus,
                sum(CASE WHEN study_images.feedback=1 THEN 1 ELSE 0 END) AS thumb_up,
                sum(CASE WHEN study_images.feedback=0 THEN 1 ELSE 0 END) AS thumb_down
            FROM study_images
            JOIN studies ON studies.id = study_images.study_id
            GROUP BY date(studies.created_at)
            ORDER BY date(studies.created_at)
            """
        )
    ).mappings().all()
    timeline = [
        (
            lambda tu, td: {
                "day": str(r["day"]),
                "total": int(r["total"] or 0),
                "thrombus": int(r["thrombus"] or 0),
                "non_thrombus": int(r["non_thrombus"] or 0),
                "thumb_up": tu,
                "thumb_down": td,
                "precision": (tu / float(tu + td)) if (tu + td) > 0 else None,
            }
        )(int(r["thumb_up"] or 0), int(r["thumb_down"] or 0))
        for r in rows
    ]
    return {"metrics": m, "timeline": timeline}


@app.get("/patients/history", response_model=list[PatientHistoryRow])
def patient_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patients = db.query(Patient).order_by(Patient.visit_date.desc()).all()
    out = []
    for p in patients:
        if p.created_by_user_id != current_user.id and current_user.role != Role.doctor:
            continue
        studies = db.query(Study).filter(Study.patient_id == p.id).order_by(Study.created_at.asc()).all()
        study_ids = [s.id for s in studies]
        pred_count = 0
        if study_ids:
            pred_count = db.query(StudyImage).filter(StudyImage.study_id.in_(study_ids)).count()
        last_study_at = studies[-1].created_at if studies else None
        last_study_id = studies[-1].id if studies else None
        out.append(
            {
                "patient_id": p.id,
                "full_name": p.full_name,
                "age": p.age,
                "dvt_year": p.dvt_year,
                "visit_date": p.visit_date,
                "studies": len(studies),
                "predictions": pred_count,
                "last_study_at": last_study_at,
                "last_study_id": last_study_id,
            }
        )
    return out


@app.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")

    studies = db.query(Study).filter(Study.patient_id == patient.id).all()
    # remove stored files first
    root = _storage_root()
    for s in studies:
        study_dir = root / "studies" / str(s.id)
        if study_dir.exists():
            shutil.rmtree(study_dir, ignore_errors=True)

    db.delete(patient)  # cascades delete studies/images via ORM relationship
    db.commit()
    return {"ok": True}


@app.post("/tuning/run", response_model=TuningResultOut)
def run_tuning(
    payload: TuningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (Role.radiologist, Role.doctor):
        raise HTTPException(status_code=403, detail="Only radiologist/doctor can run tuning")

    q = db.query(StudyImage).filter(StudyImage.feedback.isnot(None))
    if current_user.role != Role.doctor:
        # non-doctor can only tune using their own patient studies
        q = q.join(Study, Study.id == StudyImage.study_id).join(Patient, Patient.id == Study.patient_id).filter(
            Patient.created_by_user_id == current_user.id
        )
    rows = q.all()
    samples: list[tuple[str, int]] = []
    for r in rows:
        if not r.file_path:
            continue
        # feedback convention: 1 => thrombus, 0 => non-thrombus
        samples.append((r.file_path, int(r.feedback)))

    result = train_on_feedback(samples=samples, epochs=payload.epochs, batch_size=payload.batch_size)
    return result


@app.get("/studies/{study_id}/report.pdf")
def study_report_pdf(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")

    images = db.query(StudyImage).filter(StudyImage.study_id == study.id).all()
    patient_lines = [
        f"Name: {patient.full_name}",
        f"Age: {patient.age}",
        f"Visit date: {patient.visit_date.isoformat()}",
        f"DVT year: {patient.dvt_year or '-'}",
    ]
    result_lines = []
    for img in images:
        fb = "-" if img.feedback is None else ("thumb_up" if img.feedback == 1 else "thumb_down")
        result_lines.append(f"{img.filename} -> {img.prediction_label} ({img.prediction_score:.3f}) feedback={fb}")
    pdf_bytes = build_study_report_pdf(title="DAIT Thrombus Report", patient_lines=patient_lines, result_lines=result_lines)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"dait-study-{study.id}.pdf\""},
    )


@app.get("/studies/{study_id}", response_model=StudyOut)
def get_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.created_by_user_id != current_user.id and current_user.role != Role.doctor:
        raise HTTPException(status_code=403, detail="Not allowed")

    images = db.query(StudyImage).filter(StudyImage.study_id == study.id).all()
    out_images = []
    for img in images:
        boxes = []
        if img.boxes_json:
            try:
                boxes = json.loads(img.boxes_json)
            except Exception:
                boxes = []
        out_images.append(
            {
                "image_id": img.id,
                "filename": img.filename,
                "label": img.prediction_label,
                "score": img.prediction_score,
                "width": img.width,
                "height": img.height,
                "boxes": boxes,
                "feedback": img.feedback,
            }
        )

    return {"study_id": study.id, "patient_id": patient.id, "created_at": study.created_at, "images": out_images}


_frontend_dir = _frontend_dist_dir()
if _frontend_dir:
    assets_dir = _frontend_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    def spa_root():
        return FileResponse(str(_frontend_dir / "index.html"))

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        # Keep API/report endpoints untouched; only fallback for frontend routes.
        if full_path.startswith(
            ("auth", "patients", "studies", "study-images", "feedback", "metrics", "analytics", "tuning", "health", "api", "internal")
        ):
            raise HTTPException(status_code=404, detail="Not found")
        target = _frontend_dir / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(_frontend_dir / "index.html"))

