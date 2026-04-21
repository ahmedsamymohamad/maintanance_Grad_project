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


PRINTER_REQUIRED_COLUMNS = [
    "date",
    "device_id",
    "printer_model",
    "temperature",
    "print_count",
    "usage_hours",
    "toner_level",
    "paper_jam",
    "error_code",
]


def _is_no_error(value: Any) -> bool:
    if pd.isna(value):
        return True
    text = str(value).strip().lower()
    return text in {"", "0", "ok", "none", "nan", "no_error", "no-error", "noerror"}


def prepare_printer_inference_data(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in PRINTER_REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required printer columns: {', '.join(missing)}",
        )

    p = df.copy()
    p["date"] = pd.to_datetime(p["date"], errors="coerce")
    p = p.dropna(subset=["date"]).sort_values(["device_id", "date"]).reset_index(drop=True)

    p["day_of_week"] = p["date"].dt.dayofweek
    p["month"] = p["date"].dt.month
    p["day"] = p["date"].dt.day
    p["is_weekend"] = (p["day_of_week"] >= 5).astype(int)

    p["error_flag"] = p["error_code"].apply(lambda v: 0 if _is_no_error(v) else 1)

    g = p.groupby("device_id")
    p["temperature_mean_3"] = g["temperature"].transform(lambda s: s.shift(1).rolling(3).mean())
    p["temperature_std_3"] = g["temperature"].transform(lambda s: s.shift(1).rolling(3).std())
    p["usage_hours_mean_3"] = g["usage_hours"].transform(lambda s: s.shift(1).rolling(3).mean())
    p["usage_hours_std_3"] = g["usage_hours"].transform(lambda s: s.shift(1).rolling(3).std())
    p["print_count_diff_1"] = g["print_count"].diff(1)
    p["print_count_mean_3"] = g["print_count"].transform(lambda s: s.shift(1).rolling(3).mean())
    p["toner_level_diff_1"] = g["toner_level"].diff(1)
    p["paper_jam_sum_7"] = g["paper_jam"].transform(lambda s: s.shift(1).rolling(7).sum())
    p["paper_jam_mean_3"] = g["paper_jam"].transform(lambda s: s.shift(1).rolling(3).mean())
    p["temperature_max_7"] = g["temperature"].transform(lambda s: s.shift(1).rolling(7).max())
    p["toner_level_min_7"] = g["toner_level"].transform(lambda s: s.shift(1).rolling(7).min())
    p["usage_hours_sum_7"] = g["usage_hours"].transform(lambda s: s.shift(1).rolling(7).sum())
    p["error_count_7"] = g["error_flag"].transform(lambda s: s.shift(1).rolling(7).sum())

    if "failure" in p.columns:
        def _tslf(group: pd.DataFrame) -> list[float]:
            last_failure: pd.Timestamp | None = None
            out: list[float] = []
            for _, row in group.iterrows():
                out.append(365.0 if last_failure is None else float((row["date"] - last_failure).days))
                if int(row.get("failure", 0) or 0) == 1:
                    last_failure = row["date"]
            return out

        tslf_series = pd.concat(
            [pd.Series(_tslf(grp), index=grp.index) for _, grp in p.groupby("device_id")]
        )
        p["time_since_last_failure"] = tslf_series.sort_index()
    else:
        p["time_since_last_failure"] = 365.0

    p["stress_score"] = (
        (p["temperature"].fillna(0) / 100.0)
        + (p["usage_hours"].fillna(0) / 24.0)
        + p["paper_jam"].fillna(0)
        + p["error_flag"]
    )

    return p


def predict_latest_printers(df: pd.DataFrame, model_dict: dict[str, Any]) -> list[dict[str, Any]]:
    if df.empty:
        return []

    pipeline = model_dict["pipeline"]
    feature_cols = list(model_dict["feature_cols"])

    latest_indices = df.groupby("device_id")["date"].idxmax()
    latest_rows = df.loc[latest_indices].copy().reset_index(drop=True)

    feature_frame = latest_rows.reindex(columns=feature_cols)
    probabilities = pipeline.predict_proba(feature_frame)[:, 1]

    latest_rows["failure_probability_next_7d"] = probabilities
    latest_rows["risk_level"] = latest_rows["failure_probability_next_7d"].apply(get_risk_level)
    latest_rows["recommendation"] = latest_rows["risk_level"].apply(get_recommendation)
    latest_rows = latest_rows.sort_values(by="failure_probability_next_7d", ascending=False).reset_index(drop=True)

    return [
        {
            "serial_number": str(row["device_id"]),
            "scanner_model": str(row.get("printer_model", "Printer")),
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

    model_key = resolve_model_key(device_type)
    model = MODEL_REGISTRY.get(model_key)

    if model is None:
        raise HTTPException(status_code=500, detail=f"Model is not loaded for {model_key}")

    if model_key.endswith("_printer"):
        prepared_df = prepare_printer_inference_data(dataframe)
        latest_predictions = predict_latest_printers(prepared_df, model)
        device_label = "printers"
    else:
        prepared_df, feature_columns = prepare_inference_data(dataframe)
        latest_predictions = predict_latest_scanners(prepared_df, feature_columns, model)
        device_label = "scanners"

    return {
        "success": True,
        "model_key": model_key,
        "predictions": latest_predictions,
        "summary": {
            f"total_{device_label}": len(latest_predictions),
            "total_devices": len(latest_predictions),
            "high_risk_count": sum(
                1 for item in latest_predictions if item["risk_level"] in {"High", "Critical"}
            ),
        },
    }
