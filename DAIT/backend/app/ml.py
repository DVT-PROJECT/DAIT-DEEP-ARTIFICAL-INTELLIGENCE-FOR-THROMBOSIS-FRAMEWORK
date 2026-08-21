import json
import os
import io
from datetime import datetime
from dataclasses import dataclass

import numpy as np
from PIL import Image

from .settings import settings


try:
    import tensorflow as tf
except Exception:  # pragma: no cover
    tf = None


@dataclass
class PredictionResult:
    label: str
    score: float
    boxes: list[dict]


_model = None


def _resolve_model_path() -> str:
    mp = settings.model_path
    if os.path.isabs(mp):
        return os.path.normpath(mp)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(base_dir, mp))


def load_model():
    global _model
    if _model is not None:
        return _model
    if tf is None:
        raise RuntimeError("TensorFlow is not available in this environment.")
    model_path = _resolve_model_path()
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")
    _model = tf.keras.models.load_model(model_path)
    return _model


def preprocess_image(file_bytes: bytes) -> tuple[np.ndarray, tuple[int, int]]:
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    w, h = img.size
    img = img.resize((settings.image_size, settings.image_size))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr, (w, h)


def preprocess_image_from_path(path: str) -> np.ndarray:
    with open(path, "rb") as f:
        b = f.read()
    arr, _ = preprocess_image(b)
    return arr[0]


def predict(file_bytes: bytes) -> PredictionResult:
    model = load_model()
    arr, _ = preprocess_image(file_bytes)
    pred = model.predict(arr, verbose=0)

    # Flexible handling:
    # - binary sigmoid output shape (1,1) or (1,)
    # - softmax output shape (1,2)
    score_thrombus = None
    pred = np.asarray(pred)
    if pred.ndim == 2 and pred.shape[1] == 2:
        score_thrombus = float(pred[0, 1])
    else:
        score_thrombus = float(np.squeeze(pred))

    label = "thrombus" if score_thrombus >= 0.5 else "non-thrombus"

    # Bounding boxes are model-dependent; if not available, return empty.
    boxes: list[dict] = []
    return PredictionResult(label=label, score=score_thrombus, boxes=boxes)


def boxes_to_json(boxes: list[dict]) -> str:
    return json.dumps(boxes, separators=(",", ":"))


def train_on_feedback(
    *,
    samples: list[tuple[str, int]],
    epochs: int = 2,
    batch_size: int = 8,
) -> dict:
    """
    samples: list[(image_path, label)] where label: 1=thrombus, 0=non-thrombus
    """
    if not samples:
        return {
            "used_samples": 0,
            "epochs": epochs,
            "batch_size": batch_size,
            "final_loss": None,
            "final_accuracy": None,
            "saved_model_path": None,
        }

    model = load_model()
    xs: list[np.ndarray] = []
    ys: list[int] = []
    for p, y in samples:
        if not os.path.exists(p):
            continue
        try:
            xs.append(preprocess_image_from_path(p))
            ys.append(int(y))
        except Exception:
            continue
    if not xs:
        return {
            "used_samples": 0,
            "epochs": epochs,
            "batch_size": batch_size,
            "final_loss": None,
            "final_accuracy": None,
            "saved_model_path": None,
        }

    x = np.asarray(xs, dtype=np.float32)
    y = np.asarray(ys, dtype=np.float32)

    output_shape = model.output_shape
    if isinstance(output_shape, list):
        output_shape = output_shape[0]
    out_dim = output_shape[-1] if isinstance(output_shape, tuple) else 1

    if out_dim == 2:
        model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-4),
            loss=tf.keras.losses.SparseCategoricalCrossentropy(),
            metrics=["accuracy"],
        )
        y_train = y.astype(np.int32)
    else:
        model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-4),
            loss=tf.keras.losses.BinaryCrossentropy(),
            metrics=["accuracy"],
        )
        y_train = y.astype(np.float32)

    history = model.fit(
        x,
        y_train,
        epochs=epochs,
        batch_size=min(batch_size, len(x)),
        verbose=0,
    )

    final_loss = float(history.history.get("loss", [None])[-1]) if history.history.get("loss") else None
    final_acc = float(history.history.get("accuracy", [None])[-1]) if history.history.get("accuracy") else None

    original = _resolve_model_path()
    root, ext = os.path.splitext(original)
    suffix = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    tuned_path = f"{root}_tuned_{suffix}{ext or '.keras'}"
    model.save(tuned_path)

    global _model
    _model = model

    return {
        "used_samples": int(len(x)),
        "epochs": int(epochs),
        "batch_size": int(min(batch_size, len(x))),
        "final_loss": final_loss,
        "final_accuracy": final_acc,
        "saved_model_path": tuned_path,
    }

