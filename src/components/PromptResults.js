import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function PromptResults({ category = 'All' }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          {filtered.map(({ id, job_title, typical_day, category: cat, createdAt, source }) => (
            <div key={id} className="result-item">
              <h4 className="result-title">
                {job_title || 'No Title'}
                {source && (
                  <a 
                    href={source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-link"
                    title="View source"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
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
          ))}
        </div>
      )}
    </div>
  );
}

export default PromptResults;



