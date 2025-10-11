import React from 'react';
import WordCloud from '../components/WordCloud';
import '../App.css';

function Skills() {
  return (
    <div className="companies-page">
      <div className="companies-container">
        <h1>T H E  S K I L L S</h1>
        
        <div className="skills-content">
          <p className="skills-description">
            Explore the most important skills across different roles and industries
          </p>
          <WordCloud />
        </div>
      </div>
    </div>
  );
}

export default Skills;

