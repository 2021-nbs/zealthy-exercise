// src/components/common/LoadingIndicator.jsx
import React from 'react';

const LoadingIndicator = ({ message = "Loading..." }) => {
  return <div className="loading-indicator">{message}</div>;
};

export default LoadingIndicator;