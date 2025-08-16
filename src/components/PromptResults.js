import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function PromptResults({ category = 'All' }) {
  const [prompts, setPrompts] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPrompts(data);
    });
    return () => unsubscribe();
  }, []);

  const filtered = prompts
    .filter((p) => (category === 'All' ? true : p.category === category))
    .slice(0, 3);

  return (
    <div className="sidebar-results">
      {filtered.length === 0 ? (
        <p className="no-results">No prompts match the selected filters.</p>
      ) : (
        <div className="results-list">
          {filtered.map(({ id, job_title, typical_day, category: cat, createdAt }) => (
            <div key={id} className="result-item">
              <h4 className="result-title">{job_title || 'No Title'}</h4>
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



