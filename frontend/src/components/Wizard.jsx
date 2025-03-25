// src/components/Wizard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zealthy-exercise-fb2f.onrender.com';

const Wizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formId, setFormId] = useState(null);
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
              
              if (savedData.username === savedUsername && !savedData.is_complete) {
                setFormId(savedFormId);
                
                // Restore all form data fields
                const restoredData = {
                  username: savedData.username,
                  password: '', 
                  address: savedData.address || '',
                  aboutYou: savedData.about_you || '',
                  birthdate: savedData.birthdate || '',
                  streetAddress: '',
                  city: '',
                  state: '',
                  zipCode: ''
                };

                if (savedData.address) {
                  try {
                    // Split the address by commas
                    const addressParts = savedData.address.split(',').map(part => part.trim());
                    
                    // Street address is the first part
                    if (addressParts.length >= 1) {
                      restoredData.streetAddress = addressParts[0];
                    }
                    
                    if (addressParts.length >= 2) {
                      if (addressParts.length >= 2) {
                        restoredData.city = addressParts[1];
                      }
                      
                      if (addressParts.length >= 3) {
                        const stateZipPart = addressParts[2].trim();
                        const stateZipTokens = stateZipPart.split(' ').filter(Boolean);
                        
                        if (stateZipTokens.length >= 1) {
                          restoredData.state = stateZipTokens[0];
                        }
                        
                        if (stateZipTokens.length >= 2) {
                          restoredData.zipCode = stateZipTokens[1];
                        }
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
                
                const panel3Fields = Object.entries(configResponse.data.fields).filter(
                  ([_, field]) => field.enabled && field.panel === 3
                );
                
                const hasPanel3Data = panel3Fields.some(([fieldName]) => {
                  if (fieldName === 'address' && savedData.address) return true;
                  if (fieldName === 'birthdate' && savedData.birthdate) return true;
                  if (fieldName === 'aboutYou' && savedData.about_you) return true;
                  return false;
                });
                
                const panel2Fields = Object.entries(configResponse.data.fields).filter(
                  ([_, field]) => field.enabled && field.panel === 2
                );
                
                const hasPanel2Data = panel2Fields.some(([fieldName]) => {
                  if (fieldName === 'address' && savedData.address) return true;
                  if (fieldName === 'birthdate' && savedData.birthdate) return true;
                  if (fieldName === 'aboutYou' && savedData.about_you) return true;
                  return false;
                });
                
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
  }, []);

  // Update the combined address field whenever individual address components change
  useEffect(() => {
    if (loading) return;
    
    const { streetAddress, city, state, zipCode } = formData;
    
    if (streetAddress || city || state || zipCode) {
      let combinedAddress = '';
      
      if (streetAddress) {
        combinedAddress += streetAddress;
      }
      
      if (city) {
        if (combinedAddress) combinedAddress += ', ';
        combinedAddress += city;
      }
      
      if (state || zipCode) {
        if (combinedAddress) combinedAddress += ', ';
        combinedAddress += [state, zipCode].filter(Boolean).join(' ');
      }
      
      if (combinedAddress !== formData.address) {
        setFormData(prev => ({
          ...prev,
          address: combinedAddress
        }));
      }
    }
    //eslint-disable-next-line
  }, [formData.streetAddress, formData.city, formData.state, formData.zipCode, loading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveFormData = async (isComplete = false) => {
    try {
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
      if (hasValidationErrors) {
        alert('Please correct all validation errors before submitting.');
        return;
      }
      
      try {
        await saveFormData(true);
        
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
      
      handleNext();
    }
  };

  const today = new Date().toISOString().split('T')[0];
  
  const validateBirthdate = (date) => {
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
                    return <React.Fragment key={fieldName}>{renderField('address', 'Address', 'text')}</React.Fragment>;
                  } else if (fieldName === 'birthdate') {
                    return <React.Fragment key={fieldName}>{renderField('birthdate', 'Birthdate', 'date')}</React.Fragment>;
                  } else if (fieldName === 'aboutYou') {
                    return <React.Fragment key={fieldName}>{renderField('aboutYou', 'Tell us about yourself', 'textarea')}</React.Fragment>;
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
                    return <React.Fragment key={fieldName}>{renderField('address', 'Address', 'text')}</React.Fragment>;
                  } else if (fieldName === 'birthdate') {
                    return <React.Fragment key={fieldName}>{renderField('birthdate', 'Birthdate', 'date')}</React.Fragment>;
                  } else if (fieldName === 'aboutYou') {
                    return <React.Fragment key={fieldName}>{renderField('aboutYou', 'Tell us about yourself', 'textarea')}</React.Fragment>;
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