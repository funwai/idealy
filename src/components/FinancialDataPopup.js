import React, { useState } from 'react';
import './FinancialDataPopup.css';

const FinancialDataPopup = ({ 
  isOpen, 
  onClose, 
  financialData, 
  companyName,
  chatMessage,
  setChatMessage,
  chatLoading,
  chatError,
  chatResponse,
  handleSendMessage
}) => {
  const [activeTab, setActiveTab] = useState('income');
  
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
    
    // Define the order and structure for income statement sections
    const incomeStatementSections = [
      {
        title: "Revenue",
        key: "revenue",
        items: [
          { key: "Total Revenue", label: "Total Revenue" },
          { key: "Advertising Revenue", label: "Advertising Revenue" },
          { key: "Interest Income", label: "Interest Income" },
          { key: "Other Income", label: "Other Income" }
        ]
      },
      {
        title: "Expenses",
        key: "expenses",
        items: [
          { key: "Cost of Revenue", label: "Cost of Revenue" },
          { key: "Research & Development", label: "Research & Development" },
          { key: "Sales & Marketing", label: "Sales & Marketing" },
          { key: "General & Administrative", label: "General & Administrative" },
          { key: "Operating Expenses (Total)", label: "Operating Expenses (Total)" },
          { key: "Interest Expense", label: "Interest Expense" },
          { key: "Income Tax Expense", label: "Income Tax Expense" }
        ]
      },
      {
        title: "Profit",
        key: "profit",
        items: [
          { key: "Gross Profit", label: "Gross Profit" },
          { key: "Operating Income", label: "Operating Income" },
          { key: "Income Before Tax", label: "Income Before Tax" },
          { key: "Net Income", label: "Net Income" }
        ]
      },
      {
        title: "Shares",
        key: "shares",
        items: [
          { key: "Earnings per Share (Basic)", label: "Earnings per Share (Basic)" },
          { key: "Earnings per Share (Diluted)", label: "Earnings per Share (Diluted)" },
          { key: "Weighted Average Shares Outstanding (Basic)", label: "Weighted Average Shares Outstanding (Basic)" },
          { key: "Weighted Average Shares Outstanding (Diluted)", label: "Weighted Average Shares Outstanding (Diluted)" }
        ]
      }
    ];

    return (
      <div className="income-statement-table">
        <h3>Income Statement</h3>
        
        {incomeStatementSections.map((section, sectionIndex) => {
          const sectionData = incomeStatement[section.key];
          if (!sectionData) return null;

          return (
            <div key={sectionIndex} className="income-section">
              <h4 className="section-title">{section.title}</h4>
              <table className="section-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, itemIndex) => {
                    const value = sectionData[item.key];
                    const isEarningsPerShare = item.label.includes('Earnings per Share');
                    
                    return (
                      <tr key={itemIndex}>
                        <td className="item-label">{item.label}</td>
                        <td className="item-value">
                          {value !== null && value !== undefined && value !== '' ? (
                            isEarningsPerShare 
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
        })}
      </div>
    );
  };

  const renderCashFlowTable = () => {
    if (!financialData) {
      return (
        <div className="no-data">
          <p>No financial data available for this company.</p>
        </div>
      );
    }

    if (!financialData.cash_flow) {
      return (
        <div className="no-data">
          <p>No cash flow statement data available for this company.</p>
        </div>
      );
    }

    const cashFlow = financialData.cash_flow;
    const entries = Object.entries(cashFlow).filter(([, value]) => value != null);

    if (entries.length === 0) {
      return (
        <div className="no-data">
          <p>No cash flow data available for this company.</p>
        </div>
      );
    }

    return (
      <div className="cash-flow-table">
        <h3>Cash Flow Statement</h3>
        <div className="income-section">
          <table className="section-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([label, value]) => (
                <tr key={label}>
                  <td className="item-label">{label}</td>
                  <td className="item-value">
                    {typeof value === 'number' ? formatCurrency(value) : formatNumber(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <div className="financial-popup-main-content">
            <div className="financial-data-section">
              {/* Tabs */}
              <div className="financial-tabs">
                <button
                  className={`tab-button ${activeTab === 'income' ? 'active' : ''}`}
                  onClick={() => setActiveTab('income')}
                  disabled={!financialData?.income_statement}
                >
                  Income Statement
                </button>
                <button
                  className={`tab-button ${activeTab === 'cashflow' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cashflow')}
                  disabled={!financialData?.cash_flow}
                >
                  Cash Flow Statement
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'income' && renderIncomeStatementTable()}
                {activeTab === 'cashflow' && renderCashFlowTable()}
              </div>
            </div>
            
            <div className="chat-section">
              <h2 className="chat-section-title">
                <img 
                  src={require('../sparkles_emoji_yellow_rotated.png')} 
                  alt="✨" 
                  style={{ width: '28px', height: '28px', marginRight: '8px', verticalAlign: 'middle' }}
                />
                ASK KURIO-AI
              </h2>
              
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="How much tax did this company pay last year?"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={chatLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (chatMessage.trim() && !chatLoading) {
                        handleSendMessage(chatMessage);
                      }
                    }
                  }}
                />
                <button
                  className="chat-send-arrow"
                  onClick={() => handleSendMessage(chatMessage)}
                  disabled={!chatMessage.trim() || chatLoading}
                  type="button"
                >
                </button>
              </div>
              
              {chatError && (
                <div className="chat-error">
                  <p>{chatError}</p>
                </div>
              )}
              {chatResponse && (
                <div className="chat-response">
                  <p>{chatResponse}</p>
                </div>
              )}
            </div>
          </div>
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
