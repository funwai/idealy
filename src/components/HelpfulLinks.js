import React, { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

function HelpfulLinks() {
  const [companyDetails, setCompanyDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'company_details'),
      limit(10)
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

  if (loading) {
    return (
      <div className="loading-placeholder">Loading companies...</div>
    );
  }

  return (
    <>
      <div className="section-title-root">
        <h2 className="section-title-hed">The Companies</h2>
      </div>
      
      <div className="companies-content">
        {companyDetails.length === 0 ? (
          <div className="empty-placeholder">No companies found</div>
        ) : (
          companyDetails.map((company) => (
            <div key={company.id} className="company-item">
              <div className="company-image">
                {company.image_url && getImageUrl(company.image_url) && (
                  <img 
                    src={getImageUrl(company.image_url)} 
                    alt={`${company.company_name || 'Company'} Diagram`}
                    className="company-thumbnail clickable-image"
                    onClick={() => setSelectedImage({
                      src: getImageUrl(company.image_url),
                      alt: `${company.company_name || 'Company'} Diagram`,
                      companyName: company.company_name || 'Company'
                    })}
                    onLoad={() => {
                      // Company image loaded successfully
                    }}
                    onError={(e) => console.error('Company image failed to load:', company.image_url, e)}
                  />
                )}
              </div>
              
              <div className="company-text">
                <h4 className="company-name">
                  {company.company_name || 'Company Name'}
                </h4>
                
                {company.description && (
                  <p className="company-description">
                    {company.description}
                  </p>
                )}
                
                {company.industry && (
                  <p className="company-industry">
                    Industry: {company.industry}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Image Popup Modal */}
      {selectedImage && (
        <div className="image-popup-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-popup-header">
              <h3>{selectedImage.companyName}</h3>
              <button 
                className="image-popup-close"
                onClick={() => setSelectedImage(null)}
              >
                ×
              </button>
            </div>
            <div className="image-popup-body">
              <img 
                src={selectedImage.src} 
                alt={selectedImage.alt}
                className="popup-image"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HelpfulLinks;

