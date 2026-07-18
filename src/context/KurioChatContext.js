import React, { createContext, useCallback, useContext, useState } from 'react';
import { askQuestion } from '../api/ragApi';

const KurioChatContext = createContext(null);

export function KurioChatProvider({ children }) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatResponse, setChatResponse] = useState('');

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
    <KurioChatContext.Provider
      value={{
        chatMessage,
        setChatMessage,
        chatLoading,
        chatError,
        chatResponse,
        handleSendMessage,
      }}
    >
      {children}
    </KurioChatContext.Provider>
  );
}

export function useKurioChat() {
  const context = useContext(KurioChatContext);
  if (!context) {
    throw new Error('useKurioChat must be used within a KurioChatProvider');
  }
  return context;
}
