import React, { createContext, useCallback, useContext, useState } from 'react';
import FinancialDataPopup from '../components/FinancialDataPopup';
import { fetchFinancialData } from '../api/financialApi';
import { askQuestion } from '../api/ragApi';

const FinancialPopupContext = createContext(null);

export function FinancialPopupProvider({ children }) {
  const [showFinancialPopup, setShowFinancialPopup] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [financialPopupCompanyName, setFinancialPopupCompanyName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [popupError, setPopupError] = useState('');
  const [loadingSelection, setLoadingSelection] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatResponse, setChatResponse] = useState('');

  const closeFinancialPopup = useCallback(() => {
    setShowFinancialPopup(false);
    setFinancialData(null);
    setFinancialPopupCompanyName('');
    setPopupError('');
    setChatMessage('');
    setChatResponse('');
    setChatError('');
  }, []);

  const openFinancialPopup = useCallback(async (ticker, year = null) => {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) {
      return;
    }

    const selectionKey = year ? `${normalizedTicker}-${year}` : normalizedTicker;

    setSearchLoading(true);
    setLoadingSelection(selectionKey);
    setPopupError('');

    try {
      const data = await fetchFinancialData(normalizedTicker, year);
      setFinancialPopupCompanyName(
        year ? `${normalizedTicker} ${year}` : normalizedTicker
      );
      setFinancialData(data);
      setShowFinancialPopup(true);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setPopupError(error.message || 'Error fetching company data. Please try again.');
    } finally {
      setSearchLoading(false);
      setLoadingSelection('');
    }
  }, []);

  const handleSendMessage = useCallback(async (message) => {
    if (!message || !message.trim()) {
      return;
    }

    setChatLoading(true);
    setChatError('');
    setChatResponse('');

    try {
      const result = await askQuestion(message.trim());
      setChatResponse(result.answer);
      setChatMessage('');
    } catch (error) {
      console.error('Error calling chat API:', error);
      setChatError(error.message || 'Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }, []);

  return (
    <FinancialPopupContext.Provider
      value={{
        openFinancialPopup,
        closeFinancialPopup,
        searchLoading,
        loadingSelection,
        popupError,
        setPopupError,
      }}
    >
      {children}
      <FinancialDataPopup
        isOpen={showFinancialPopup}
        onClose={closeFinancialPopup}
        financialData={financialData}
        companyName={financialPopupCompanyName}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        chatLoading={chatLoading}
        chatError={chatError}
        chatResponse={chatResponse}
        handleSendMessage={handleSendMessage}
      />
    </FinancialPopupContext.Provider>
  );
}

export function useFinancialPopup() {
  const context = useContext(FinancialPopupContext);
  if (!context) {
    throw new Error('useFinancialPopup must be used within a FinancialPopupProvider');
  }
  return context;
}
