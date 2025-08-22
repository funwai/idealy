import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

function TheCompanies() {
  const [companyDetails, setCompanyDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    console.log('Setting up Firebase query for company_details collection...');
    
    const q = query(
      collection(db, 'company_details'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Query snapshot received, size:', querySnapshot.size);
      const companies = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Company document ID:', doc.id);
        console.log('Company data:', data);
        console.log('Available fields:', Object.keys(data));
        companies.push({
          id: doc.id,
          ...data
        });
      });
      console.log('All companies:', companies);
      setCompanyDetails(companies);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching company details:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a gs:// URL, convert to download URL
    if (imageUrl.startsWith('gs://')) {
      const parts = imageUrl.split('/');
      const bucketName = parts[2];
      const fileName = parts.slice(3).join('/');
      const encodedFileName = encodeURIComponent(fileName);
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFileName}?alt=media`;
    }
    
    // If it's just a filename, construct the full path
    const projectId = 'funwai-resume';
    const bucketName = 'funwai-resume.appspot.com';
    const encodedFileName = encodeURIComponent(imageUrl);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/company_details%2F${encodedFileName}?alt=media`;
  };

  if (loading) {
    return <div>Loading company details...</div>;
  }

  if (companyDetails.length === 0) {
    return <div>No company details available yet.</div>;
  }

  return (
    <div className="sidebar-results">
      {companyDetails.map((company) => (
        <div key={company.id} className="result-item">
          <div className="result-content">
            {company.image_url && (
              <div className="result-thumbnail">
                <img 
                  src={getImageUrl(company.image_url)} 
                  alt={`${company.company_name || 'Company'} Diagram`}
                  className="thumbnail-image clickable-image"
                  onClick={() => setSelectedImage({
                    src: getImageUrl(company.image_url),
                    alt: `${company.company_name || 'Company'} Diagram`,
                    companyName: company.company_name || 'Company'
                  })}
                  onLoad={() => console.log('Company image loaded successfully:', company.image_url)}
                  onError={(e) => console.error('Company image failed to load:', company.image_url, e)}
                />
              </div>
            )}
            
            <div className="result-text">
              <div className="result-header">
                <h4 className="result-title">
                  {company.company_name || 'Company Name'}
                </h4>
              </div>
              
              {company.description && (
                <div className="result-description">
                  {company.description}
                </div>
              )}
              
              <div className="result-meta">
                {company.industry && (
                  <span className="result-category">Industry: {company.industry}</span>
                )}
                <span className="result-date">From: {company.createdAt?.toDate?.() 
                  ? company.createdAt.toDate().toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    })
                  : 'No date'
                }</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
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
    </div>
  );
}

export default TheCompanies;

