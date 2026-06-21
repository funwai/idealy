import React, { useEffect, useMemo, useState } from 'react';
import { listIngestionFiles } from '../../api/ragApi';
import { useFinancialPopup } from '../../context/FinancialPopupContext';

function formatUpdatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function groupFilingsByTicker(items) {
  const grouped = new Map();

  for (const item of items) {
    const ticker = (item.ticker || item.id?.split('_')[0] || 'UNKNOWN').toUpperCase();
    if (!grouped.has(ticker)) {
      grouped.set(ticker, {
        ticker,
        filings: [],
        latestUpdatedAt: null,
      });
    }

    const entry = grouped.get(ticker);
    entry.filings.push(item);

    if (item.updatedAt) {
      const current = entry.latestUpdatedAt ? new Date(entry.latestUpdatedAt) : null;
      const next = new Date(item.updatedAt);
      if (!current || next > current) {
        entry.latestUpdatedAt = item.updatedAt;
      }
    }
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      years: [...new Set(entry.filings.map((filing) => filing.year).filter(Boolean))].sort((a, b) => b - a),
      filings: entry.filings.sort((a, b) => (b.year || 0) - (a.year || 0)),
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

const TABLE_VISIBLE_ROWS = 8;

const CompanyDataAvailability = () => {
  const { openFinancialPopup, searchLoading, loadingTicker, popupError, setPopupError } = useFinancialPopup();
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadFilings = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await listIngestionFiles({ status: 'success', limit: 500, retries: 2 });
      setFilings(data.items || []);
    } catch (err) {
      console.error('Error fetching ingestion files:', err);
      setError(err.message || 'Failed to load company data availability.');
      setFilings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilings();
  }, []);

  const groupedCompanies = useMemo(() => groupFilingsByTicker(filings), [filings]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toUpperCase();
    if (!query) return groupedCompanies;
    return groupedCompanies.filter((company) => company.ticker.includes(query));
  }, [groupedCompanies, search]);

  const handleTickerClick = (ticker) => {
    setPopupError('');
    openFinancialPopup(ticker);
  };

  if (loading) {
    return <div className="loading-placeholder">Loading data availability...</div>;
  }

  return (
    <div className="companies-subsection">
      <div className="data-availability-summary">
        <div className="data-availability-stat">
          <span className="data-availability-stat__value">{groupedCompanies.length}</span>
          <span className="data-availability-stat__label">Companies queryable</span>
        </div>
        <button type="button" className="data-availability-refresh" onClick={loadFilings}>
          Refresh
        </button>
      </div>

      <div className="data-availability-toolbar">
        <label htmlFor="ticker-search">Search by ticker</label>
        <input
          id="ticker-search"
          type="search"
          placeholder="e.g. AAPL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="data-availability-search"
        />
      </div>

      {error && (
        <div className="data-availability-error">
          <p>{error}</p>
        </div>
      )}

      {popupError && (
        <div className="data-availability-error">
          <p>{popupError}</p>
        </div>
      )}

      {!error && filteredCompanies.length === 0 && (
        <div className="empty-placeholder">
          No successfully ingested company filings found yet.
        </div>
      )}

      {!error && filteredCompanies.length > 0 && (
        <div
          className="data-availability-table-wrap"
          style={{ '--table-visible-rows': TABLE_VISIBLE_ROWS }}
        >
          <table className="data-availability-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Years available</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.ticker}>
                  <td className="data-availability-ticker">
                    <button
                      type="button"
                      className="data-availability-ticker-button"
                      onClick={() => handleTickerClick(company.ticker)}
                      disabled={searchLoading}
                      aria-label={`View financial data for ${company.ticker}`}
                    >
                      {searchLoading && loadingTicker === company.ticker
                        ? 'Loading...'
                        : (company.ticker || '—')}
                    </button>
                  </td>
                  <td>{(company.years ?? []).length > 0 ? company.years.join(', ') : '—'}</td>
                  <td>{formatUpdatedAt(company.latestUpdatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CompanyDataAvailability;
