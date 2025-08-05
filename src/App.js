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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

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

      <div className="w-64 bg-white text-black p-4">
        <h2 className="text-xl font-bold mb-4">Filters</h2>

        {/* Category Dropdown */}
        <label className="block mb-2 font-semibold">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        >
          <option value="">All Categories</option>
          <option value="General">General</option>
          <option value="Tech">Tech</option>
          <option value="Health">Health</option>
          <option value="Education">Education</option>
        </select>

        {/* Date Picker */}
        <label className="block mb-2 font-semibold">Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-2 border rounded"
        />
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
