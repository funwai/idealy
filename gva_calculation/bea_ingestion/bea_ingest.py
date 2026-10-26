"""
bea_ingest.py

Download BEA GDP-by-industry tables, keep local copies, and upload the original
JSON and CSV files to Firebase Storage.

BEA API key:
  Windows PowerShell:
    $env:BEA_API_KEY="YOUR_36_CHARACTER_KEY"

Firebase Storage (same project as the rest of Kurio):
  $env:FIREBASE_SERVICE_ACCOUNT_JSON="C:\\path\\to\\service-account.json"
  $env:GCP_STORAGE_BUCKET="funwai-resume.firebasestorage.app"   # optional; this is the default

  FIREBASE_SERVICE_ACCOUNT_JSON may be a file path, raw JSON, or base64 JSON.
  If it is unset, Application Default Credentials are used.

Install:
  pip install -r requirements.txt

Examples:
  python bea_ingest.py --year 2024
  python bea_ingest.py --years 2020,2021,2022,2023,2024
  python bea_ingest.py --dataset UnderlyingGDPbyIndustry --year 2024
  python bea_ingest.py --dataset GDPbyIndustry --year 2024
  python bea_ingest.py --year 2024 --local-only

Outputs:
  Local (default folder: data/bea):
    raw/       Original JSON responses from BEA
    csv/       Downloaded table data as CSV
    reports/   Validation report JSON and a short text summary
  Firebase Storage (default bucket: funwai-resume.firebasestorage.app):
    bea/{dataset}/{year}/raw/{file}.json
    bea/{dataset}/{year}/csv/{file}.csv

Notes:
- Table IDs are discovered from BEA metadata by matching table descriptions.
- This script deliberately downloads the three relevant concepts as separate tables.
- BEA echoes the API key inside the JSON request block. That value is redacted
  before the JSON is written locally or uploaded.
- API schemas and available years can change; inspect the report and raw JSON.
- Underlying detail estimates have BEA quality cautions. Prefer higher-level GDPbyIndustry
  aggregates where appropriate and document the choice in Kurio's methodology.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests

BASE_URL = "https://apps.bea.gov/api/data/"
DEFAULT_DATASET = "UnderlyingGDPbyIndustry"
DEFAULT_BUCKET = "funwai-resume.firebasestorage.app"

# Table descriptions differ slightly by dataset and BEA updates.
# Metadata discovery uses keywords, then validates that a unique table is selected.
TABLE_TARGETS = {
    "value_added": ("value added by industry",),
    "gross_output": ("gross output by industry",),
    "intermediate_inputs": ("intermediate inputs by industry",),
}

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Kurio-BEA-data-validation/0.1"})


class BEAError(RuntimeError):
    pass


def safe_filename(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("_")


def request_bea(params: dict[str, Any], timeout: int = 60) -> dict[str, Any]:
    """Call BEA API, raise helpful errors, and return parsed JSON."""
    response = SESSION.get(BASE_URL, params=params, timeout=timeout)
    response.raise_for_status()

    try:
        payload = response.json()
    except ValueError as exc:
        raise BEAError(
            f"BEA returned non-JSON content (HTTP {response.status_code}). "
            f"First 500 chars: {response.text[:500]}"
        ) from exc

    root = payload.get("BEAAPI", {})
    if root.get("Error"):
        details = root["Error"]
        raise BEAError(f"BEA API error: {json.dumps(details, ensure_ascii=False)}")

    # Some BEA errors are surfaced under Results.Error.
    results = root.get("Results", {})
    if isinstance(results, dict) and results.get("Error"):
        raise BEAError(f"BEA API error: {json.dumps(results['Error'], ensure_ascii=False)}")

    return payload


def get_results(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        results = payload["BEAAPI"]["Results"]
    except (KeyError, TypeError) as exc:
        raise BEAError(
            "Unexpected BEA response structure. Inspect the saved raw response."
        ) from exc
    # GetData sometimes returns Results as a one-item list instead of an object.
    if isinstance(results, list):
        dicts = [item for item in results if isinstance(item, dict)]
        if len(dicts) != 1:
            raise BEAError(
                f"Unexpected BEA Results list length: {len(results)} "
                f"({len(dicts)} objects)."
            )
        results = dicts[0]
    if not isinstance(results, dict):
        raise BEAError(f"Unexpected BEA Results type: {type(results).__name__}")
    if results.get("Error"):
        raise BEAError(f"BEA API error: {json.dumps(results['Error'], ensure_ascii=False)}")
    return results


def discover_table_ids(api_key: str, dataset: str) -> list[dict[str, str]]:
    payload = request_bea({
        "UserID": api_key,
        "method": "GetParameterValues",
        "DataSetName": dataset,
        "ParameterName": "TableID",
        "ResultFormat": "JSON",
    })
    results = get_results(payload)
    values = results.get("ParamValue")
    if not isinstance(values, list):
        raise BEAError(
            f"Could not find table metadata for {dataset}. "
            f"Results keys: {list(results.keys())}"
        )

    tables = []
    for item in values:
        if not isinstance(item, dict):
            continue
        key = str(item.get("Key", "")).strip()
        desc = str(item.get("Desc", "")).strip()
        if key and desc:
            tables.append({"table_id": key, "description": desc})
    return tables


def choose_table(tables: list[dict[str, str]], concept: str) -> dict[str, str]:
    """Select a table by description, preferring exact concept matches."""
    keywords = TABLE_TARGETS[concept]
    candidates = []
    for table in tables:
        desc = table["description"].lower().replace("u.", "").strip()

        # Use standard industry tables for the first version.
        if "detail level" in desc:
            continue

        if all(word in desc for word in keywords):
            candidates.append(table)

    # Prefer annual tables and avoid percentage/index/quantity/price variants.
    def score(table: dict[str, str]) -> tuple[int, int]:
        desc = table["description"].lower()
        penalty_terms = ("percentage", "percent", "chain-type", "index", "real ", "quantity", "price")
        penalty = sum(term in desc for term in penalty_terms)
        annual_bonus = int("(a)" in desc or "annual" in desc)
        return (penalty, -annual_bonus)

    candidates.sort(key=score)
    if not candidates:
        related = [
            t for t in tables
            if any(word in t["description"].lower() for word in keywords)
        ]
        sample = "; ".join(f'{t["table_id"]}: {t["description"]}' for t in related[:12])
        raise BEAError(
            f"No table found for '{concept}'. Related metadata: {sample or 'none'}"
        )

    best_score = score(candidates[0])
    best = [t for t in candidates if score(t) == best_score]
    if len(best) > 1:
        # If duplicate annual/nonannual descriptions remain, require inspection.
        names = "; ".join(f'{t["table_id"]}: {t["description"]}' for t in best)
        raise BEAError(f"Ambiguous table match for '{concept}': {names}")
    return candidates[0]


def extract_data_rows(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    results = get_results(payload)
    data = results.get("Data")
    if not isinstance(data, list):
        raise BEAError(
            f"BEA response has no Data list. Results keys: {list(results.keys())}"
        )
    metadata = {k: v for k, v in results.items() if k != "Data"}

    # Typical BEA API response has Results.Data as a list of row dictionaries.
    rows = [row for row in data if isinstance(row, dict)]
    if not rows:
        raise BEAError("BEA returned zero data rows.")
    return rows, metadata


def parse_years(args: argparse.Namespace) -> list[int]:
    raw = args.years if args.years else str(args.year)
    try:
        years = sorted({int(x.strip()) for x in raw.split(",") if x.strip()})
    except ValueError as exc:
        raise BEAError("Years must be integers, e.g. --years 2020,2021,2022") from exc
    current_year = datetime.now(timezone.utc).year
    if not years or any(year < 1929 or year > current_year + 1 for year in years):
        raise BEAError(f"Please provide valid years between 1929 and {current_year + 1}.")
    return years


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def redact_user_id(payload: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of a BEA payload with the echoed API key removed."""
    cleaned = json.loads(json.dumps(payload))
    request = cleaned.get("BEAAPI", {}).get("Request", {})
    params = request.get("RequestParam") if isinstance(request, dict) else None
    items = params if isinstance(params, list) else [params] if isinstance(params, dict) else []
    for item in items:
        if isinstance(item, dict) and str(item.get("ParameterName", "")).upper() == "USERID":
            item["ParameterValue"] = "REDACTED"
    return cleaned


def load_service_account_info(raw_value: str) -> dict[str, Any]:
    """Load service account credentials from a file path, JSON string, or base64 JSON."""
    trimmed = raw_value.strip()
    if not trimmed:
        raise BEAError("FIREBASE_SERVICE_ACCOUNT_JSON is empty.")

    path = Path(trimmed)
    try:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
        if trimmed.startswith("{"):
            return json.loads(trimmed)
        decoded = base64.b64decode(trimmed).decode("utf-8")
        return json.loads(decoded)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise BEAError(
            "Could not read Firebase service account credentials. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON to a JSON file path, raw JSON, or base64 JSON."
        ) from exc


def open_storage_bucket(bucket_name: str, service_account_value: str | None) -> Any:
    """Open the Firebase Storage bucket used by the rest of the project."""
    try:
        from google.cloud import storage
        from google.oauth2 import service_account
    except ImportError as exc:
        raise BEAError(
            "google-cloud-storage is required to upload files. "
            "Install with: pip install -r requirements.txt"
        ) from exc

    raw = (
        service_account_value
        or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        or os.getenv("FIREBASE_SERVICE_ACCOUNT")
    )
    project_id = os.getenv("GCP_PROJECT_ID") or "funwai-resume"
    name = (bucket_name or os.getenv("GCP_STORAGE_BUCKET") or DEFAULT_BUCKET).strip()
    if not name:
        raise BEAError("Firebase Storage bucket is missing. Set GCP_STORAGE_BUCKET or pass --bucket.")

    if raw:
        info = load_service_account_info(raw)
        credentials = service_account.Credentials.from_service_account_info(info)
        client = storage.Client(
            project=project_id or info.get("project_id"),
            credentials=credentials,
        )
    else:
        client = storage.Client(project=project_id)

    return client.bucket(name)


def upload_file(bucket: Any, local_path: Path, object_path: str, content_type: str) -> str:
    """Upload a local file and return its gs:// path."""
    blob = bucket.blob(object_path)
    blob.upload_from_filename(str(local_path), content_type=content_type)
    return f"gs://{bucket.name}/{object_path}"


def download_table(
    api_key: str,
    dataset: str,
    year: int,
    table: dict[str, str],
    output_dir: Path,
    bucket: Any | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    params = {
        "UserID": api_key,
        "method": "GetData",
        "DataSetName": dataset,
        "TableID": table["table_id"],
        "Year": str(year),
        "Industry": "ALL",
        "Frequency": "A",
        "ResultFormat": "JSON",
    }
    payload = redact_user_id(request_bea(params))
    rows, response_metadata = extract_data_rows(payload)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = f"{safe_filename(dataset)}_{year}_{safe_filename(table['table_id'])}_{safe_filename(table['description'])}"
    raw_path = output_dir / "raw" / f"{stem}_{stamp}.json"
    csv_path = output_dir / "csv" / f"{stem}.csv"

    write_json(raw_path, payload)
    df = pd.DataFrame(rows)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")

    metadata = {
        "dataset": dataset,
        "year_requested": year,
        "table_id": table["table_id"],
        "table_description": table["description"],
        "row_count": int(len(df)),
        "columns": list(df.columns),
        "raw_json_path": str(raw_path),
        "csv_path": str(csv_path),
        "response_metadata": response_metadata,
    }
    if bucket is not None:
        prefix = f"bea/{safe_filename(dataset)}/{year}"
        metadata["storage_json_path"] = upload_file(
            bucket,
            raw_path,
            f"{prefix}/raw/{raw_path.name}",
            "application/json; charset=utf-8",
        )
        metadata["storage_csv_path"] = upload_file(
            bucket,
            csv_path,
            f"{prefix}/csv/{csv_path.name}",
            "text/csv; charset=utf-8",
        )
    return df, metadata


def find_column(df: pd.DataFrame, names: tuple[str, ...]) -> str | None:
    lowered = {str(col).lower(): str(col) for col in df.columns}
    for candidate in names:
        if candidate.lower() in lowered:
            return lowered[candidate.lower()]
    return None


def normalise_value(series: pd.Series) -> pd.Series:
    """Parse BEA numeric values, preserving common suppression/missing markers as NaN."""
    cleaned = (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("$", "", regex=False)
        .str.strip()
        .replace({
            "(D)": "",
            "(NA)": "",
            "(L)": "",
            "(T)": "",
            "None": "",
            "nan": "",
        })
    )
    return pd.to_numeric(cleaned, errors="coerce")


def validate_and_combine(
    downloaded: list[tuple[str, pd.DataFrame, dict[str, Any]]],
    dataset: str,
    year: int,
    output_dir: Path,
) -> dict[str, Any]:
    report: dict[str, Any] = {
        "dataset": dataset,
        "year": year,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "tables": [],
        "checks": [],
        "warnings": [],
        "status": "passed",
    }

    keyed: dict[str, pd.DataFrame] = {}
    for concept, df, meta in downloaded:
        table_report = dict(meta)
        table_report["concept"] = concept
        table_report["duplicate_rows"] = int(df.duplicated().sum())
        table_report["empty_columns"] = [
            str(c) for c in df.columns if df[c].isna().all()
        ]
        report["tables"].append(table_report)

        industry_col = find_column(df, ("Industry",))
        desc_col = find_column(df, ("IndustrYDescription", "IndustryDescription"))
        value_col = find_column(df, ("DataValue",))
        if not industry_col or not value_col:
            report["warnings"].append(
                f"{concept}: expected Industry and DataValue columns; "
                f"found {list(df.columns)}. Raw data saved; inspect schema."
            )
            continue

        slim = pd.DataFrame({
            "industry_code": df[industry_col].astype(str),
            "industry_name": df[desc_col].astype(str) if desc_col else "",
            concept: normalise_value(df[value_col]),
        })
        if slim["industry_code"].duplicated().any():
            report["warnings"].append(
                f"{concept}: duplicate industry codes found; not combining this table automatically."
            )
            continue
        keyed[concept] = slim

    if len(keyed) == 3:
        combined = keyed["value_added"]
        for concept in ("gross_output", "intermediate_inputs"):
            right = keyed[concept][["industry_code", concept]]
            combined = combined.merge(right, on="industry_code", how="outer", validate="one_to_one")

        combined["gva_to_output_ratio"] = combined["value_added"] / combined["gross_output"]
        combined["intermediate_input_ratio"] = combined["intermediate_inputs"] / combined["gross_output"]
        combined["ratio_sum"] = combined["gva_to_output_ratio"] + combined["intermediate_input_ratio"]

        valid_output = combined["gross_output"].notna() & (combined["gross_output"] != 0)
        ratio_sum = combined.loc[valid_output, "ratio_sum"]
        tolerance = 0.03
        failures = int(((ratio_sum - 1).abs() > tolerance).sum())
        missing = int(combined[["value_added", "gross_output", "intermediate_inputs"]].isna().any(axis=1).sum())
        report["checks"].append({
            "name": "industry_code_coverage",
            "value_added_industries": int(keyed["value_added"]["industry_code"].nunique()),
            "gross_output_industries": int(keyed["gross_output"]["industry_code"].nunique()),
            "intermediate_input_industries": int(keyed["intermediate_inputs"]["industry_code"].nunique()),
            "combined_industries": int(len(combined)),
            "rows_missing_any_measure": missing,
            "ratio_sum_outside_tolerance": failures,
            "ratio_tolerance": tolerance,
            "interpretation": (
                "For compatible current-dollar measures, value added plus intermediate inputs "
                "should approximately equal gross output. Investigate failures; do not assume "
                "all industry tables share perfectly aligned definitions or coverage."
            ),
        })

        combined_path = output_dir / "csv" / f"{safe_filename(dataset)}_{year}_combined_validation.csv"
        combined_path.parent.mkdir(parents=True, exist_ok=True)
        combined.to_csv(combined_path, index=False, encoding="utf-8-sig")
        report["combined_csv_path"] = str(combined_path)

        if missing:
            report["warnings"].append(
                f"{missing} combined industry rows have at least one missing measure."
            )
        if failures:
            report["warnings"].append(
                f"{failures} industry rows have GVA/output + intermediate-input/output "
                f"ratios outside {tolerance:.0%} of 1. Investigate units, table selection, "
                "industry coverage and BEA notes before using these as coefficients."
            )
    else:
        report["warnings"].append(
            f"Only {len(keyed)}/3 tables could be normalised. No combined ratio file created."
        )

    if report["warnings"]:
        report["status"] = "review_required"

    report_path = output_dir / "reports" / f"{safe_filename(dataset)}_{year}_validation.json"
    write_json(report_path, report)

    summary_path = output_dir / "reports" / f"{safe_filename(dataset)}_{year}_validation.txt"
    lines = [
        f"BEA validation report: {dataset} / {year}",
        f"Status: {report['status']}",
        "",
        "Tables:",
    ]
    for table in report["tables"]:
        lines.append(
            f"- {table.get('concept')}: table {table.get('table_id')} "
            f"({table.get('table_description')}), {table.get('row_count')} rows"
        )
    lines += ["", "Checks:"]
    lines += [f"- {check}" for check in report["checks"]]
    lines += ["", "Warnings:"]
    lines += [f"- {warning}" for warning in report["warnings"]] or ["- None"]
    lines += ["", f"Detailed JSON: {report_path}"]
    summary_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Download and validate BEA GDP-by-industry data.")
    parser.add_argument("--year", type=int, default=2024, help="Single annual year (default: 2024)")
    parser.add_argument("--years", type=str, help="Comma-separated years, e.g. 2020,2021,2022")
    parser.add_argument(
        "--dataset",
        choices=("UnderlyingGDPbyIndustry", "GDPbyIndustry"),
        default=DEFAULT_DATASET,
        help="BEA dataset (default: UnderlyingGDPbyIndustry)",
    )
    parser.add_argument("--output-dir", default="data/bea", help="Local output directory")
    parser.add_argument("--pause", type=float, default=0.25, help="Pause between API calls in seconds")
    parser.add_argument(
        "--bucket",
        default=os.getenv("GCP_STORAGE_BUCKET", DEFAULT_BUCKET),
        help=f"Firebase Storage bucket (default: {DEFAULT_BUCKET})",
    )
    parser.add_argument(
        "--service-account",
        default=None,
        help="Service account JSON path, raw JSON, or base64. Defaults to FIREBASE_SERVICE_ACCOUNT_JSON.",
    )
    parser.add_argument(
        "--local-only",
        action="store_true",
        help="Keep local files and skip the Firebase Storage upload",
    )
    args = parser.parse_args()

    api_key = os.getenv("BEA_API_KEY", "").strip()
    if not api_key:
        print(
            "ERROR: BEA_API_KEY environment variable is missing.\n"
            "PowerShell: $env:BEA_API_KEY=\"YOUR_36_CHARACTER_KEY\"",
            file=sys.stderr,
        )
        return 2

    output_dir = Path(args.output_dir)

    try:
        years = parse_years(args)
        print(f"Dataset: {args.dataset}")
        print(f"Years: {', '.join(map(str, years))}")
        print(f"Local output: {output_dir.resolve()}")

        bucket = None
        if args.local_only:
            print("Firebase Storage: skipped (--local-only)")
        else:
            bucket = open_storage_bucket(args.bucket, args.service_account)
            print(f"Firebase Storage: gs://{bucket.name}/bea/")
        tables = discover_table_ids(api_key, args.dataset)
        print(f"Discovered {len(tables)} table definitions from BEA metadata.")

        chosen: dict[str, dict[str, str]] = {}
        for concept in TABLE_TARGETS:
            chosen[concept] = choose_table(tables, concept)
            print(
                f"Selected {concept}: table {chosen[concept]['table_id']} — "
                f"{chosen[concept]['description']}"
            )

        all_passed = True
        for year in years:
            downloaded = []
            print(f"\n=== Year {year} ===")
            for concept, table in chosen.items():
                print(f"Downloading {concept} (table {table['table_id']})...")
                df, metadata = download_table(
                    api_key, args.dataset, year, table, output_dir, bucket
                )
                downloaded.append((concept, df, metadata))
                print(f"  Saved {len(df)} rows.")
                if metadata.get("storage_json_path"):
                    print(f"  JSON: {metadata['storage_json_path']}")
                    print(f"  CSV:  {metadata['storage_csv_path']}")
                time.sleep(max(0.0, args.pause))

            report = validate_and_combine(downloaded, args.dataset, year, output_dir)
            print(f"Validation status: {report['status']}")
            for warning in report["warnings"]:
                print(f"WARNING: {warning}")
            if report["status"] != "passed":
                all_passed = False

        print("\nFinished.")
        print(f"Inspect files under: {output_dir.resolve()}")
        return 0 if all_passed else 1

    except (BEAError, requests.RequestException, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        if type(exc).__module__.startswith("google"):
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1
        raise


if __name__ == "__main__":
    raise SystemExit(main())
