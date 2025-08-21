import React from 'react';

function HelpfulLinks() {
  const helpfulLinks = [
    {
      title: "24 Skills to Learn for Career Growth in 2025",
      url: "https://www.skillshub.com/blog/24-skills-2025",
      description: "Essential skills for staying competitive in the evolving job market"
    },
    {
      title: "Top 10 Most In-Demand Tech Careers for 2025",
      url: "https://www.lse.ac.uk/study-at-lse/executive-education/insights/articles/the-top-10-most-in-demand-tech-careers-for-2025",
      description: "LSE insights on the most promising tech career paths"
    },
    {
      title: "Most in-demand skills for jobs across multiple industries",
      url: "https://www.weforum.org",
      description: "World Economic Forum's take on in-demand skills for 2025"
    }
  ];

  return (
    <div className="trending-sidebar">
      <div className="section-title-root">
        <h2 className="section-title-hed">
          <span>Helpful Links</span>
        </h2>
      </div>
      
      <div className="trending-section">
        <h3>Career Resources</h3>
        <div className="trending-list">
          {helpfulLinks.map((link, index) => (
            <div key={index} className="trending-item">
              <span className="trending-number">{index + 1}</span>
              <div className="trending-content">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="trending-link"
                >
                  {link.title}
                </a>
                <p className="trending-description">{link.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}

export default HelpfulLinks;

