import React, { useState, useEffect } from 'react';

const JobCarousel = () => {
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  
  const jobs = [
    'a maintenance technician',
    'a secondary school teacher',
    'a software engineer',
    'a nurse',
    'a chef',
    'an electrician',
    'an accountant',
    'a graphic designer',
    'a plumber',
    'a marketing manager',
    'a construction worker',
    'a dentist',
    'a firefighter',
    'an architect',
    'a pharmacist'
  ];

  // Create an infinite loop by duplicating the jobs array
  const infiniteJobs = [...jobs, ...jobs];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentJobIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        // When we reach the end of the infinite jobs array, reset to the beginning
        if (nextIndex >= infiniteJobs.length) {
          return 0;
        }
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [infiniteJobs.length]);

  // Ensure we always have a valid job to display
  const currentJob = infiniteJobs[currentJobIndex] || jobs[0] || 'professional';

  return (
    <div className="job-carousel-container">
      <div className="job-carousel">
        <div 
          className="job-text"
          style={{
            transform: `translateY(-${currentJobIndex * 60}px)`,
            transition: 'transform 0.5s ease-in-out'
          }}
        >
          {infiniteJobs.map((job, index) => (
            <div key={index} className="job-item">
              {job || 'professional'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobCarousel;
