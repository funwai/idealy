import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';

function TrendingJobs() {
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [trendingCategories, setTrendingCategories] = useState([]);

  useEffect(() => {
    // Get recent jobs to analyze trends
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Analyze trending job titles (most mentioned)
      const jobTitleCounts = {};
      data.forEach(job => {
        const title = job.job_title?.toLowerCase().trim();
        if (title) {
          jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
        }
      });
      
      // Get top 5 trending job titles
      const topJobTitles = Object.entries(jobTitleCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }));

      // Analyze trending categories
      const categoryCounts = {};
      data.forEach(job => {
        const category = job.category || 'General';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Get top 5 trending categories
      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      setTrendingJobs(topJobTitles);
      setTrendingCategories(topCategories);
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div className="trending-sidebar">
      <h2>Trending Professions</h2>
      
      <div className="trending-section">
        <h3> Most searched job titles</h3>
        <div className="trending-list">
          {trendingJobs.map((job, index) => (
            <div key={job.title} className="trending-item">
              <span className="trending-number">{index + 1}</span>
              <span className="trending-text">{job.title}</span>
              <span className="trending-count">{job.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="trending-section">
        <h3> Popular Categories</h3>
        <div className="trending-list">
          {trendingCategories.map((cat, index) => (
            <div key={cat.category} className="trending-item">
              <span className="trending-number">{index + 1}</span>
              <span className="trending-text">{cat.category}</span>
              <span className="trending-count">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="trending-footer">
        <p>Based on recent submissions</p>
        <small>Updates in real-time</small>
      </div>
    </div>
  );
}

export default TrendingJobs;
