import React, { useState } from 'react';

const Home = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="home-container">
      {/* Login button or form in top-right */}
      <div className="login-wrapper">
        {!showLogin ? (
          <button className="login-button" onClick={() => setShowLogin(true)}>
            Login
          </button>
        ) : (
          <div className="login-form">
            <h2>Login</h2>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button className="login-submit">Submit</button>
            <button className="form-cancel" onClick={() => setShowLogin(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Centered message */}
      <h1 className="main-message">
        In an ideal world, Idea-ly, what would not be a problem?
      </h1>
    </div>
  );
};

export default Home;
