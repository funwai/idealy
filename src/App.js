import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { auth, db } from './firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, getDocs } from 'firebase/firestore';
import About from './pages/About';
import Companies from './pages/Companies';
import Roles from './pages/Roles';
import TextType from './components/TextType';
import FinancialDataPopup from './components/FinancialDataPopup';
import { askQuestion } from './api/ragApi';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  
  // Kurio input state (company search)
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  
  // Financial data popup state
  const [showFinancialPopup, setShowFinancialPopup] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Chat prompt state
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  
  // Vanta.js background effect
  const vantaRef = useRef(null);
  
  // Helper function to format time
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Vanta.js background effect initialization
  useEffect(() => {
    const initVanta = () => {
      if (window.VANTA) {
        vantaRef.current = window.VANTA.NET({
          el: "#vanta-background",
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x2b254b,
          backgroundColor: 0xf4ece9
        });
      }
    };

    // Try to initialize immediately
    initVanta();

    // If VANTA isn't available yet, wait for it
    if (!window.VANTA) {
      const checkVanta = setInterval(() => {
        if (window.VANTA) {
          initVanta();
          clearInterval(checkVanta);
        }
      }, 100);
    }

    // Cleanup function
    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
      }
    };
  }, []);



  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setShowLogin(false);
      setLoginError('');
    } catch (error) {
      setLoginError('Email/password not recognized');
    }
  };


  // Handle company name input change
  const handleCompanyNameChange = (value) => {
    setCompanyName(value);
    setSearchError('');
  };


  const searchCompanyFinancials = async (companyName, country) => {
    setSearchLoading(true);
    setSearchError('');
    
    try {
      // First, try to find by company name in the data
      const q = query(collection(db, 'company_financials'));
      const querySnapshot = await getDocs(q);
      
      let foundData = null;
      let foundCompanyName = '';
      let exactTickerMatch = null;
      let companyNameMatches = [];
      
      // Search through all documents for a matching company name
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const docCompanyName = data.company_name || data.name || '';
        const ticker = doc.id; // Document ID is the ticker
        
        // More precise matching - check if the search term matches the ticker or company name exactly
        const searchTerm = companyName.toLowerCase().trim();
        const tickerMatch = ticker.toLowerCase() === searchTerm;
        const companyNameMatch = docCompanyName.toLowerCase().includes(searchTerm) || 
                                 searchTerm.includes(docCompanyName.toLowerCase());
        
        // Prioritize exact ticker matches
        if (tickerMatch) {
          exactTickerMatch = { data, companyName: docCompanyName || ticker };
        } else if (companyNameMatch && docCompanyName.length > 0) {
          companyNameMatches.push({ data, companyName: docCompanyName || ticker });
        }
      });
      
      // Use exact ticker match if available, otherwise use the first company name match
      if (exactTickerMatch) {
        foundData = exactTickerMatch.data;
        foundCompanyName = exactTickerMatch.companyName;
      } else if (companyNameMatches.length > 0) {
        foundData = companyNameMatches[0].data;
        foundCompanyName = companyNameMatches[0].companyName;
      }
      
      if (!foundData) {
        setSearchError('This company is yet to be added to our database');
        setSearchLoading(false);
        return;
      }
      
      setFinancialData(foundData);
      setShowFinancialPopup(true);
      
    } catch (error) {
      console.error('Error searching for company financials:', error);
      setSearchError('Error searching for company data. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendMessage = async (message) => {
    if (!message || !message.trim()) {
      return;
    }

    setChatLoading(true);
    setChatError('');
    setChatResponse('');

    try {
      const result = await askQuestion(message.trim());
      setChatResponse(result.answer);
      setChatMessage(''); // Clear input after successful send
    } catch (error) {
      console.error('Error calling chat API:', error);
      setChatError(error.message || 'Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Header section similar to Reddit */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
                         <img 
               src={require('./KURIO_logo_transparent_background.png')} 
               alt="Logo" 
               className="header-logo" 
               onClick={() => setCurrentPage('home')}
               style={{ cursor: 'pointer' }}
             />
          </div>
          <div className="header-center">
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
              href="#roles" 
              className={`roles-link ${currentPage === 'roles' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('roles');
              }}
            >
              Roles
            </a>
            <a 
              href="#companies" 
              className={`companies-link ${currentPage === 'companies' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('companies');
              }}
            >
              Companies
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
            {!user ? (
              <button 
                className="login-button"
                onClick={() => setShowLogin(true)}
              >
                Login
              </button>
            ) : (
              <div className="user-info">
                <span className="welcome-text">Welcome, {user.email}</span>
                <button 
                  className="logout-button"
                  onClick={() => setUser(null)}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Vanta.js Background Container */}
      <div id="vanta-background" className="vanta-background"></div>

      {currentPage === 'home' ? (
        <>
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">
                <TextType 
                  text={["k u r i o", "Understand businesses", "Follow the money", "Stay Kurious!"]}
                  typingSpeed={75}
                  pauseDuration={1500}
                  showCursor={true}
                  cursorCharacter="|"
                />
              </h1>
              <h2 className="hero-subtitle">People, Roles and Companies</h2>
               
                              <div className="audio-player">
                 <div className="audio-controls">
                   <span className="audio-question">Want to hear about what we do?</span>
                   <button 
                     className="play-pause-btn"
                     onClick={() => {
                       if (audioRef.current.paused) {
                         audioRef.current.play();
                         setIsPlaying(true);
                       } else {
                         audioRef.current.pause();
                         setIsPlaying(false);
                       }
                     }}
                     title={isPlaying ? "Pause" : "Play"}
                   >
                     {isPlaying ? (
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                         <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                       </svg>
                     ) : (
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                       </svg>
                     )}
                   </button>
                 </div>
                
                <div className="audio-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                    <input
                      type="range"
                      className="progress-slider"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => {
                        const newTime = parseFloat(e.target.value);
                        audioRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      step="0.1"
                    />
                  </div>
                  <div className="time-display">
                    <span className="current-time">{formatTime(currentTime)}</span>
                    <span className="duration">{formatTime(duration)}</span>
                  </div>
                </div>
                
                <audio
                  ref={audioRef}
                  src="/KURIO_hey.mp3"
                  onLoadedMetadata={() => setDuration(audioRef.current.duration)}
                  onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)}
                  onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            </div>
          </div>
          
          {/* What can you do with Kurio section */}
          <div className="kurio-action-section">
            <h2 className="kurio-action-title">Kurious about a company?</h2>
            
            <div className="input-container">
              <div className="company-search-wrapper" style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Enter company ticker (e.g., NVDA for Nvidia or MSFT for Microsoft)"
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="url-input"
                />
                <select
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  className={`country-select ${companyCountry ? 'has-value' : ''}`}
                >
                  <option value="">Where is the company based?</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  <option value="CN">China</option>
                  <option value="IN">India</option>
                  <option value="BR">Brazil</option>
                  <option value="MX">Mexico</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="NL">Netherlands</option>
                  <option value="SE">Sweden</option>
                  <option value="CH">Switzerland</option>
                  <option value="SG">Singapore</option>
                  <option value="KR">South Korea</option>
                  <option value="OTHER">Other</option>
                </select>
                <button 
                  className="submit-btn"
                  onClick={() => {
                    if (companyName.trim() && companyCountry) {
                      searchCompanyFinancials(companyName.trim(), companyCountry);
                    }
                  }}
                  disabled={!companyName.trim() || !companyCountry || searchLoading}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {/* Chat Input - Always visible */}
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Ask a question about companies or financial data..."
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              
              {/* Chat Error and Response */}
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
              
              {/* Search Error Display */}
              {searchError && (
                <div className="search-error">
                  <p>{searchError}</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : currentPage === 'about' ? (
        <About onNavigateToHome={() => {
          setCurrentPage('home');
        }} />
      ) : currentPage === 'companies' ? (
        <Companies />
      ) : currentPage === 'roles' ? (
        <Roles />
      ) : null}

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Login</h3>
            </div>
            <div className="modal-body">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modal-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modal-input"
              />
              {loginError && <p className="error-message">{loginError}</p>}
              <button onClick={handleLogin} className="modal-button">
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Data Popup */}
      <FinancialDataPopup
        isOpen={showFinancialPopup}
        onClose={() => {
          setShowFinancialPopup(false);
          setFinancialData(null);
          setSearchError('');
        }}
        financialData={financialData}
        companyName={companyName}
      />
    </div>
  );
}

export default App;
