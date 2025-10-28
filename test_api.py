#!/usr/bin/env python3
"""
Test script for Kurio Financial API
Run this to test your API functions without starting a server
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from financial_api import get_cashflow_json
    print("SUCCESS: Successfully imported financial_api")
    
    # Test the function with a simple ticker
    print("\nTesting get_cashflow_json with AAPL...")
    result = get_cashflow_json("AAPL")
    
    print("SUCCESS: Function executed successfully!")
    print(f"Ticker: {result.get('ticker')}")
    print(f"CIK: {result.get('cik')}")
    print(f"Filing Date: {result.get('filing_date')}")
    print(f"Cashflow data points: {len(result.get('cashflow', {}))}")
    print(f"Income data points: {len(result.get('income_statement', {}))}")
    
except ImportError as e:
    print(f"IMPORT ERROR: {e}")
except Exception as e:
    print(f"ERROR testing function: {e}")
    print("This might be due to network issues or SEC API limits")