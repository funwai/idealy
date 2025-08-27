import React, { useState } from 'react';

const Companies = () => {
  const [selectedCategory, setSelectedCategory] = useState('');

  // Dummy company data
  const dummyCompanies = [
    {
      id: 1,
      name: "TechCorp Solutions",
      industry: "Technology",
      description: "Leading software development company specializing in AI and machine learning solutions.",
      employees: "500-1000",
      location: "San Francisco, CA",
      founded: "2018",
      logo: "https://via.placeholder.com/90x90/0E2B4D/FFFFFF?text=TC"
    },
    {
      id: 2,
      name: "Green Energy Co.",
      industry: "Renewable Energy",
      description: "Sustainable energy solutions provider focused on solar and wind power technologies.",
      employees: "200-500",
      location: "Austin, TX",
      founded: "2020",
      logo: "https://via.placeholder.com/90x90/00AA44/FFFFFF?text=GE"
    },
    {
      id: 3,
      name: "HealthTech Innovations",
      industry: "Healthcare",
      description: "Revolutionary medical device company developing next-generation diagnostic tools.",
      employees: "100-250",
      location: "Boston, MA",
      founded: "2019",
      logo: "https://via.placeholder.com/90x90/FF6B6B/FFFFFF?text=HT"
    },
    {
      id: 4,
      name: "FinServe Pro",
      industry: "Financial Services",
      description: "Digital banking platform offering innovative financial solutions for businesses.",
      employees: "300-750",
      location: "New York, NY",
      founded: "2017",
      logo: "https://via.placeholder.com/90x90/4ECDC4/FFFFFF?text=FP"
    },
    {
      id: 5,
      name: "EduTech Solutions",
      industry: "Education",
      description: "Online learning platform providing interactive courses and skill development programs.",
      employees: "150-400",
      location: "Seattle, WA",
      founded: "2021",
      logo: "https://via.placeholder.com/90x90/45B7D1/FFFFFF?text=ES"
    },
    {
      id: 6,
      name: "Retail Dynamics",
      industry: "Retail",
      description: "E-commerce platform connecting local retailers with customers worldwide.",
      employees: "250-600",
      location: "Chicago, IL",
      founded: "2016",
      logo: "https://via.placeholder.com/90x90/96CEB4/FFFFFF?text=RD"
    }
  ];

  // Get unique categories for the filter
  const categories = ['All Categories', ...new Set(dummyCompanies.map(company => company.industry))];

  // Filter companies based on selected category
  const filteredCompanies = selectedCategory === '' || selectedCategory === 'All Categories' 
    ? dummyCompanies 
    : dummyCompanies.filter(company => company.industry === selectedCategory);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  return (
    <div className="companies-page">
      <div className="companies-container">
        <h1>T h e C o m p a n i e s</h1>
        
        {/* Category Filter */}
        <div className="companies-filter">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select 
            id="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="category-select"
          >
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="companies-list">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="company-item">
              <div className="company-content">
                <div className="company-logo">
                  <img
                    src={company.logo}
                    alt={`${company.name} logo`}
                    className="logo-image"
                  />
                </div>
                <div className="company-text">
                  <h3 className="company-name">{company.name}</h3>
                  <span className="company-industry">{company.industry}</span>
                  <p className="company-description">{company.description}</p>
                  <div className="company-meta">
                    <span className="meta-item">
                      {company.employees} employees
                    </span>
                    <span className="meta-separator">·</span>
                    <span className="meta-item">
                      {company.location}
                    </span>
                    <span className="meta-separator">·</span>
                    <span className="meta-item">
                      Founded {company.founded}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Companies;


