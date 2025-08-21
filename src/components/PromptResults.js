import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function PromptResults({ category = 'All' }) {
  const [prompts, setPrompts] = useState([]);
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

  useEffect(() => {
    console.log('PromptResults: Fetching data from Firestore...');
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('PromptResults: Received snapshot with', snapshot.docs.length, 'documents');
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log('PromptResults: Processed data:', data);
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
    .filter((p) => (category === 'All' ? true : p.category === category))
    .slice(0, 3);

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
          {filtered.map(({ id, job_title, typical_day, category: cat, createdAt, source, image_url }) => {
            console.log('Rendering entry:', { id, job_title, image_url, source });
            return (
              <div key={id} className="result-item">
                <div className="result-content">
                                     {image_url && (
                     <div className="result-thumbnail">
                       <img
                         src={getImageUrl(image_url)}
                         alt={job_title || 'Job thumbnail'}
                         className="thumbnail-image"
                         onLoad={() => {
                           console.log('Image loaded successfully:', getImageUrl(image_url));
                         }}
                         onError={(e) => {
                           console.error('Image failed to load:', getImageUrl(image_url));
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
                        ? new Date(createdAt.seconds * 1000).toLocaleString()
                        : 'No timestamp'}
                      {' · '}Category: {cat}
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



