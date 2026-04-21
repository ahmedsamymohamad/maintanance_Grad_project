import json
import os
import sys

import joblib
import pandas as pd


ROLLING_BASE_COLUMNS = ["temperature", "load", "vibration", "health_score", "counter_diff"]
ROLLING_WINDOWS = [3, 7, 14]


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


def read_dataset(file_path: str) -> pd.DataFrame:
    extension = os.path.splitext(file_path)[1].lower()
    if extension == ".csv":
        return pd.read_csv(file_path)
    if extension in [".xlsx", ".xls"]:
        return pd.read_excel(file_path)
    raise ValueError("Unsupported file type. Use CSV or Excel (.xlsx/.xls).")


def prepare_inference_data(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    required_columns = [
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

    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    prepared = df.copy()
    prepared["date"] = pd.to_datetime(prepared["date"], errors="coerce")
    prepared = prepared.dropna(subset=["date"])
    prepared = prepared.sort_values(["serial_number", "date"]).reset_index(drop=True)

    prepared["day_of_week"] = prepared["date"].dt.dayofweek
    prepared["month"] = prepared["date"].dt.month
    prepared["day_of_year"] = prepared["date"].dt.dayofyear

    prepared["counter_diff"] = (
        prepared.groupby("serial_number")["counter"].diff().fillna(0)
    )

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
    ] + [
        column for column in prepared.columns if ("_mean_" in column or "_std_" in column)
    ]

    categorical_features = [
        "scanner_model",
        "maintenance_performed",
        "spare_parts",
        "technician",
    ]

    prepared[categorical_features] = prepared[categorical_features].fillna("Unknown")

    feature_columns = numeric_features + categorical_features
    return prepared, feature_columns


def predict_latest_scanners(df: pd.DataFrame, model, feature_columns: list[str]) -> list[dict]:
    if df.empty:
        return []

    latest_indices = df.groupby("serial_number")["date"].idxmax()
    latest_rows = df.loc[latest_indices].copy().reset_index(drop=True)
    input_frame = latest_rows[feature_columns].copy()

    probabilities = model.predict_proba(input_frame)[:, 1]

    latest_rows["failure_probability_next_7d"] = probabilities
    latest_rows["risk_level"] = latest_rows["failure_probability_next_7d"].apply(get_risk_level)
    latest_rows["recommendation"] = latest_rows["risk_level"].apply(get_recommendation)

    latest_rows = latest_rows.sort_values(
        by="failure_probability_next_7d", ascending=False
    ).reset_index(drop=True)

    output_rows = []
    for _, row in latest_rows.iterrows():
        output_rows.append({
            "serial_number": row["serial_number"],
            "scanner_model": row["scanner_model"],
            "date": row["date"].strftime("%Y-%m-%d"),
            "failure_probability_next_7d": float(row["failure_probability_next_7d"]),
            "risk_level": row["risk_level"],
            "recommendation": row["recommendation"],
        })

    return output_rows


def main() -> None:
    if len(sys.argv) != 3:
        raise ValueError("Usage: python scripts/predict_dataset.py <model_path> <dataset_path>")

    model_path = sys.argv[1]
    dataset_path = sys.argv[2]

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset file not found: {dataset_path}")

    model = joblib.load(model_path)
    dataframe = read_dataset(dataset_path)
    prepared_df, feature_columns = prepare_inference_data(dataframe)
    predictions = predict_latest_scanners(prepared_df, model, feature_columns)

    response = {
        "predictions": predictions,
        "summary": {
            "total_scanners": len(predictions),
            "high_risk_count": sum(1 for item in predictions if item["risk_level"] in ["High", "Critical"]),
        },
    }

    print(json.dumps(response))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
