from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    import sklearn.compose._column_transformer as column_transformer_module
except Exception:  # pragma: no cover
    column_transformer_module = None

ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT_DIR / "model_api"
DEFAULT_MODEL_PATH = MODEL_DIR / "branch_1_best_model.joblib"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))

MODEL_PATHS = {
    "branch_1": Path(os.getenv("MODEL_BRANCH_1_PATH", str(MODEL_DIR / "branch_1_best_model.joblib"))),
    "branch_2": Path(os.getenv("MODEL_BRANCH_2_PATH", str(MODEL_DIR / "branch_2_model.joblib"))),
    "branch_3": Path(os.getenv("MODEL_BRANCH_3_PATH", str(MODEL_DIR / "branch_3_model.joblib"))),
    "branch_1_printer": Path(os.getenv("MODEL_BRANCH_1_PRINTER_PATH", str(MODEL_DIR / "branch_1_printer_model.joblib"))),
    "branch_2_printer": Path(os.getenv("MODEL_BRANCH_2_PRINTER_PATH", str(MODEL_DIR / "branch_2_printer_model.joblib"))),
    "branch_3_printer": Path(os.getenv("MODEL_BRANCH_3_PRINTER_PATH", str(MODEL_DIR / "branch_3_printer_model.joblib"))),
}

DEVICE_TYPE_MODEL_KEY_MAP = {
    "branch_1": "branch_1",
    "branch1": "branch_1",
    "1": "branch_1",
    "branch_2": "branch_2",
    "branch2": "branch_2",
    "2": "branch_2",
    "branch_3": "branch_3",
    "branch3": "branch_3",
    "3": "branch_3",
    "branch_1_printer": "branch_1_printer",
    "branch1_printer": "branch_1_printer",
    "1_printer": "branch_1_printer",
    "branch_2_printer": "branch_2_printer",
    "branch2_printer": "branch_2_printer",
    "2_printer": "branch_2_printer",
    "branch_3_printer": "branch_3_printer",
    "branch3_printer": "branch_3_printer",
    "3_printer": "branch_3_printer",
}

ROLLING_BASE_COLUMNS = ["temperature", "load", "vibration", "health_score", "counter_diff"]
ROLLING_WINDOWS = [3, 7, 14]
REQUIRED_COLUMNS = [
    "serial_number",
    "date",
    "counter",
    "temperature",
    "load",
    "vibration",
    "health_score",
    "scanner_model",
    "maintenance_performed",
    "spare_parts",
    "technician",
]

app = FastAPI(title="Maintenance Model API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_REGISTRY: dict[str, Any] = {}


if column_transformer_module is not None and not hasattr(column_transformer_module, "_RemainderColsList"):
    class _RemainderColsList(list):
        def __init__(self, *args, **kwargs):
            super().__init__(*args)
            self.data = []
            self.future_dtype = "str"
            self.warning_was_emitted = False
            self.warning_enabled = True

    column_transformer_module._RemainderColsList = _RemainderColsList


def get_risk_level(probability: float) -> str:
    if probability < 0.30:
        return "Low"
    if probability < 0.60:
        return "Medium"
    if probability < 0.80:
        return "High"
    return "Critical"


def get_recommendation(risk_level: str) -> str:
    if risk_level == "Low":
        return "No action needed"
    if risk_level == "Medium":
        return "Monitor closely"
    if risk_level == "High":
        return "Schedule maintenance"
    return "Immediate intervention required"


def load_models() -> dict[str, Any]:
    missing_models = [f"{key}: {path}" for key, path in MODEL_PATHS.items() if not path.exists()]
    if missing_models:
        raise RuntimeError(f"Model file not found: {', '.join(missing_models)}")

    return {key: joblib.load(path) for key, path in MODEL_PATHS.items()}


def resolve_model_key(device_type: str | None) -> str:
    if not device_type:
        raise HTTPException(
            status_code=422,
            detail="device_type is required. Use one of: branch_1, branch_2, branch_3.",
        )

    normalized = device_type.strip().lower().replace("-", "_").replace(" ", "_")
    model_key = DEVICE_TYPE_MODEL_KEY_MAP.get(normalized)

    if model_key is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported device_type. Use one of: branch_1, branch_2, branch_3.",
        )

    return model_key


@app.on_event("startup")
def startup_event() -> None:
    global MODEL_REGISTRY
    MODEL_REGISTRY = load_models()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": len(MODEL_REGISTRY) > 0,
        "model_path": str(MODEL_PATH),
        "model_paths": {key: str(path) for key, path in MODEL_PATHS.items()},
        "loaded_models": sorted(MODEL_REGISTRY.keys()),
    }


def read_dataset(contents: bytes, filename: str) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()

    if suffix == ".csv":
        return pd.read_csv(io.BytesIO(contents))
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(io.BytesIO(contents))

    raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV or Excel (.xlsx/.xls).")


def prepare_inference_data(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {', '.join(missing_columns)}",
        )

    prepared = df.copy()
    prepared["date"] = pd.to_datetime(prepared["date"], errors="coerce")
    prepared = prepared.dropna(subset=["date"])
    prepared = prepared.sort_values(["serial_number", "date"]).reset_index(drop=True)

    prepared["day_of_week"] = prepared["date"].dt.dayofweek
    prepared["month"] = prepared["date"].dt.month
    prepared["day_of_year"] = prepared["date"].dt.dayofyear
    prepared["counter_diff"] = prepared.groupby("serial_number")["counter"].diff().fillna(0)

    for column in ROLLING_BASE_COLUMNS:
        for window in ROLLING_WINDOWS:
            prepared[f"{column}_mean_{window}"] = (
                prepared.groupby("serial_number")[column]
                .transform(lambda series: series.shift(1).rolling(window).mean())
            )
            prepared[f"{column}_std_{window}"] = (
                prepared.groupby("serial_number")[column]
                .transform(lambda series: series.shift(1).rolling(window).std())
            )

    prepared = prepared.dropna().reset_index(drop=True)

    numeric_features = [
        "health_score",
        "counter",
        "temperature",
        "load",
        "vibration",
        "day_of_week",
        "month",
        "day_of_year",
        "counter_diff",
    ] + [column for column in prepared.columns if ("_mean_" in column or "_std_" in column)]

    categorical_features = [
        "scanner_model",
        "maintenance_performed",
        "spare_parts",
        "technician",
    ]

    prepared[categorical_features] = prepared[categorical_features].fillna("Unknown")

    return prepared, numeric_features + categorical_features


def predict_latest_scanners(df: pd.DataFrame, feature_columns: list[str], model: Any) -> list[dict[str, Any]]:
    if df.empty:
        return []

    latest_indices = df.groupby("serial_number")["date"].idxmax()
    latest_rows = df.loc[latest_indices].copy().reset_index(drop=True)
    latest_feature_rows = df.loc[latest_indices, feature_columns].copy().reset_index(drop=True)

    probabilities = model.predict_proba(latest_feature_rows)[:, 1]

    latest_rows["failure_probability_next_7d"] = probabilities
    latest_rows["risk_level"] = latest_rows["failure_probability_next_7d"].apply(get_risk_level)
    latest_rows["recommendation"] = latest_rows["risk_level"].apply(get_recommendation)
    latest_rows = latest_rows.sort_values(by="failure_probability_next_7d", ascending=False).reset_index(drop=True)

    return [
        {
            "serial_number": row["serial_number"],
            "scanner_model": row["scanner_model"],
            "date": row["date"].strftime("%Y-%m-%d"),
            "failure_probability_next_7d": float(row["failure_probability_next_7d"]),
            "risk_level": row["risk_level"],
            "recommendation": row["recommendation"],
        }
        for _, row in latest_rows.iterrows()
    ]


@app.post("/predict/dataset")
async def predict_dataset(
    file: UploadFile = File(...),
    device_type: str | None = Query(default=None),
) -> dict[str, Any]:
    contents = await file.read()
    dataframe = read_dataset(contents, file.filename or "dataset.csv")
    prepared_df, feature_columns = prepare_inference_data(dataframe)

    model_key = resolve_model_key(device_type)
    model = MODEL_REGISTRY.get(model_key)

    if model is None:
        raise HTTPException(status_code=500, detail=f"Model is not loaded for {model_key}")

    latest_predictions = predict_latest_scanners(prepared_df, feature_columns, model)
    return {
        "success": True,
        "model_key": model_key,
        "predictions": latest_predictions,
        "summary": {
            "total_scanners": len(latest_predictions),
            "high_risk_count": sum(
                1 for item in latest_predictions if item["risk_level"] in {"High", "Critical"}
            ),
        },
    }
