import React from 'react';
import './FinancialDataPopup.css';

const FinancialDataPopup = ({ isOpen, onClose, financialData, companyName }) => {
  if (!isOpen) return null;

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value;
  };

  const renderIncomeStatementTable = () => {
    if (!financialData) {
      return (
        <div className="no-data">
          <p>No financial data available for this company.</p>
        </div>
      );
    }

    if (!financialData.income_statement) {
      return (
        <div className="no-data">
          <p>No income statement data available for this company.</p>
        </div>
      );
    }

    const incomeStatement = financialData.income_statement;
    
    
    // Define the order and labels for income statement items using the actual field names from your data
    const incomeStatementItems = [
      { keys: ['Total Revenue'], label: 'Total Revenue' },
      { keys: ['Cost of Revenue'], label: 'Cost of Revenue' },
      { keys: ['Gross Profit'], label: 'Gross Profit' },
      { keys: ['Operating Expenses (Total)'], label: 'Operating Expenses' },
      { keys: ['Interest Expense'], label: 'Interest Expense' },
      { keys: ['Interest Income'], label: 'Interest Income' },
      { keys: ['Other Income (Expense)'], label: 'Other Income (Expense)' },
      { keys: ['Income Before Tax'], label: 'Income Before Tax' },
      { keys: ['Income Tax Expense'], label: 'Income Tax Expense' },
      { keys: ['Net Income'], label: 'Net Income' },
      { keys: ['Net Income Attributable to Parent'], label: 'Net Income Attributable to Parent' },
      { keys: ['Net Income Attributable to Noncontrolling Interest'], label: 'Net Income Attributable to Noncontrolling Interest' },
      { keys: ['Earnings per Share (Basic)'], label: 'Earnings per Share (Basic)' },
      { keys: ['Earnings per Share (Diluted)'], label: 'Earnings per Share (Diluted)' },
      { keys: ['Weighted Average Shares Outstanding (Basic)'], label: 'Weighted Average Shares Outstanding (Basic)' },
      { keys: ['Weighted Average Shares Outstanding (Diluted)'], label: 'Weighted Average Shares Outstanding (Diluted)' },
      { keys: ['Research & Development'], label: 'Research & Development' },
      { keys: ['Sales & Marketing'], label: 'Sales & Marketing' },
      { keys: ['General & Administrative'], label: 'General & Administrative' },
      { keys: ['Advertising Revenue'], label: 'Advertising Revenue' },
    ];

    return (
      <div className="income-statement-table">
        <h3>Income Statement</h3>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {incomeStatementItems.map((item, index) => {
              // Find the first available key for this item
              const foundKey = item.keys.find(key => incomeStatement.hasOwnProperty(key));
              const value = foundKey ? incomeStatement[foundKey] : null;
              
              return (
                <tr key={index}>
                  <td className="item-label">{item.label}</td>
                  <td className="item-value">
                    {value !== null && value !== undefined && value !== '' ? (
                      item.label === 'Earnings Per Share' 
                        ? formatNumber(value)
                        : formatCurrency(value)
                    ) : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="financial-popup-overlay" onClick={onClose}>
      <div className="financial-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="financial-popup-header">
          <h2>{companyName} - Financial Data</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="financial-popup-body">
          {renderIncomeStatementTable()}
        </div>
        
        <div className="financial-popup-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialDataPopup;
