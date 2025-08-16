import React, { useState, useEffect } from 'react';
import './App.css';
import { auth } from './firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import PromptInput from './pages/PromptInput';
import EmbedsBox from './components/EmbedsBox';
import JobCarousel from './components/JobCarousel';
import PromptResults from './components/PromptResults';
import TrendingJobs from './components/TrendingJobs';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

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
            <img src={require('./KURIO_name_separate_Logo.png')} alt="Logo" className="header-logo" />
          </div>
          <div className="header-center">
            <p className="header-slogan">Ever Wonder What People Get Up To in Their Jobs?</p>
          </div>
          <div className="header-right">
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

      <div className="page-layout">
        <aside className="sidebar">
          <h2>Recent Entries</h2>
          <label>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Tech">Tech</option>
            <option value="Health">Health</option>
            <option value="Transport">Transport</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Education">Education</option>
          </select>
          <PromptResults category={selectedCategory || 'All'} />
        </aside>
        
        <main className="main-content">
          <div className="main-header-section">
            <div className="main-message-container">
              <span className="main-message-text">A day in the life of</span>
              <JobCarousel />
            </div>
            <PromptInput categoryFilter={'All'} hideResults />
          </div>
          <EmbedsBox urls={[
            "https://www.youtube.com/embed/U-lYLSlYU1o?si=VUkTlemQ7wPjhQV3",
            "https://www.youtube.com/embed/Ipe9xJCfuTM?si=3uphlTlbHkoeXy_3",
            "https://www.youtube.com/embed/PTKlLYht2Jk?si=yVgwe1u5zSanLaCQ",
            "https://www.youtube.com/embed/Y-yOE-RgX0M?si=Nv83hJd7B5JHKmuL"
          ]} />
        </main>

        <aside className="trending-sidebar">
          <TrendingJobs />
        </aside>
      </div>
    </div>
  );
}

export default App;
