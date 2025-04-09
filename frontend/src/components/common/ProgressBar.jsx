// src/components/common/ProgressBar.jsx
import React from 'react';

const TOTAL_STEPS = 4; // Including Thank You

const ProgressBar = ({ currentStep }) => {
  // Calculate progress percentage slightly differently to ensure it reaches 100% at step 4 visually
  const progressPercent = currentStep > 1
      ? ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100
      : 0;

  return (
    <div className="progress-bar">
      <div
        className="progress-indicator"
        style={{ width: `${progressPercent}%`}}
      ></div>
      <div className="progress-steps">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`progress-step ${currentStep >= step ? 'active' : ''}`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;