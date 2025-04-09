// src/components/steps/Step4ThankYou.jsx
import React from 'react';

const Step4ThankYou = ({ onRestart }) => {
  return (
    <div className="step-container thank-you">
      <h2>Thank You!</h2>
      <p>Your information has been submitted successfully.</p>
      <button
        type="button"
        onClick={onRestart}
        className="btn btn-primary start-again-btn"
      >
        Restart
      </button>
    </div>
  );
};

export default Step4ThankYou;