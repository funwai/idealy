import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import PromptResults from '../components/PromptResults';
import '../App.css';

function Roles() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmitEntry = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) return;

    try {
      // Save to the 'rawentries' collection
      await addDoc(collection(db, 'rawentries'), {
        job_title: jobTitle,
        typical_day: jobDescription,
        createdAt: serverTimestamp(),
      });

      setJobTitle('');
      setJobDescription('');
      setShowPromptInput(false);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  return (
    <div className="companies-page">
      <div className="companies-container">
        <h1>T H E  R O L E S</h1>
        
        {/* Category Filter */}
        <div className="companies-filter">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select 
            id="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="category-select"
          >
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Tech">Tech</option>
            <option value="Health">Health</option>
            <option value="Transport">Transport</option>
            <option value="Food and Beverages">Food and Beverages</option>
            <option value="Education">Education</option>
            <option value="Legal">Legal</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Customer Service">Customer Service</option>
            <option value="HR">HR</option>
          </select>
          
          {/* Add Entry Button */}
          <div className="add-entry-section">
            <span className="add-entry-text">Want to add your own day?</span>
            <button 
              className="add-entry-button"
              onClick={() => setShowPromptInput(!showPromptInput)}
            >
              +
            </button>
          </div>
        </div>
        
        {/* Modal for adding entry */}
        {showPromptInput && (
          <div className="modal-overlay" onClick={() => setShowPromptInput(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Simply describe a typical day at work and our AI will summarise this and add it to the database</h3>
              </div>
              <div className="search-container">
                <div className="input-fields">
                  <div className="search-input-wrapper">
                    <div className="search-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M15.2 16.34a7.5 7.5 0 1 1 1.38-1.45l4.2 4.2a1 1 0 1 1-1.42 1.41l-4.16-4.16zm-4.7.16a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Job title"
                      className="search-input"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="search-input-wrapper">
                    <div className="search-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M15.2 16.34a7.5 7.5 0 1 1 1.38-1.45l4.2 4.2a1 1 0 1 1-1.42 1.41l-4.16-4.16zm-4.7.16a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"></path>
                      </svg>
                    </div>
                    <textarea
                      placeholder="Describe your typical day at work..."
                      className="search-input"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows="4"
                    />
                  </div>
                </div>
                <div className="submit-button-wrapper">
                  <button 
                    className="circular-submit-button"
                    onClick={handleSubmitEntry}
                    disabled={!jobTitle.trim() || !jobDescription.trim()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M8 5V19L19 12L8 5Z" fill="white"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Roles List */}
        <div className="companies-list">
          <PromptResults category={selectedCategory} />
        </div>
      </div>
    </div>
  );
}

export default Roles;

