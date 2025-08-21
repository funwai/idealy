import React, { useState } from 'react';
import './App.css';
import { auth } from './firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';
import About from './pages/About';
import EmbedsBox from './components/EmbedsBox';
import JobCarousel from './components/JobCarousel';
import PromptResults from './components/PromptResults';
import HelpfulLinks from './components/HelpfulLinks';
import WordCloud from './components/WordCloud';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
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

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setShowLogin(false);
      setLoginError('');
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="container">
      {/* Header section similar to Reddit */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <img 
              src={require('./KURIO_name_separate_Logo.png')} 
              alt="Logo" 
              className="header-logo" 
              onClick={() => setCurrentPage('home')}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div className="header-center">
            <p className="header-slogan">Ever wonder what people <em>really</em> get up to in their jobs?</p>
          </div>
          <div className="header-right">
            <a 
              href="#home" 
              className={`home-link ${currentPage === 'home' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('home');
              }}
            >
              Home
            </a>
            <a 
              href="#about" 
              className={`about-link ${currentPage === 'about' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('about');
              }}
            >
              About
            </a>
            <a href="#contact" className="contact-link">Contact</a>
            {!user ? (
              !showLogin ? (
                <button className="login-button" onClick={() => setShowLogin(true)}>
                  Login
                </button>
              ) : (
                <div className="login-form">
                  <h2>Login</h2>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="login-submit" onClick={handleLogin}>
                    Submit
                  </button>
                  {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
                  <button className="form-cancel" onClick={() => setShowLogin(false)}>
                    Cancel
                  </button>
                </div>
              )
            ) : (
              <p className="welcome-text">Welcome, {user.email}</p>
            )}
          </div>
        </div>
      </header>

      {currentPage === 'home' ? (
        <div className="page-layout">
          <main className="main-content">
            <div className="main-header-section">
              <div className="main-message-container">
                <span className="main-message-text">A day in the life of</span>
                <JobCarousel />
              </div>
            </div>
            
            {/* Search Recent Entries moved to middle */}
            <div className="search-recent-entries">
              <div className="section-title-root">
                <h2 className="section-title-hed">
                  <span>Search Recent Entries</span>
                </h2>
                <div className="add-entry-section">
                  <span className="add-entry-text">Describe your typical day</span>
                  <button 
                    className="add-entry-button"
                    onClick={() => setShowPromptInput(!showPromptInput)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="search-header">
              </div>
              
              {showPromptInput && (
                <div className="modal-overlay" onClick={() => setShowPromptInput(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Describe your typical day in a few sentences!</h3>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M17.1 13.004H5.504a.75.75 0 0 1 0-1.5H17.1l-4.377-4.377a.75.75 0 0 1 1.061-1.06l4.95 4.95a1.75 1.75 0 0 1 0 2.474l-4.95 4.95a.75.75 0 1 1-1.06-1.06l4.376-4.377z" fill="currentColor"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="category-row">
                <label>Category</label>
                <div className="category-select-wrapper">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="">All Categories</option>
                  <option value="General">General</option>
                  <option value="Tech">Tech</option>
                  <option value="Health">Health</option>
                  <option value="Transport">Transport</option>
                  <option value="Food and Beverages">Food and Beverages</option>
                  <option value="Education">Education</option>
                </select>
                <div className="dropdown-icon-wrapper">
                  <div className="dropdown-icon">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 0.734863L4.99999 4.73486L1 0.734863" stroke="currentColor" strokeWidth="1.48148" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <PromptResults category={selectedCategory || 'All'} />
            </div>
            
            <EmbedsBox urls={[
              "https://www.youtube.com/embed/U-lYLSlYU1o?si=VUkTlemQ7wPjhQV3",
              "https://www.youtube.com/embed/Ipe9xJCfuTM?si=3uphlTlbHkoeXy_3",
              "https://www.youtube.com/embed/PTKlLYht2Jk?si=yVgwe1u5zSanLaCQ",
              "https://www.youtube.com/embed/Y-yOE-RgX0M?si=Nv83hJd7B5JHKmuL",
              "https://www.youtube.com/embed/jLpN8ay3Fow?si=JRoPQ5U5ztmQeMCB"
            ]} />
          </main>

          <div className="right-sidebar-container">
            <aside className="trending-sidebar">
              <HelpfulLinks />
            </aside>
            
            <aside className="word-cloud-sidebar">
              <WordCloud />
            </aside>
          </div>
        </div>
      ) : (
        <About />
      )}
    </div>
  );
}

export default App;
