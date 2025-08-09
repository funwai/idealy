import React, { useState } from 'react';
import './App.css';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth'
import PromptInput from './pages/PromptInput';
import PromptResults from './components/PromptResults';
import EmbedsBox from './components/EmbedsBox';

function App() {
  const [userInput, setUserInput] = useState('');

  const handleGoClick = () => {
  console.log("Idea-ly, what would not be a problem?: ", userInput);
  setUserInput(''); // Clear input after clicking Go
  // Later, you can send this to Firebase or show a new page
  };
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
      <div className="login-wrapper">
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
          <p>Welcome, {user.email}</p>
        )}
      </div>

      <div className="page-layout">
        <aside className="sidebar">
          <h2>Idea-ly these should not be a problem!</h2>

          <label>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Tech">Tech</option>
            <option value="Health">Health</option>
            <option value="Education">Education</option>
          </select>

          <PromptResults category={selectedCategory || 'All'} />
        </aside>

        <main className="main-content">
          <h1 className="main-message">Idea-ly, what would not be a problem?</h1>
          <PromptInput categoryFilter={selectedCategory || 'All'} hideResults />
          <div className="embeds-divider-outside" />
          <EmbedsBox urls={["https://trends.google.com/trending?geo=GB"]} />
        </main>
      </div>
    </div>
  );
}

export default App;
