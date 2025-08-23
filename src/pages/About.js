import React from 'react';

function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>About KURIO</h1>
        
        <section className="about-section">
          <h2>What is Kurio?</h2>
          <p>
          <b>curio (Kurio, alternative spelling)</b> /ˈkjʊərɪəʊ/
          <br/>
          <b>noun</b>
          <br/>
          a rare, unusual, or intriguing object.
          <br/>
            Kurio is a platform that helps you discover what it's really like to work in different professions. 
            Ever wondered what a day in the life of a software engineer, data scientist, or product manager looks like? 
            We provide real insights into various careers through user-generated content and curated resources.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            We believe that understanding what a job actually entails is crucial for making informed career decisions. 
            Our mission is to bridge the gap between job titles and reality by sharing authentic, day-to-day experiences 
            from people working in various fields.
          </p>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature">
              <h3>📝 Share Your Experience</h3>
              <p>Contribute by describing your typical workday and what your job really involves.</p>
            </div>
            <div className="feature">
              <h3>🔍 Explore Careers</h3>
              <p>Browse through different professions and read about real experiences from people in the field.</p>
            </div>
            <div className="feature">
              <h3>📊 Trending Insights</h3>
              <p>See which careers are gaining interest and discover emerging job opportunities.</p>
            </div>
            <div className="feature">
              <h3>🎥 Multimedia Content</h3>
              <p>Watch videos and explore resources that provide deeper insights into various careers.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Why IdealY?</h2>
          <ul className="benefits-list">
            <li><strong>Authentic Content:</strong> Real experiences from real people, not corporate descriptions</li>
            <li><strong>Diverse Perspectives:</strong> Insights from various industries and career levels</li>
            <li><strong>Up-to-Date Information:</strong> Current trends and evolving job landscapes</li>
            <li><strong>Community-Driven:</strong> Built by and for people exploring career options</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Get Involved</h2>
          <p>
            Whether you're exploring career options or want to share your professional journey, 
            IdealY is here to help. Start by browsing existing entries or contribute your own 
            experience to help others make informed career decisions.
          </p>
          <div className="cta-buttons">
            <button className="cta-button primary" onClick={() => window.history.back()}>
              Back to Home
            </button>
            <button className="cta-button secondary" onClick={() => window.scrollTo(0, 0)}>
              Share Your Experience
            </button>
          </div>
        </section>

        <section className="about-section">
          <h2>Contact Us</h2>
          <p>
            Have questions, suggestions, or want to collaborate? We'd love to hear from you!
          </p>
          <div className="contact-info">
            <p>📧 Email: <a href="mailto:contact@idealy.com">contact@idealy.com</a></p>
            <p>🐦 Twitter: <a href="https://twitter.com/idealy" target="_blank" rel="noopener noreferrer">@idealy</a></p>
            <p>💼 LinkedIn: <a href="https://linkedin.com/company/idealy" target="_blank" rel="noopener noreferrer">IdealY</a></p>
          </div>
        </section>
      </div>
      
      <div className="photo-credit">
        <p>
          Background photo by Hristo Fidanov from Pexels: 
          <a 
            href="https://www.pexels.com/photo/milky-way-galaxy-during-nighttime-1252890/" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            https://www.pexels.com/photo/milky-way-galaxy-during-nighttime-1252890/
          </a>
        </p>
      </div>
    </div>
  );
}

export default About;
