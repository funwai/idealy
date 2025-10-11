import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { auth } from './firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import About from './pages/About';
import Companies from './pages/Companies';
import Roles from './pages/Roles';
import Skills from './pages/Skills';
import TextType from './components/TextType';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  
  // Kurio input state (weblink or PDF)
  const [weblink, setWeblink] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('weblink'); // 'weblink' or 'pdf'
  
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
              href="#skills" 
              className={`skills-link ${currentPage === 'skills' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('skills');
              }}
            >
              Skills
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
                  text={["k u r i o", "Understand businesses", "Follow the money", "Stay Kurious"]}
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
            <h2 className="kurio-action-title">What can you do with Kurio?</h2>
            
            <div className="upload-method-toggle">
              <button 
                className={`toggle-btn ${uploadMethod === 'weblink' ? 'active' : ''}`}
                onClick={() => setUploadMethod('weblink')}
              >
                Add Weblink
              </button>
              <button 
                className={`toggle-btn ${uploadMethod === 'pdf' ? 'active' : ''}`}
                onClick={() => setUploadMethod('pdf')}
              >
                Upload PDF
              </button>
            </div>
            
            {uploadMethod === 'weblink' ? (
              <div className="input-container">
                <div className="input-wrapper">
                              <input
                    type="url"
                    placeholder="Enter a URL (e.g., https://example.com)"
                    value={weblink}
                    onChange={(e) => setWeblink(e.target.value)}
                    className="url-input"
                  />
                            <button 
                    className="submit-btn"
                    onClick={() => {
                      if (weblink.trim()) {
                        console.log('Submitting weblink:', weblink);
                        // Add your submission logic here
                        setWeblink('');
                      }
                    }}
                    disabled={!weblink.trim()}
                  >
                    Submit
                            </button>
                          </div>
                        </div>
            ) : (
              <div className="input-container">
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    accept=".pdf"
                    id="pdf-upload"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    className="file-input"
                  />
                  <label htmlFor="pdf-upload" className="file-label">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                    {pdfFile ? pdfFile.name : 'Choose PDF file'}
                  </label>
                      <button 
                    className="submit-btn"
                    onClick={() => {
                      if (pdfFile) {
                        console.log('Submitting PDF:', pdfFile.name);
                        // Add your submission logic here
                        setPdfFile(null);
                      }
                    }}
                    disabled={!pdfFile}
                  >
                    Submit
                      </button>
                </div>
              </div>
            )}
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
      ) : currentPage === 'skills' ? (
        <Skills />
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
    </div>
  );
}

export default App;
