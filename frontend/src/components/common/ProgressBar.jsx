// src/components/common/ProgressBar.jsx
import React from 'react';

const TOTAL_STEPS = 4;

const ProgressBar = ({ currentStep }) => {
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