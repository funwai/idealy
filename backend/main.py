from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests, pandas as pd
from bs4 import BeautifulSoup

app = FastAPI()

# Allow your website to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kurio-ai.com",
        "https://www.kurio-ai.com",
        "http://localhost:3000",  # for development
        "http://localhost:3001",  # for development
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/get-financials")
def get_financials(ticker: str):
    base = "https://data.sec.gov"
    headers = {"User-Agent": "kurio-app/1.0 (contact@yourdomain.com)"}

    # Find CIK
    lookup = requests.get("https://www.sec.gov/files/company_tickers.json", headers=headers).json()
    cik = None
    for _, c in lookup.items():
        if c["ticker"].lower() == ticker.lower():
            cik = str(c["cik_str"]).zfill(10)
            break
    if not cik:
        return {"error": "Company not found"}

    # Get filings
    res = requests.get(f"{base}/submissions/CIK{cik}.json", headers=headers).json()
    filings = res["filings"]["recent"]
    latest_10k = next(
        (acc for form, acc in zip(filings["form"], filings["accessionNumber"]) if form == "10-K"),
        None
    )
    if not latest_10k:
        return {"error": "No 10-K filing found"}

    acc_num = latest_10k.replace("-", "")
    filing_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_num}/{latest_10k}-index.html"
    html_url = filing_url.replace("-index.html", ".htm")

    res = requests.get(html_url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")
    tables = soup.find_all("table")

    for t in tables:
        if "Cash Flows" in t.text:
            df = pd.read_html(str(t))[0]
            return {"ticker": ticker, "filing": filing_url, "cashflow": df.to_dict(orient="records")}

    return {"error": "Cashflow statement not found"}


