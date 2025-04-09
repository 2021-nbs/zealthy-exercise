// src/components/steps/Step1Login.jsx
import React from 'react';
import FormField from '../common/FormField';

const Step1Login = ({ formData, handleInputChange, fieldErrors }) => {
  return (
    <div className="step-container">
      <h2>Welcome! Please start by entering your login info:</h2>
      <FormField
        name="username"
        value={formData.username}
        onChange={handleInputChange}
        required={true}
        error={fieldErrors?.username || ''}
      />
      <FormField
        name="password"
        type="password"
        value={formData.password}
        onChange={handleInputChange}
        required={true}
        error={fieldErrors?.password || ''}
      />
    </div>
  );
};

export default Step1Login;