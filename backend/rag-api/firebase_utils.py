from google.cloud import storage
import tempfile
import os
import json

def download_10k_from_firebase(ticker: str, service_account_path=None):
    """Download the 10-K HTML from Firebase Storage and return the text."""
    # Try to get credentials from environment variable first (for cloud deployment)
    credentials_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    
    if credentials_json:
        # Parse JSON from environment variable
        credentials_dict = json.loads(credentials_json)
        client = storage.Client.from_service_account_info(credentials_dict)
    elif service_account_path and os.path.exists(service_account_path):
        # Fall back to file path (for local development)
        client = storage.Client.from_service_account_json(service_account_path)
    else:
        # Last resort: try default credentials (for GCP environments)
        client = storage.Client()
    
    bucket = client.bucket("funwai-resume.firebasestorage.app")

    blob_path = f"company_details/EDGAR (US)/filings/{ticker}_10K.html"
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise FileNotFoundError(f"No file found for {ticker} at {blob_path}")

    html_content = blob.download_as_text()
    return html_content
