// src/components/Wizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchFormConfig,
  fetchFormSubmission,
  createFormSubmission,
  updateFormSubmission,
} from '../services/api';
import {
  LOCAL_STORAGE_FORM_ID_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  PANEL_STEP_MAP,
} from '../constants';
import {
  parseAddressString,
  combineAddressParts,
  validateBirthdate,
  determineInitialStep,
} from '../utils/helpers';

import ProgressBar from './common/ProgressBar';
import LoadingIndicator from './common/LoadingIndicator';
import Step1Login from './steps/Step1Login';
import StepFields from './steps/StepFields'; // Reusable for step 2 & 3
import Step4ThankYou from './steps/Step4ThankYou';

const INITIAL_FORM_DATA = {
  username: '',
  password: '',
  // address: '', // We will derive this only when saving
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  birthdate: '',
  aboutYou: '',
};

const Wizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(PANEL_STEP_MAP[1]);
  const [formId, setFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // For general errors
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formConfig, setFormConfig] = useState(null); // Initialize as null
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}); // For field-level validation

  // --- Data Fetching and Initialization ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await fetchFormConfig();
        setFormConfig(config);

        const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
        const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);

        if (savedFormId && savedUsername) {
          try {
            const savedSubmission = await fetchFormSubmission(savedFormId);

            if (
              savedSubmission &&
              savedSubmission.username === savedUsername &&
              !savedSubmission.is_complete
            ) {
              // Restore state
              const addressParts = parseAddressString(savedSubmission.address);
              const restoredData = {
                username: savedSubmission.username || '',
                password: '', // Don't restore password
                streetAddress: addressParts.streetAddress,
                city: addressParts.city,
                state: addressParts.state,
                zipCode: addressParts.zipCode,
                birthdate: savedSubmission.birthdate || '',
                aboutYou: savedSubmission.about_you || '', // Map snake_case
              };
              setFormData(restoredData);
              setFormId(savedFormId);
              const initialStep = determineInitialStep(savedSubmission, config);
              setCurrentStep(initialStep);
              console.log('Restored form progress to step:', initialStep, restoredData);
            } else {
              // Data mismatch or form completed, clear saved state
              clearSavedProgress();
            }
          } catch (fetchError) {
            console.error('Error fetching saved progress:', fetchError);
            setError('Could not load saved progress. Starting fresh.');
            clearSavedProgress(); // Clear potentially invalid keys
          }
        }
      } catch (configError) {
        console.error('Error fetching initial data:', configError);
        setError('Failed to load form configuration. Please try again later.');
        // Keep loading true or handle error state appropriately
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Runs only on mount

  // --- Input Handling ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // --- Validation ---
  const validateStep = (step) => {
    const errors = {};
    let isValid = true;

    if (!formConfig?.fields) return true; // Cannot validate without config

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      // Validate only fields relevant to the current or previous steps
      if (fieldConfig.enabled && fieldConfig.panel <= step) {
        // Specific Validations
        if (fieldName === 'birthdate' && formData.birthdate) {
          const validation = validateBirthdate(formData.birthdate);
          if (!validation.isValid) {
            errors.birthdate = validation.message;
            isValid = false;
          }
        }
        // Add other field validations here if needed (e.g., required for step 1)
        if (step === 1) {
           if (!formData.username) { errors.username = 'Username is required.'; isValid = false; }
           if (!formData.password) { errors.password = 'Password is required.'; isValid = false; }
        }
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  // --- Saving Logic ---
  const saveFormData = useCallback(async (isComplete = false) => {
    if (!formConfig?.fields || isSaving) return; // Prevent saving without config or during save

    setIsSaving(true);
    setError(''); // Clear previous general errors

    // Prepare data payload, only include enabled fields
    const submissionData = {
      username: formData.username,
      // Password might not need to be saved on every step, only initially?
      // Consider API requirements. Let's include it for now as per original.
      password: formData.password, // BE CAREFUL WITH PASSWORD HANDLING
      is_complete: isComplete,
    };

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled) {
        if (fieldName === 'address') {
          // Combine parts only if the address field itself is enabled
          submissionData.address = combineAddressParts(formData);
        } else if (fieldName === 'birthdate') {
          // Only include if it has a value
          if (formData.birthdate) submissionData.birthdate = formData.birthdate;
        } else if (fieldName === 'aboutYou') {
          submissionData.about_you = formData.aboutYou || ''; // Map to snake_case
        }
         // Add other direct mappings if necessary
      }
    });

    try {
      let response;
      if (formId) {
        response = await updateFormSubmission(formId, submissionData);
        console.log('Form updated:', response);
      } else {
        response = await createFormSubmission(submissionData);
        console.log('Form created:', response);
        const newFormId = response.id; // Assuming API returns { id: ... }
        if (newFormId) {
          setFormId(newFormId);
          localStorage.setItem(LOCAL_STORAGE_FORM_ID_KEY, newFormId);
          localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, formData.username);
        } else {
           throw new Error("API did not return a form ID on creation.");
        }
      }
      setIsSaving(false);
      return true; // Indicate success
    } catch (error) {
      console.error('Error saving form data:', error);
      setError(`Error saving data: ${error.message || 'Please try again.'}`);
      setIsSaving(false);
      return false; // Indicate failure
    }
  }, [formConfig, formData, formId, isSaving]); // Dependencies for useCallback


  // --- Navigation Logic ---
  const handleNext = async () => {
    if (isSaving) return;

    const stepToValidate = currentStep; // Validate the step we are leaving
    if (!validateStep(stepToValidate)) {
        console.log("Validation failed for step:", stepToValidate, fieldErrors);
        return; // Stop if validation fails
    }

    // Determine the next logical step based on config
    let nextStep = currentStep + 1;
    // Skip step 2 or 3 if no fields are enabled for them
    while (nextStep < PANEL_STEP_MAP[4]) {
      const hasFields = Object.values(formConfig?.fields ?? {}).some(
        f => f.enabled && f.panel === nextStep
      );
      if (hasFields) break; // Found a step with fields
      nextStep++;
    }

     if (nextStep >= PANEL_STEP_MAP[4]) {
         // If we would skip past step 3, treat as submit
         handleSubmit();
         return;
     }

    // Save progress before moving
    const success = await saveFormData(false);
    if (success) {
      setCurrentStep(nextStep);
    } else {
      // Error is set within saveFormData
    }
  };

  const handlePrevious = () => {
    if (currentStep > PANEL_STEP_MAP[1] && !isSaving) {
         // Determine the previous logical step based on config
        let prevStep = currentStep - 1;
        while (prevStep > PANEL_STEP_MAP[1]) { // Don't skip step 1
            const hasFields = Object.values(formConfig?.fields ?? {}).some(
            f => f.enabled && f.panel === prevStep
            );
            if (hasFields) break; // Found a step with fields
            prevStep--;
        }
      setCurrentStep(prevStep);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); // Prevent default form submission if triggered by button
    if (isSaving) return;

    // Final validation of all relevant steps up to the current one
     const stepToValidate = currentStep; // Validate the final data step
    if (!validateStep(stepToValidate)) {
        setError("Please correct the errors before submitting.");
        console.log("Validation failed for final submission:", fieldErrors);
        return;
    }

    // Save final data
    const success = await saveFormData(true);
    if (success) {
      clearSavedProgress();
      setCurrentStep(PANEL_STEP_MAP[4]); // Move to Thank You
    } else {
       // Error is set within saveFormData
    }
  };

  const clearSavedProgress = () => {
    localStorage.removeItem(LOCAL_STORAGE_FORM_ID_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
  };

  const resetForm = () => {
    clearSavedProgress();
    setFormData(INITIAL_FORM_DATA);
    setFormId(null);
    setCurrentStep(PANEL_STEP_MAP[1]);
    setError('');
    setFieldErrors({});
  };

  // --- Rendering Logic ---
  const renderCurrentStep = () => {
    // Pass fieldErrors down to step components if they need to display them
    const stepProps = { formData, handleInputChange, formConfig, fieldErrors };

    switch (currentStep) {
      case PANEL_STEP_MAP[1]:
        return <Step1Login {...stepProps} />;
      case PANEL_STEP_MAP[2]:
        return <StepFields {...stepProps} stepNumber={2} />;
      case PANEL_STEP_MAP[3]:
        return <StepFields {...stepProps} stepNumber={3} />;
      case PANEL_STEP_MAP[4]:
        return <Step4ThankYou onRestart={resetForm} />;
      default:
        return <div>Invalid Step</div>;
    }
  };

  // --- Main Render ---
  if (loading) {
    return (
      <div className="wizard-container">
        <div className="header"><h1>Zealthy Coding Exercise!</h1></div>
        <LoadingIndicator message="Loading your form..." />
      </div>
    );
  }

   if (!formConfig) {
    // Handle case where config failed to load but loading is false
     return (
      <div className="wizard-container">
        <div className="header"><h1>Zealthy Coding Exercise!</h1></div>
        <div className="error-message">
          {error || "Failed to load form configuration. Cannot display the wizard."}
        </div>
         <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
   }

  // Determine if current step is the last data entry step based on config
  let lastDataStep = 1;
  if (Object.values(formConfig.fields).some(f => f.enabled && f.panel === 3)) lastDataStep = 3;
  else if (Object.values(formConfig.fields).some(f => f.enabled && f.panel === 2)) lastDataStep = 2;


  return (
    <div className="wizard-container">
      <div className="header">
        <h1>Zealthy Coding Exercise!</h1>
        <button onClick={() => navigate('/admin')} className="admin-link">Admin</button>
      </div>

      {currentStep !== PANEL_STEP_MAP[4] && <ProgressBar currentStep={currentStep} />}

      {error && <div className="error-message general-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {renderCurrentStep()}

        <div className="buttons-container">
          {currentStep > PANEL_STEP_MAP[1] && currentStep < PANEL_STEP_MAP[4] && (
            <button type="button" onClick={handlePrevious} className="btn btn-secondary" disabled={isSaving}>
              Previous
            </button>
          )}

          {currentStep < lastDataStep && currentStep < PANEL_STEP_MAP[4] && (
             // Use onClick for next to handle async saving/validation before navigation
            <button type="button" onClick={handleNext} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Next'}
            </button>
          )}

          {currentStep === lastDataStep && currentStep < PANEL_STEP_MAP[4] && (
            <button type="submit" className="btn btn-success" disabled={isSaving}>
              {isSaving ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Wizard;