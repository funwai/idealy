import React, { useEffect, useRef } from 'react';

function About({ onNavigateToHome }) {
  // Vanta.js background effect
  const vantaRef = useRef(null);

  // Initialize Vanta.js background
  useEffect(() => {
    const initVanta = () => {
      if (window.VANTA) {
        vantaRef.current = window.VANTA.NET({
          el: "#vanta-background-about",
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

  return (
    <div className="companies-page">
      {/* Vanta.js Background Container */}
      <div id="vanta-background-about" className="vanta-background-about"></div>
      
      <div className="companies-container">
        <h1>A B O U T</h1>
        
        <section className="about-section">
          <h2>What is Kurio?</h2>
          <div className="definition-box">
            <p>
              <b>curio (Kurio, alternative spelling)</b> /ˈkjʊərɪəʊ/
              <br/>
              <b>noun</b>
              <br/>
              a rare, unusual, or intriguing object.
            </p>
          </div>
          <p>
            If you've ever been curious about what people get up to in their jobs or how companies generate their revenue, we've got you covered.
            KURIO is an AI-powered platform that helps unravel what it's really like to work in different professions and how companies make money.
            We use a combination of publicly available data and user-generated content to provide real insights into various jobs and careers.
            We also use publicly available financial data to help you understand how companies make money and how they spend it.
            Lastly, we also allow you to share your own experiences and insights with the community so we can shed more light on the world of work and business.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            Our mission is simple - clarity on what people do in different roles, and on how companies generate and spend money.
            We want you to be conscious of the purpose of different roles to a company, and ultimately to share with you authentic facts and figures about work!
          </p>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature">
              <h3>Learn from other KURIO-us minds</h3>
              <p>Users can dive deep into the daily lives of people in different roles as well as learn about how companies operate, without the unnecessary businss jargon</p>
            </div>
            <div className="feature">
              <h3>Contribute to the mission</h3>
              <p>If you'd like to contribute to KURIO's mission, <span className="clickable-text" onClick={onNavigateToHome}>tell us</span> about your day-to-day and your job title. That's all we need - Our AI will read your entry and pick out the bits we need to inform other KURIO-us minds</p>
            </div>
            <div className="feature">
              <h3>Learn from the open web</h3>
              <p>At KURIO we are always searching for up-to-date descriptions of roles and companies. Once we find them we'll also add them to our knowledge-base - Have a browse and hear from the people who are already in the roles themselves</p>
            </div>
            <div className="feature">
              <h3>Learn about Companies</h3>
              <p>Whether it is providing plumbing services or selling ice cream - our knowledge-base of companies is ever-expanding. Learn how companies make and spend money - and understand your role as a consumer in the process</p>
            </div>
          </div>
        </section>

        


      </div>
    </div>
  );
}

export default About;
