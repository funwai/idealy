"""
Financial API module for Kurio
Contains functions to fetch and parse company financial data from SEC filings
"""

import requests
from bs4 import BeautifulSoup
import json
from fastapi import HTTPException

# Optional: Uncomment when ready to use Firestore
# import pandas as pd
# from google.cloud import firestore

# SEC API configuration
BASE = "https://data.sec.gov"
HEADERS = {"User-Agent": "kurio-agent/1.0 (potatojacket9@gmail.com)"}


def get_cik(ticker):
    """Retrieve CIK for a given ticker symbol"""
    res = requests.get(f"{BASE}/submissions/CIK{ticker}.json", headers=HEADERS)
    if res.status_code != 200:
        # fallback: try SEC ticker endpoint
        lookup = requests.get(f"https://www.sec.gov/files/company_tickers.json", headers=HEADERS).json()
        for _, c in lookup.items():
            if c["ticker"].lower() == ticker.lower():
                return str(c["cik_str"]).zfill(10)
    return None


def get_latest_10k_url(cik):
    """Retrieve latest 10-K filing document URL and dates for a given CIK"""
    url = f"{BASE}/submissions/CIK{cik}.json"
    res = requests.get(url, headers=HEADERS)
    data = res.json()

    for form, acc, filing_date, report_date in zip(
        data["filings"]["recent"]["form"],
        data["filings"]["recent"]["accessionNumber"],
        data["filings"]["recent"]["filingDate"],
        data["filings"]["recent"]["reportDate"]
    ):
        if form == "10-K":
            acc_num = acc.replace("-", "")
            filing_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_num}/{acc}-index.html"
            return filing_url, filing_date, report_date

    return None, None, None


def parse_cashflow_from_xbrl(soup):
    """Extract cash flow data from XBRL soup"""
    tags = {
        # Operating
        "Net profit (or loss if negative)": "us-gaap:NetIncomeLoss",
        "Depreciation (wear & tear on assets)": "us-gaap:DepreciationDepletionAndAmortization",
        "stock_comp": "us-gaap:ShareBasedCompensation",
        "change_ar": "us-gaap:IncreaseDecreaseInAccountsReceivable",
        "change_inventory": "us-gaap:IncreaseDecreaseInInventory",
        "change_ap": "us-gaap:IncreaseDecreaseInAccountsPayable",
        "Cash from day-to-day business (Operating Cashflow)": "us-gaap:NetCashProvidedByUsedInOperatingActivities",

        # Investing
        "Buying equipment/buildings (Capital Expenditure)": "us-gaap:PaymentsToAcquirePropertyPlantAndEquipment",
        "acquisitions": "us-gaap:PaymentsToAcquireBusinessesNetOfCashAcquired",
        "asset_sales": "us-gaap:ProceedsFromSaleOfPropertyPlantAndEquipment",
        "investments_purchase": "us-gaap:PaymentsToAcquireMarketableSecurities",
        "investments_maturity": "us-gaap:ProceedsFromMaturitiesOfMarketableSecurities",
        "Cash from investments (Buying/Selling assets)": "us-gaap:NetCashProvidedByUsedInInvestingActivities",

        # Financing
        "Money raised from issuing new shares": "us-gaap:ProceedsFromIssuanceOfCommonStock",
        "Money spent buying back shares of company": "us-gaap:PaymentsForRepurchaseOfCommonStock",
        "Borrowed money (New loans or bonds)": "us-gaap:ProceedsFromIssuanceOfLongTermDebt",
        "Loan repayments": "us-gaap:RepaymentsOfLongTermDebt",
        "Dividends paid to shareholders": "us-gaap:PaymentsOfDividends",
        "Cash from investors and loans (Financing activities)": "us-gaap:NetCashProvidedByUsedInFinancingActivities",

        # Summary
        "Change in cash during the period": "us-gaap:CashAndCashEquivalentsPeriodIncreaseDecrease",
        "Cash at the beginning of the period": "us-gaap:CashAndCashEquivalentsAtBeginningOfPeriod",
        "Cash remaining at the end of the period": "us-gaap:CashAndCashEquivalentsAtCarryingValue",
    }

    data = {}
    for key, tag in tags.items():
        el = soup.find(tag)
        if el and hasattr(el, "text"):
            try:
                data[key] = float(el.text.strip().replace(",", ""))
            except ValueError:
                data[key] = el.text.strip()
        else:
            data[key] = None

    return data


def parse_income_from_xbrl(soup):
    """
    Extract key income statement values from an XBRL soup object and group
    them into: revenue, expenses, profit, and shares.
    If some values are missing, compute derived ones (e.g. Gross Profit = Revenue - Cost of Revenue).
    """

    # Define XBRL tags grouped by category
    tags = {
        "revenue": {
            "Total Revenue": [
                "us-gaap:Revenues",
                "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
                "us-gaap:SalesRevenueNet",
                "us-gaap:SalesRevenueGoodsNet",
                "us-gaap:SalesRevenueServicesNet"
            ],
            "Advertising Revenue": ["us-gaap:AdvertisingRevenue"],
            "Interest Income": ["us-gaap:InterestIncome"],
            "Other Income": ["us-gaap:OtherNonoperatingIncomeExpense"]
        },

        "expenses": {
            "Cost of Revenue": ["us-gaap:CostOfRevenue", "us-gaap:CostOfGoodsSold"],
            "Research & Development": ["us-gaap:ResearchAndDevelopmentExpense"],
            "Sales & Marketing": ["us-gaap:SellingAndMarketingExpense"],
            "General & Administrative": ["us-gaap:GeneralAndAdministrativeExpense"],
            "Operating Expenses (Total)": ["us-gaap:OperatingExpenses"],
            "Interest Expense": ["us-gaap:InterestExpense"],
            "Income Tax Expense": ["us-gaap:IncomeTaxExpenseBenefit"]
        },

        "profit": {
            "Gross Profit": ["us-gaap:GrossProfit"],
            "Operating Income": ["us-gaap:OperatingIncomeLoss"],
            "Income Before Tax": [
                "us-gaap:IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"
            ],
            "Net Income": ["us-gaap:NetIncomeLoss"]
        },

        "shares": {
            "Earnings per Share (Basic)": ["us-gaap:EarningsPerShareBasic"],
            "Earnings per Share (Diluted)": ["us-gaap:EarningsPerShareDiluted"],
            "Weighted Average Shares Outstanding (Basic)": [
                "us-gaap:WeightedAverageNumberOfSharesOutstandingBasic"
            ],
            "Weighted Average Shares Outstanding (Diluted)": [
                "us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding"
            ]
        }
    }

    # Helper function to extract numeric value from XBRL
    def extract_value(tag_list):
        for tag in tag_list:
            el = soup.find(tag)
            if el and el.text.strip():
                try:
                    return float(el.text.strip().replace(",", ""))
                except ValueError:
                    continue
        return None

    # Parse raw values from XBRL
    grouped_data = {}
    for section, section_tags in tags.items():
        grouped_data[section] = {}
        for label, tag_list in section_tags.items():
            grouped_data[section][label] = extract_value(tag_list)

    # --- 🧮 Compute derived metrics ---
    rev = grouped_data["revenue"].get("Total Revenue")
    cost = grouped_data["expenses"].get("Cost of Revenue")
    gross = grouped_data["profit"].get("Gross Profit")
    op_exp = grouped_data["expenses"].get("Operating Expenses (Total)")
    r_and_d = grouped_data["expenses"].get("Research & Development")
    s_and_m = grouped_data["expenses"].get("Sales & Marketing")
    g_and_a = grouped_data["expenses"].get("General & Administrative")
    op_inc = grouped_data["profit"].get("Operating Income")

    # Gross Profit = Revenue - Cost of Revenue
    if gross is None and rev is not None and cost is not None:
        grouped_data["profit"]["Gross Profit"] = rev - cost

    # Operating Expenses (Total) = R&D + Sales & Marketing + G&A
    if op_exp is None and any(v is not None for v in [r_and_d, s_and_m, g_and_a]):
        total = sum(v for v in [r_and_d, s_and_m, g_and_a] if v is not None)
        grouped_data["expenses"]["Operating Expenses (Total)"] = total

    # Operating Income = Gross Profit - Operating Expenses
    gross = grouped_data["profit"].get("Gross Profit")
    op_exp = grouped_data["expenses"].get("Operating Expenses (Total)")
    if op_inc is None and gross is not None and op_exp is not None:
        grouped_data["profit"]["Operating Income"] = gross - op_exp

    # Income Before Tax = Operating Income + (Interest Income - Interest Expense) + Other Income
    inc_before_tax = grouped_data["profit"].get("Income Before Tax")
    int_income = grouped_data["revenue"].get("Interest Income")
    int_exp = grouped_data["expenses"].get("Interest Expense")
    other_inc = grouped_data["revenue"].get("Other Income")
    if inc_before_tax is None and op_inc is not None:
        total_other = (int_income or 0) - (int_exp or 0) + (other_inc or 0)
        grouped_data["profit"]["Income Before Tax"] = op_inc + total_other

    return grouped_data


def get_primary_xbrl_url(index_url):
    """Find the main XBRL (XML) file inside the 10-K index page"""
    res = requests.get(index_url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    for link in soup.find_all("a", href=True):
        href = link["href"]
        if href.endswith(".xml") and not any(
            x in href for x in ["_cal.xml", "_lab.xml", "_pre.xml", "_def.xml"]
        ):
            return "https://www.sec.gov" + href

    return None


def parse_cashflow_from_10k(latest_10k_filing_XBRL_XML):
    """Extract cash flow data from a 10-K XBRL or XML filing"""
    response = requests.get(latest_10k_filing_XBRL_XML, headers=HEADERS)

    # Detect whether the document is XML or HTML
    parser = "xml" if "<?xml" in response.text[:100] else "html.parser"
    soup = BeautifulSoup(response.text, features=parser)

    # Extract cashflow data using your earlier helper
    output = parse_cashflow_from_xbrl(soup)

    return output


def parse_income_from_10k(latest_10k_filing_XBRL_XML):
    """Extract income statement data from a 10-K XBRL or XML filing"""
    response = requests.get(latest_10k_filing_XBRL_XML, headers=HEADERS)

    # Detect whether the document is XML or HTML
    parser = "xml" if "<?xml" in response.text[:100] else "html.parser"
    soup = BeautifulSoup(response.text, features=parser)

    # Extract income data using your helper function
    output = parse_income_from_xbrl(soup)

    return output


def get_cashflow_json(ticker):
    """End-to-end: from ticker → CIK → 10-K → XBRL → cashflow data"""
    try:
        # Step 1. Get CIK for ticker
        cik = get_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail=f"CIK not found for ticker '{ticker}'.")

        # Step 2. Get latest 10-K URL
        filing_url, filing_date, report_date = get_latest_10k_url(cik)
        if not filing_url:
            raise HTTPException(status_code=404, detail=f"No 10-K filing found for '{ticker}'.")

        # Step 3. Get primary XBRL XML file
        xbrl_url = get_primary_xbrl_url(filing_url)
        if not xbrl_url:
            raise HTTPException(status_code=404, detail=f"No XBRL XML file found for '{ticker}'.")

        # Step 4. Parse cashflow
        cashflow_data = parse_cashflow_from_10k(xbrl_url)
        if not cashflow_data:
            raise HTTPException(status_code=500, detail=f"Could not parse cashflow for '{ticker}'.")

        # Step 5: Parse income data
        income_data = parse_income_from_10k(xbrl_url)
        if not income_data:
            raise HTTPException(status_code=500, detail=f"Could not parse income for '{ticker}'.")
        
        # Return final result
        return {
            "ticker": ticker,
            "cik": cik,
            "source": xbrl_url,
            "cashflow": cashflow_data,
            "income_statement": income_data,
            "filing_date": filing_date,
            "report_date": report_date,
        }

    except HTTPException:
        # Re-raise known FastAPI exceptions directly
        raise
    except Exception as e:
        # Catch all unexpected errors
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


# =============================================================================
# FIRESTORE STORAGE FUNCTIONS
# =============================================================================
# Uncomment the following lines when ready to use Firestore:
# from google.cloud import firestore
# db = firestore.Client.from_service_account_json("funwai-resume-firebase-adminsdk-fbsvc-a956eb6362.json")


def store_financials_to_firestore(financials_dict, collection_name="company_financials"):
    """
    Stores both cashflow and income statement data from get_cashflow_json() into Firestore.
    
    Args:
        financials_dict (dict): The result from get_cashflow_json(ticker)
        collection_name (str): Firestore collection name
    
    Note: Firestore functionality is temporarily disabled for testing
    """
    ticker = financials_dict.get("ticker")
    if not ticker:
        raise ValueError("Ticker not found in dictionary")

    # Placeholder implementation for testing
    print(f"✅ Would store financial data for {ticker} in Firestore collection '{collection_name}'.")
    print("Note: Firestore storage is temporarily disabled for testing.")
    
    # TODO: Uncomment when ready to use Firestore
    # doc_ref = db.collection(collection_name).document(ticker)
    # doc_ref.set(financials_dict)
