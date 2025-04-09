// src/components/steps/StepFields.jsx (Generic component for Step 2 & 3)
import React from 'react';
import FormField from '../common/FormField';
import AddressFields from '../common/AddressFields';
import { getTodayDateString } from '../../utils/helpers'; // Add this import

const StepFields = ({ stepNumber, formData, formConfig, handleInputChange, fieldErrors }) => {
  const fieldsToRender = Object.entries(formConfig.fields || {})
    .filter(([_, fieldConfig]) => fieldConfig.enabled && fieldConfig.panel === stepNumber);

  const stepTitles = {
    2: "Please fill out the following information:",
    3: "Almost there! Just a little more info..."
  }

  return (
    <div className="step-container">
       <h2>{stepTitles[stepNumber]}</h2>
      {fieldsToRender.map(([fieldName]) => {
        if (fieldName === 'address') {
          return (
            <AddressFields
              key={fieldName}
              formData={formData}
              onChange={handleInputChange}
              required={true}
              errors={{
                streetAddress: fieldErrors.streetAddress,
                city: fieldErrors.city,
                state: fieldErrors.state,
                zipCode: fieldErrors.zipCode
              }}
            />
          );
        } else if (fieldName === 'birthdate') {
          return (
            <FormField
              key={fieldName}
              name="birthdate"
              type="date"
              value={formData.birthdate || ''}
              onChange={handleInputChange}
              required={true}
              error={fieldErrors.birthdate || ''}
              max={getTodayDateString()} // Using the imported function
            />
          );
        } else if (fieldName === 'aboutYou') {
          return (
            <FormField
              key={fieldName}
              name="aboutYou"
              type="textarea"
              value={formData.aboutYou}
              onChange={handleInputChange}
              required={true}
              error={fieldErrors.aboutYou || ''}
            />
          );
        }
        // Add more specific field types here if needed
        return null; // Or a default FormField for unexpected types
      })}
       {fieldsToRender.length === 0 && <p>No fields configured for this step.</p>}
    </div>
  );
};

export default StepFields;