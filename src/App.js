import React, { useState, useEffect } from 'react';
import './App.css';
import { auth } from './firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';
import About from './pages/About';
import EmbedsBox from './components/EmbedsBox';

import PromptResults from './components/PromptResults';
import TheCompanies from './components/HelpfulLinks';
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
  const [activeSection, setActiveSection] = useState('roles');

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

  // Scroll tracking for navigation
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['roles', 'companies', 'skills', 'job-skills'];
      const scrollPosition = window.scrollY + 200; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            <p className="header-slogan">What do people do in companies and how do companies make money?</p>
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
        <>
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">k u r i o</h1>
              <p className="hero-subtitle">Your guide to skills, roles and Organisations</p>
            </div>
          </div>
          <div className="page-layout">
            <nav className="left-navigation">
              <div className="nav-section">
                <h3 className="nav-title">Learn</h3>
                <ul className="nav-links">
                  <li><a href="#roles" className={`nav-link ${activeSection === 'roles' ? 'nav-link-active' : ''}`}>The Roles</a></li>
                  <li><a href="#companies" className={`nav-link ${activeSection === 'companies' ? 'nav-link-active' : ''}`}>The Companies</a></li>
                  <li><a href="#skills" className={`nav-link ${activeSection === 'skills' ? 'nav-link-active' : ''}`}>Helpful Skills</a></li>
                  <li><a href="#job-skills" className={`nav-link ${activeSection === 'job-skills' ? 'nav-link-active' : ''}`}>Essential Job Skills</a></li>
                </ul>
              </div>
            </nav>
            <main className="main-content">
              <div id="roles" className="the-roles-section">
                <h2 className="section-title-root">
                  <span className="section-title-hed">The roles - Learn about a typical day at work</span>
                </h2>
                

                
                {/* Search Recent Entries moved to middle */}
                <div className="search-recent-entries">
              
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
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M8 5V19L19 12L8 5Z" fill="white"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="category-row">
                <div className="category-left">
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
            <PromptResults categoryFilter={selectedCategory} />
            </div>
            
            <EmbedsBox urls={[
              "https://www.youtube.com/embed/U-lYLSlYU1o?si=VUkTlemQ7wPjhQV3",
              "https://www.youtube.com/embed/Ipe9xJCfuTM?si=3uphlTlbHkoeXy_3",
              "https://www.youtube.com/embed/PTKlLYht2Jk?si=yVgwe1u5zSanLaCQ",
              "https://www.youtube.com/embed/Y-yOE-RgX0M?si=Nv83hJd7B5JHKmuL",
              "https://www.youtube.com/embed/jLpN8ay3Fow?si=JRoPQ5U5ztmQeMCB"
            ]} />
            
            <div id="companies" className="companies-section">
              <h2 className="section-title-root">
                <span className="section-title-hed">The Companies</span>
              </h2>
              <TheCompanies />
            </div>
            
            <div id="skills" className="helpful-skills-section">
              <h2 className="section-title-root">
                <span className="section-title-hed">Helpful Skills</span>
              </h2>
            </div>
            
            <div id="job-skills" className="essential-job-skills-section">
              <h2 className="section-title-root">
                <span className="section-title-hed">Essential job skills</span>
              </h2>
              <WordCloud />
            </div>
              </div>
          </main>
        </div>
        </>
      ) : (
        <About />
      )}
    </div>
  );
}

export default App;
