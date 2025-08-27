import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function PromptResults({ category = 'All' }) {
  const [prompts, setPrompts] = useState([]);
  const [categoryThumbnails, setCategoryThumbnails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to construct Firebase Storage URL from filename or gs:// URL
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
    
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/job_thumbnails%2F${encodeURIComponent(imageUrl)}?alt=media`;
  };

  // Fetch category thumbnails first
  useEffect(() => {
    const thumbnailsQuery = query(collection(db, 'category_thumbnails'));
    
    const unsubscribeThumbnails = onSnapshot(thumbnailsQuery, 
      (snapshot) => {
        const thumbnailsMap = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.mapped_category && data.image_url) {
            // Process the image URL to ensure it's properly formatted
            const processedImageUrl = getImageUrl(data.image_url);
            thumbnailsMap[data.mapped_category] = processedImageUrl;
          }
        });
        setCategoryThumbnails(thumbnailsMap);
      },
      (error) => {
        console.error('PromptResults: Error fetching category thumbnails:', error);
      }
    );
    
    return () => unsubscribeThumbnails();
  }, []);

  // Fetch prompts after category thumbnails are loaded
  useEffect(() => {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPrompts(data);
        setLoading(false);
      },
      (error) => {
        console.error('PromptResults: Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);

  const filtered = prompts
    .filter((p) => (category === '' ? true : p.category === category));

  return (
    <div className="sidebar-results">
      {loading ? (
        <p className="no-results">Loading recent entries...</p>
      ) : error ? (
        <p className="no-results">Error: {error}</p>
      ) : filtered.length === 0 ? (
        <p className="no-results">No prompts match the selected filters.</p>
      ) : (
        <div className="results-list">
          {filtered.map(({ id, job_title, typical_day, category: cat, createdAt, source }) => {
            const thumbnailUrl = cat ? categoryThumbnails[cat] : null;
            
            return (
              <div key={id} className="result-item">
                <div className="result-content">
                  {thumbnailUrl && (
                    <div className="result-thumbnail">
                      <img
                        src={thumbnailUrl}
                        alt={`${cat} category thumbnail`}
                        className="thumbnail-image"
                        onLoad={() => {
                          // Thumbnail loaded successfully
                        }}
                        onError={(e) => {
                          console.error('Category thumbnail failed to load:', thumbnailUrl);
                          console.error('Error details:', e);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="result-text">
                    <h4 className="result-title">
                      {source ? (
                        <a 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="result-title-link"
                        >
                          {job_title || 'No Title'}
                        </a>
                      ) : (
                        job_title || 'No Title'
                      )}
                    </h4>
                    <p className="result-typical-day"><strong>Day in the life:</strong> {typical_day || 'No description'}</p>
                    <p className="result-meta">
                      {createdAt?.seconds
                        ? new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          }).replace(/\//g, '.')
                        : 'No timestamp'}
                      {' · '}Category: {cat || 'Uncategorized'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PromptResults;



