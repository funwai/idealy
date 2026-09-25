import React from 'react';
import './FinancialDataPopup.css';

const KurioAiChat = ({
  chatMessage,
  setChatMessage,
  chatLoading,
  chatError,
  chatResponse,
  handleSendMessage,
  companyTicker = '',
  variant = 'inline',
}) => {
  const sectionClassName = variant === 'inline'
    ? 'chat-section chat-section--inline'
    : 'chat-section';

  return (
    <div className={sectionClassName}>
      <div className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about any company (e.g. How much tax did Apple pay in 2025?)"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          disabled={chatLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (chatMessage.trim() && !chatLoading) {
                handleSendMessage(chatMessage, companyTicker);
              }
            }
          }}
        />
        <button
          className="chat-send-arrow"
          onClick={() => handleSendMessage(chatMessage, companyTicker)}
          disabled={!chatMessage.trim() || chatLoading}
          type="button"
          aria-label="Send question"
        />
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
  );
};

export default KurioAiChat;
