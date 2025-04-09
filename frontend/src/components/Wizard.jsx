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
  LOCAL_STORAGE_CURRENT_STEP_KEY, // <-- Import new key
  PANEL_STEP_MAP,
} from '../constants';
import {
  parseAddressString,
  combineAddressParts,
  validateBirthdate,
  determineInitialStep,
} from '../utils/helpers';

import ProgressBar from './common/ProgressBar';
import Step1Login from './steps/Step1Login';
import StepFields from './steps/StepFields';
import Step4ThankYou from './steps/Step4ThankYou';

const INITIAL_FORM_DATA = {};

const Wizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(PANEL_STEP_MAP[1]);
  const [formId, setFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formConfig, setFormConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const doesStepHaveEnabledFields = useCallback((stepNum) => {
    if (!formConfig?.fields) return false;
    return Object.values(formConfig.fields).some(
      field => field.enabled && field.panel === stepNum
    );
  }, [formConfig]); // Depends on formConfig

  const clearSavedProgress = () => {
    localStorage.removeItem(LOCAL_STORAGE_FORM_ID_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      let finalInitialStep = PANEL_STEP_MAP[1]; // Default start step

      try {
        const config = await fetchFormConfig();
        setFormConfig(config);

        const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
        const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
        const savedStepString = localStorage.getItem(LOCAL_STORAGE_CURRENT_STEP_KEY);

        if (savedFormId && savedUsername) {
          try {
            const savedSubmission = await fetchFormSubmission(savedFormId);

            if (
              savedSubmission &&
              savedSubmission.username === savedUsername &&
              !savedSubmission.is_complete // Only restore if not completed
            ) {
              // Restore form data state
              const addressParts = parseAddressString(savedSubmission.address);
              const restoredData = {
                username: savedSubmission.username || '',
                password: '',
                streetAddress: addressParts.streetAddress,
                city: addressParts.city,
                state: addressParts.state,
                zipCode: addressParts.zipCode,
                birthdate: savedSubmission.birthdate || '',
                aboutYou: savedSubmission.about_you || '',
              };
              setFormData(restoredData);
              setFormId(savedFormId);

              // Determine initial step based on data, then check saved step
              const dataDerivedStep = determineInitialStep(savedSubmission, config);
              let stepFromStorage = null;

              if (savedStepString) {
                  const parsedStep = parseInt(savedStepString, 10);
                  // Validate saved step (must be 1, 2, or 3 for restoration)
                  if (!isNaN(parsedStep) && parsedStep >= PANEL_STEP_MAP[1] && parsedStep <= PANEL_STEP_MAP[3]) {
                     stepFromStorage = parsedStep;
                  } else {
                     console.warn(`Invalid saved step (${savedStepString}) found in localStorage. Ignoring.`);
                     localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY); // Clear invalid step
                  }
              }

              // Prioritize explicitly saved step, otherwise use data-derived step
              finalInitialStep = stepFromStorage ?? dataDerivedStep;

              console.log(`Restored progress. Data suggests step ${dataDerivedStep}. Explicitly saved step: ${stepFromStorage}. Starting at step: ${finalInitialStep}`);

            } else {
              // Mismatch or completed form, clear saved state
               console.log("Saved form ID/username found, but data mismatch or form completed. Clearing state.");
              clearSavedProgress();
              finalInitialStep = PANEL_STEP_MAP[1]; // Reset to step 1
            }
          } catch (fetchError) {
            console.error('Error fetching saved progress:', fetchError);
            setError('Could not load saved progress. Starting fresh.');
            clearSavedProgress();
            finalInitialStep = PANEL_STEP_MAP[1]; // Reset to step 1
          }
        } else {
            // No saved formId/username, ensure step is cleared too if partially saved
             clearSavedProgress(); // Ensure all keys are cleared if starting fresh
             finalInitialStep = PANEL_STEP_MAP[1];
        }
      } catch (configError) {
        console.error('Error fetching initial data:', configError);
        setError('Failed to load form configuration. Please try again later.');
        setLoading(false); // Stop loading indicator on config error
        return; // Stop execution here if config fails
      } finally {
        setCurrentStep(finalInitialStep);
        if (finalInitialStep > PANEL_STEP_MAP[1]) { // Only save if beyond step 1
             localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, finalInitialStep.toString());
        } else {
            // Ensure step is cleared if we ended up back at step 1
            localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
        }
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Runs only on mount

   const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
        ...prev,
        [name]: value,
        }));
        if (fieldErrors[name]) {
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

  // --- Validation ---
    const validateStep = (step) => {
        const errors = {};
        let isValid = true;
        if (!formConfig?.fields) return true;

        Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.enabled && fieldConfig.panel <= step) {
            if (fieldName === 'birthdate' && formData.birthdate) {
                const validation = validateBirthdate(formData.birthdate);
                if (!validation.isValid) {
                    errors.birthdate = validation.message;
                    isValid = false;
                }
            }
            if (step === 1) {
                if (!formData.username) { errors.username = 'Username is required.'; isValid = false; }
                if (!formData.password) { errors.password = 'Password is required.'; isValid = false; }
            }
            // Add other validations
        }
        });
        setFieldErrors(errors);
        return isValid;
    };

  // --- Saving Logic ---
  const saveFormData = useCallback(async (isComplete = false) => {
    if (!formConfig?.fields || isSaving) return false;
    setIsSaving(true);
    setError('');

    const submissionData = {
      username: formData.username,
      password: formData.password,
      is_complete: isComplete,
    };

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled) {
        if (fieldName === 'address') {
          submissionData.address = combineAddressParts(formData);
        } else if (fieldName === 'birthdate') {
          if (formData.birthdate) submissionData.birthdate = formData.birthdate;
        } else if (fieldName === 'aboutYou') {
          submissionData.about_you = formData.aboutYou || '';
        }
      }
    });

    try {
      let response;
      if (formId) {
        response = await updateFormSubmission(formId, submissionData);
      } else {
        response = await createFormSubmission(submissionData);
        const newFormId = response.id;
        if (newFormId) {
          setFormId(newFormId);
          localStorage.setItem(LOCAL_STORAGE_FORM_ID_KEY, newFormId);
          localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, formData.username);
        } else {
           throw new Error("API did not return a form ID on creation.");
        }
      }
      setIsSaving(false);
      return true; // Success
    } catch (error) {
      console.error('Error saving form data:', error);
      setError(`Error saving data: ${error.message || 'Please try again.'}`);
      setIsSaving(false);
      return false; // Failure
    }
  }, [formConfig, formData, formId, isSaving]);

  const handleNext = async () => {
    if (isSaving) return;

    const stepToValidate = currentStep;
    if (!validateStep(stepToValidate)) {
        console.log("Validation failed for step:", stepToValidate, fieldErrors);
        return;
    }

    let nextStep = currentStep + 1;
    while (nextStep < PANEL_STEP_MAP[4]) {
      if (doesStepHaveEnabledFields(nextStep)) break;
      nextStep++;
    }

     if (nextStep >= PANEL_STEP_MAP[4]) {
         handleSubmit(); // Treat as submit if skipping past last step
         return;
     }

    // Save progress before attempting to navigate
    const success = await saveFormData(false);
    if (success) {
      setCurrentStep(nextStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, nextStep.toString()); // <-- Save new step
    }
  };

  const handlePrevious = () => {
    if (currentStep > PANEL_STEP_MAP[1] && !isSaving) {
        let prevStep = currentStep - 1;
        while (prevStep > PANEL_STEP_MAP[1]) {
            if (doesStepHaveEnabledFields(prevStep)) break;
            prevStep--;
        }
      setCurrentStep(prevStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, prevStep.toString()); // <-- Save new step
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;

     const stepToValidate = currentStep;
    if (!validateStep(stepToValidate)) {
        setError("Please correct the errors before submitting.");
        return;
    }

    const success = await saveFormData(true); // Mark as complete
    if (success) {
      clearSavedProgress(); // Clear all keys on successful submission
      setCurrentStep(PANEL_STEP_MAP[4]);
    }
  };


  const resetForm = () => {
    clearSavedProgress(); // Clears formId, username, and currentStep keys
    setFormData(INITIAL_FORM_DATA);
    setFormId(null);
    setCurrentStep(PANEL_STEP_MAP[1]);
    setError('');
    setFieldErrors({});
  };

  const renderCurrentStep = () => {
    const stepProps = { formData, handleInputChange, formConfig, fieldErrors };
    switch (currentStep) {
      case PANEL_STEP_MAP[1]: return <Step1Login {...stepProps} />;
      case PANEL_STEP_MAP[2]: return <StepFields {...stepProps} stepNumber={2} />;
      case PANEL_STEP_MAP[3]: return <StepFields {...stepProps} stepNumber={3} />;
      case PANEL_STEP_MAP[4]: return <Step4ThankYou onRestart={resetForm} />;
      default: return <div>Invalid Step</div>;
    }
  };

   if (loading) { /* ... loading indicator ... */ }
   if (!formConfig && !loading) { /* ... config error handling ... */ }

  let lastDataStep = PANEL_STEP_MAP[1];
  if (formConfig && doesStepHaveEnabledFields(3)) lastDataStep = 3;
  else if (formConfig && doesStepHaveEnabledFields(2)) lastDataStep = 2;

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