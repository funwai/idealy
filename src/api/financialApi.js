import FINANCIAL_API_BASE_URL from './financialApiConfig';

export async function fetchFinancialData(ticker, year = null) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const params = new URLSearchParams({ ticker: normalizedTicker });
  if (year) {
    params.set('year', String(year));
  }

  const url = `${FINANCIAL_API_BASE_URL}/api/financial-data?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.income_statement && !data.cash_flow) {
    throw new Error('No financial statements found for this company');
  }

  return data;
}
