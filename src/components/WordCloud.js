import React, { useEffect, useRef } from 'react';

const WordCloud = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load WordCloud2.js script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js';
    script.async = true;
    
    script.onload = () => {
      if (window.WordCloud && canvasRef.current) {
        const skills = [
          ['Communication', 50],
          ['Leadership', 35],
          ['Problem Solving', 60],
          ['Teamwork', 30],
          ['Analytical', 40],
          ['Creativity', 25],
          ['Adaptability', 45],
          ['Time Management', 38],
          ['Technical Skills', 48],
          ['Customer Service', 28],
          ['Project Management', 42],
          ['Critical Thinking', 52],
          ['Innovation', 32],
          ['Collaboration', 36],
          ['Strategic Planning', 34],
          ['Data Analysis', 44],
          ['Negotiation', 30],
          ['Research', 26],
          ['Presentation', 28],
          ['Organization', 38]
        ];

        window.WordCloud(canvasRef.current, {
          list: skills,
          gridSize: 8,
          weightFactor: 2.5,
          fontFamily: 'Arial, sans-serif',
          color: 'random-dark',
          backgroundColor: '#ffffff',
          rotateRatio: 0.3,
          rotationSteps: 2,
          minSize: 10,
          drawOutOfBound: false,
          shrinkToFit: true
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="word-cloud-section">
      <h3>Essential Job Skills</h3>
      <canvas 
        ref={canvasRef}
        className="word-cloud-canvas"
        width="280"
        height="300"
      />
    </div>
  );
};

export default WordCloud;
