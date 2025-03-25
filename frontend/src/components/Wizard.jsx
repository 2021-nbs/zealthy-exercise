// src/components/Wizard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Removed unused Link import
import axios from 'axios';

const API_URL = 'https://zealthy-exercise-fb2f.onrender.com';

const Wizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formId, setFormId] = useState(null); // Store the form ID after initial save
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    address: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    birthdate: '',
    aboutYou: ''
  });
  const [formConfig, setFormConfig] = useState({
    fields: {
      address: { enabled: true, panel: 2 },
      birthdate: { enabled: true, panel: 2 },
      aboutYou: { enabled: true, panel: 3 }
    }
  });

  // Fetch form configuration and check for existing progress
  useEffect(() => {
    const fetchConfigAndProgress = async () => {
      setLoading(true);
      try {
        // Get configuration
        const configResponse = await axios.get(`${API_URL}/api/form-config`);
        setFormConfig(configResponse.data);
        
        // Check for saved form ID in localStorage
        const savedFormId = localStorage.getItem('formId');
        const savedUsername = localStorage.getItem('username');
        
        if (savedFormId && savedUsername) {
          try {
            // Attempt to retrieve the form data
            const response = await axios.get(`${API_URL}/api/form-submission/${savedFormId}`);
            
            if (response.data) {
              // Restore form data
              const savedData = response.data;
              
              // Only restore if the username matches (security check)
              if (savedData.username === savedUsername && !savedData.is_complete) {
                setFormId(savedFormId);
                
                // Restore all form data fields
                const restoredData = {
                  username: savedData.username,
                  password: '', // Don't restore password for security reasons
                  address: savedData.address || '',
                  aboutYou: savedData.about_you || '',
                  birthdate: savedData.birthdate || ''
                };
                
                // If address exists, try to parse it into components
                if (savedData.address) {
                  try {
                    // First, try to extract the zip code using a regex pattern
                    // This looks for 5-digit or 5+4 digit zip code patterns
                    const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
                    const zipMatch = savedData.address.match(zipRegex);
                    
                    if (zipMatch) {
                      restoredData.zipCode = zipMatch[0];
                    }
                    
                    // Now parse the rest of the address
                    const addressParts = savedData.address.split(',');
                    
                    // Street address is the first part
                    if (addressParts.length >= 1) {
                      restoredData.streetAddress = addressParts[0].trim();
                    }
                    
                    // City and state parsing
                    if (addressParts.length >= 2) {
                      // The last part should contain city, state, and zip
                      const lastPart = addressParts[addressParts.length - 1].trim();
                      
                      // Remove the zip code if found to isolate city and state
                      const cityStatePart = zipMatch 
                        ? lastPart.replace(zipRegex, '').trim() 
                        : lastPart;
                      
                      const cityStateParts = cityStatePart.split(' ');
                      
                      // City is usually everything before the state
                      if (cityStateParts.length >= 2) {
                        // Assume state is the last word before zip (or last word if no zip)
                        restoredData.state = cityStateParts[cityStateParts.length - 1].trim();
                        // City is all words before the state
                        restoredData.city = cityStateParts
                          .slice(0, cityStateParts.length - 1)
                          .join(' ')
                          .trim();
                      } else if (cityStateParts.length === 1) {
                        // If only one part, assume it's the city
                        restoredData.city = cityStateParts[0].trim();
                      }
                    }
                    
                    console.log('Parsed address into components:', {
                      streetAddress: restoredData.streetAddress,
                      city: restoredData.city,
                      state: restoredData.state,
                      zipCode: restoredData.zipCode
                    });
                  } catch (e) {
                    console.warn('Could not parse address components', e);
                  }
                }
                
                setFormData(restoredData);
                
                // Determine which step to restore to based on the admin configuration
                // Check if any panel 3 fields have data
                const hasPanel3Data = Object.entries(formConfig.fields).some(([fieldName, field]) => {
                  if (field.enabled && field.panel === 3) {
                    if (fieldName === 'address' && savedData.address) return true;
                    if (fieldName === 'birthdate' && savedData.birthdate) return true;
                    if (fieldName === 'aboutYou' && savedData.about_you) return true;
                  }
                  return false;
                });
                
                // Check if any panel 2 fields have data
                const hasPanel2Data = Object.entries(formConfig.fields).some(([fieldName, field]) => {
                  if (field.enabled && field.panel === 2) {
                    if (fieldName === 'address' && savedData.address) return true;
                    if (fieldName === 'birthdate' && savedData.birthdate) return true;
                    if (fieldName === 'aboutYou' && savedData.about_you) return true;
                  }
                  return false;
                });
                
                // Set the current step based on the data available
                if (hasPanel3Data) {
                  setCurrentStep(3);
                } else if (hasPanel2Data) {
                  setCurrentStep(2);
                } else {
                  setCurrentStep(1);
                }
                
                console.log('Restored form progress', restoredData);
              }
            }
          } catch (error) {
            console.error('Error fetching saved progress:', error);
            // Clear localStorage if there was an error (e.g., the form might have been deleted)
            localStorage.removeItem('formId');
            localStorage.removeItem('username');
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfigAndProgress();
  }, [formConfig.fields]); // Added missing dependency

  // Update the combined address field whenever individual address components change
  useEffect(() => {
    const { streetAddress, city, state, zipCode } = formData;
    const combinedAddress = [
      streetAddress,
      city ? (city + (state || zipCode ? ',' : '')) : '',
      state,
      zipCode
    ].filter(Boolean).join(' ');
    
    setFormData(prev => ({
      ...prev,
      address: combinedAddress
    }));
  }, [formData.streetAddress, formData.city, formData.state, formData.zipCode, formData]); // Added missing dependency

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Function to save form data to the database
  const saveFormData = async (isComplete = false) => {
    try {
      // Prepare form data based on enabled fields only
      const submissionData = {
        username: formData.username,
        password: formData.password,
        isComplete: isComplete
      };
      
      // Only include fields that are enabled and have values
      Object.entries(formConfig.fields).forEach(([fieldName, field]) => {
        if (field.enabled) {
          // For the birthdate field, only include if it has a value
          if (fieldName === 'birthdate') {
            if (formData[fieldName]) {
              submissionData[fieldName] = formData[fieldName];
            }
          } else {
            submissionData[fieldName] = formData[fieldName];
          }
        }
      });
      
      let response;
      
      if (formId) {
        // Update existing record
        response = await axios.put(`${API_URL}/api/update-form/${formId}`, submissionData);
      } else {
        // Create new record
        response = await axios.post(`${API_URL}/api/submit-form`, submissionData);
        // Store the form ID for future updates
        const newFormId = response.data.id;
        setFormId(newFormId);
        
        // Save to localStorage for progress tracking
        localStorage.setItem('formId', newFormId);
        localStorage.setItem('username', formData.username);
      }
      
      return response;
    } catch (error) {
      console.error('Error saving form data:', error);
      throw error;
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      try {
        // Save current step data
        await saveFormData(false);
        // Proceed to next step
        setCurrentStep(currentStep + 1);
      } catch (error) {
        alert('Error saving data. Please try again.');
        console.error('Error saving form data:', error);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if any enabled fields have validation errors
    let hasValidationErrors = false;
    if (formConfig.fields.birthdate && formConfig.fields.birthdate.enabled && formData.birthdate) {
      const birthdateValidation = validateBirthdate(formData.birthdate);
      if (!birthdateValidation.valid) {
        hasValidationErrors = true;
        // If we're on the panel with the birthdate, don't proceed
        if ((currentStep === 2 && formConfig.fields.birthdate.panel === 2) || 
            (currentStep === 3 && formConfig.fields.birthdate.panel === 3)) {
          alert(birthdateValidation.message);
          return;
        }
      }
    }
    
    if (currentStep === 3) {
      // Final validation before submission
      if (hasValidationErrors) {
        alert('Please correct all validation errors before submitting.');
        return;
      }
      
      try {
        // Mark form as complete in the final submission
        await saveFormData(true);
        
        // Clear the saved progress since the form is complete
        localStorage.removeItem('formId');
        localStorage.removeItem('username');
        
        setCurrentStep(4); // Move to thank you page
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form. Please try again.');
      }
    } else {
      // If moving from panel 2 to 3, validate birthdate if it's on panel 2
      if (currentStep === 2 && formConfig.fields.birthdate && 
          formConfig.fields.birthdate.enabled && 
          formConfig.fields.birthdate.panel === 2 && 
          formData.birthdate) {
        const birthdateValidation = validateBirthdate(formData.birthdate);
        if (!birthdateValidation.valid) {
          alert(birthdateValidation.message);
          return;
        }
      }
      
      // Call handleNext which will save and advance
      handleNext();
    }
  };

  // Get today's date in YYYY-MM-DD format for date input max attribute
  const today = new Date().toISOString().split('T')[0];
  
  const validateBirthdate = (date) => {
    // Return valid if date is empty
    if (!date) {
      return { valid: true, message: '' };
    }
    
    // Check if date is not in the future
    const selectedDate = new Date(date);
    const currentDate = new Date();
    
    if (isNaN(selectedDate.getTime())) {
      return { valid: false };
    }
    
    if (selectedDate > currentDate) {
      return { valid: false };
    }
    
    // Additional validation could be added here (e.g., minimum age)
    return { valid: true, message: '' };
  };
  
  const renderField = (fieldName, label, type = 'text', rows = null) => {
    const field = formConfig.fields[fieldName];
    
    if (!field || !field.enabled) {
      return null;
    }

    if (fieldName === 'address') {
      return (
        <div className="address-fields">
          <h3>Address Information</h3>
          <div className="form-group">
            <label htmlFor="streetAddress">Street Address</label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="address-row">
            <div className="form-group state-field">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group zip-field">
              <label htmlFor="zipCode">Zip Code</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div className="form-group">
          <label htmlFor={fieldName}>{label}</label>
          <textarea
            id={fieldName}
            name={fieldName}
            value={formData[fieldName]}
            onChange={handleInputChange}
            rows={rows || 5}
            required
          ></textarea>
        </div>
      );
    }
    
    if (type === 'date') {
      const birthdateValidation = validateBirthdate(formData[fieldName]);
      
      return (
        <div className="form-group">
          <label htmlFor={fieldName}>{label}</label>
          <input
            type={type}
            id={fieldName}
            name={fieldName}
            value={formData[fieldName]}
            onChange={handleInputChange}
            max={today}
            required
          />
          {formData[fieldName] && !birthdateValidation.valid && (
            <div className="field-error">{birthdateValidation.message}</div>
          )}
        </div>
      );
    }

    return (
      <div className="form-group">
        <label htmlFor={fieldName}>{label}</label>
        <input
          type={type}
          id={fieldName}
          name={fieldName}
          value={formData[fieldName]}
          onChange={handleInputChange}
          required
        />
      </div>
    );
  };

  const resetForm = () => {
    // Reset form data
    setFormData({
      username: '',
      password: '',
      address: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      birthdate: '',
      aboutYou: ''
    });
    // Reset form ID
    setFormId(null);
    // Clear saved progress
    localStorage.removeItem('formId');
    localStorage.removeItem('username');
    // Return to first step
    setCurrentStep(1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-container">
            <h2>Welcome! Please start by entering your login info:</h2>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="step-container">
            <h2>Please fill out the following information:</h2>
            {Object.entries(formConfig.fields).map(([fieldName, field]) => {
              if (field.enabled && field.panel === 2) {
                if (fieldName === 'address') {
                  return renderField('address', 'Address', 'text');
                } else if (fieldName === 'birthdate') {
                  return renderField('birthdate', 'Birthdate', 'date');
                } else if (fieldName === 'aboutYou') {
                  return renderField('aboutYou', 'Tell us about yourself', 'textarea');
                }
                return null;
              }
              return null;
            })}
          </div>
        );
      case 3:
        return (
          <div className="step-container">
            <h2>Almost there! Just a little more info...</h2>
            {Object.entries(formConfig.fields).map(([fieldName, field]) => {
              if (field.enabled && field.panel === 3) {
                if (fieldName === 'address') {
                  return renderField('address', 'Address', 'text');
                } else if (fieldName === 'birthdate') {
                  return renderField('birthdate', 'Birthdate', 'date');
                } else if (fieldName === 'aboutYou') {
                  return renderField('aboutYou', 'Tell us about yourself', 'textarea');
                }
                return null;
              }
              return null;
            })}
          </div>
        );
      case 4:
        return (
          <div className="step-container thank-you">
            <h2>Thank You!</h2>
            <p>Your information has been submitted successfully.</p>
            <button 
              type="button" 
              onClick={resetForm} 
              className="btn btn-primary start-again-btn"
            >
              Restart
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="wizard-container">
        <div className="header">
          <h1>Zealthy Coding Exercise!</h1>
        </div>
        <div className="loading-indicator">Loading your form...</div>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      <div className="header">
        <h1>Zealthy Coding Exercise!</h1>
        <button onClick={() => navigate('/admin')} className="admin-link">Admin</button>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-indicator" 
          style={{ 
            width: currentStep === 1 
              ? '0%' 
              : `calc(${((currentStep - 1) / 3) * 98}% + 1%)` 
          }}
        ></div>
        <div className="progress-steps">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step} 
              className={`progress-step ${currentStep >= step ? 'active' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {renderStep()}
        
        <div className="buttons-container">
          {currentStep > 1 && currentStep < 4 && (
            <button type="button" onClick={handlePrevious} className="btn btn-secondary">
              Previous
            </button>
          )}
          
          {currentStep < 3 && (
            <button type="submit" className="btn btn-primary">
              Next
            </button>
          )}
          
          {currentStep === 3 && (
            <button type="submit" className="btn btn-success">
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Wizard;