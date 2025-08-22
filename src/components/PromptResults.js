import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

const PromptResults = ({ categoryFilter, hideResults }) => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const promptsData = [];
      querySnapshot.forEach((doc) => {
        promptsData.push({ id: doc.id, ...doc.data() });
      });
      setPrompts(promptsData);
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
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/job_thumbnails%2F${encodedFileName}?alt=media`;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (hideResults) {
    return null;
  }

  let filtered;
  if (!categoryFilter || categoryFilter === '') {
    // For 'All Categories', show all entries
    filtered = prompts;
  } else {
    // For specific categories, show top 3 only
    filtered = prompts
      .filter(prompt => prompt.category === categoryFilter)
      .slice(0, 3);
  }

  if (filtered.length === 0) {
    return <div>No entries found.</div>;
  }

  return (
    <div className="sidebar-results">
      {filtered.map((prompt) => (
        <div key={prompt.id} className="result-item">
          <div className="result-content">
            {prompt.image_url && (
              <div className="result-thumbnail">
                <img 
                  src={getImageUrl(prompt.image_url)} 
                  alt="Job thumbnail"
                  className="thumbnail-image"
                  onLoad={() => console.log('Image loaded successfully:', prompt.image_url)}
                  onError={(e) => console.error('Image failed to load:', prompt.image_url, e)}
                />
              </div>
            )}
            
            <div className="result-text">
              <div className="result-header">
                <h4 className="result-title">
                  {prompt.source ? (
                    <a 
                      href={prompt.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="result-title-link"
                    >
                      {prompt.job_title || 'Untitled'}
                    </a>
                  ) : (
                    prompt.job_title || 'Untitled'
                  )}
                </h4>
                
                <div className="result-meta">
                  <span className="result-category">Category: {prompt.category || 'General'}</span>
                  <span className="result-date">From: {prompt.createdAt?.toDate?.() 
                    ? prompt.createdAt.toDate().toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric'
                      })
                    : 'No date'
                  }</span>
                </div>
              </div>
              
              <p className="result-description">
                <strong>Typical Day:</strong> {prompt.typical_day || 'No description'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PromptResults;



