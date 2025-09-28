import React, { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const Companies = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [companyDetails, setCompanyDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'company_details'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const companies = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        companies.push({
          id: doc.id,
          ...data
        });
      });
      setCompanyDetails(companies);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching company details:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get unique categories for the filter
  const categories = ['All Categories', ...new Set(companyDetails.map(company => company.industry).filter(Boolean))];

  // Filter companies based on selected category
  const filteredCompanies = selectedCategory === '' || selectedCategory === 'All Categories' 
    ? companyDetails 
    : companyDetails.filter(company => company.industry === selectedCategory);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's already a full HTTP URL, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a gs:// URL, convert it to HTTP download URL
    if (imageUrl.startsWith('gs://')) {
      // Extract bucket and path from gs:// URL
      const gsUrl = imageUrl.replace('gs://', '');
      const [bucket, ...pathParts] = gsUrl.split('/');
      const path = pathParts.join('/');
      
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
    
    // If it's just a filename, construct the Firebase Storage URL
    const projectId = 'funwai-resume';
    const bucketName = `${projectId}.firebasestorage.app`;
    
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/company_images%2F${encodeURIComponent(imageUrl)}?alt=media`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return null;
    
    // If it's a Firestore Timestamp object
    if (dateValue.seconds) {
      const date = new Date(dateValue.seconds * 1000);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }
    
    // If it's already a string, return as is
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }
    
    return null;
  };

  const formatEmployeeCount = (employeeCount) => {
    if (!employeeCount) return null;
    
    // Convert to number if it's a string
    const count = typeof employeeCount === 'string' ? parseInt(employeeCount) : employeeCount;
    
    if (isNaN(count) || count <= 0) return null;
    
    // Round to nearest thousand
    const rounded = Math.round(count / 1000) * 1000;
    
    // Format with commas
    const formatted = rounded.toLocaleString();
    
    return `approx. ${formatted} employees`;
  };

  if (loading) {
    return (
      <div className="companies-page">
        <div className="companies-container">
          <h1>T h e C o m p a n i e s</h1>
          <div className="loading-placeholder">Loading companies...</div>
        </div>
      </div>
    );
  }

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
          {filteredCompanies.length === 0 ? (
            <div className="empty-placeholder">No companies found</div>
          ) : (
            filteredCompanies.map((company) => (
              <div key={company.id} className="company-item">
                <div className="company-content">
                  <div className="company-image">
                    {company.image_url && getImageUrl(company.image_url) && (
                      <img
                        src={getImageUrl(company.image_url)}
                        alt={`${company.company_name || 'Company'} Diagram`}
                        className="company-thumbnail clickable-image"
                        onClick={() => {
                          // You can add a modal popup here if needed
                          window.open(getImageUrl(company.image_url), '_blank');
                        }}
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                        onError={(e) => console.error('Company image failed to load:', company.image_url, e)}
                      />
                    )}
                  </div>
                  <div className="company-text">
                    <h3 className="company-name">{company.company_name || 'Company Name'}</h3>
                    {company.industry && (
                      <span className="company-industry">{company.industry}</span>
                    )}
                    {company.description && (
                      <p className="company-description">{company.description}</p>
                    )}
                    
                    {/* Employee count and date */}
                    {(company.no_employees || company.as_at) && (
                      <div className="company-meta-small">
                        {company.no_employees && formatEmployeeCount(company.no_employees) && (
                          <span className="meta-small-item">
                            {formatEmployeeCount(company.no_employees)}
                          </span>
                        )}
                        {company.no_employees && formatEmployeeCount(company.no_employees) && company.as_at && formatDate(company.as_at) && (
                          <span className="meta-small-separator"> • </span>
                        )}
                        {company.as_at && formatDate(company.as_at) && (
                          <span className="meta-small-item">
                            as at {formatDate(company.as_at)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="company-meta">
                      {company.employees && (
                        <>
                          <span className="meta-item">
                            {company.employees} employees
                          </span>
                          <span className="meta-separator">·</span>
                        </>
                      )}
                      {company.location && (
                        <>
                          <span className="meta-item">
                            {company.location}
                          </span>
                          <span className="meta-separator">·</span>
                        </>
                      )}
                      {company.founded && (
                        <span className="meta-item">
                          Founded {company.founded}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Companies;


