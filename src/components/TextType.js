import React, { useState, useEffect } from 'react';

const TextType = ({ 
  text = [], 
  typingSpeed = 100, 
  pauseDuration = 10000,
  showCursor = true,
  cursorCharacter = "|"
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (text.length === 0) return;

    const currentString = text[currentIndex];
    
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting && displayText === currentString) {
      // Finished typing current string, pause before deleting
      setIsPaused(true);
      return;
    }

    if (isDeleting && displayText === '') {
      // Finished deleting, move to next string
      setIsDeleting(false);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % text.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        // Remove one character
        setDisplayText(currentString.substring(0, displayText.length - 1));
      } else {
        // Add one character
        setDisplayText(currentString.substring(0, displayText.length + 1));
      }
    }, isDeleting ? typingSpeed / 2 : typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, currentIndex, isDeleting, isPaused, text, typingSpeed, pauseDuration]);

  return (
    <span>
      {displayText}
      {showCursor && (
        <span className="typing-cursor">
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;

