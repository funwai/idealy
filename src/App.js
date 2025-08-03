import React, { useState } from 'react';
import './App.css';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth'
import PromptInput from './pages/PromptInput';;

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

      <div className="flex flex-col items-center justify-center h-screen bg-[#0000CC] text-white px-4">
        {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-lora text-center mb-6">
            Idea-ly, what would not be a problem?
          </h1>

        {/* Prompt input and Go button below */}
        <div className="flex gap-2">
          <PromptInput />
        </div>
      </div>
    </div>
  );
}

export default App;
