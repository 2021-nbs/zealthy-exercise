// src/components/Wizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {fetchFormConfig,
  fetchFormSubmission,
  createFormSubmission,
  updateFormSubmission,
} from '../services/api';
import {
  LOCAL_STORAGE_FORM_ID_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_CURRENT_STEP_KEY,
  LOCAL_STORAGE_FORM_DATA_KEY,
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
// Helper function to check if a value is considered "blank" (null, undefined, or empty string after trimming)
const isBlank = (value) => {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
};

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
  }, [formConfig]);

  const clearSavedProgress = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_FORM_ID_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
    localStorage.removeItem(LOCAL_STORAGE_FORM_DATA_KEY);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
       setLoading(true);
       setError('');
       let finalInitialStep = PANEL_STEP_MAP[1];
       let restoredData = null;
       let source = "fresh";
       let localConfig = null;

       try {
         localConfig = await fetchFormConfig();
         setFormConfig(localConfig);
         const savedFormDataString = localStorage.getItem(LOCAL_STORAGE_FORM_DATA_KEY);
         const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
         const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
         const savedStepString = localStorage.getItem(LOCAL_STORAGE_CURRENT_STEP_KEY);

         if (savedFormDataString) {
             try {
                 const parsedData = JSON.parse(savedFormDataString);
                 if (parsedData && typeof parsedData === 'object' && Object.keys(parsedData).length > 0) {
                     restoredData = parsedData;
                     setFormData(restoredData);
                     if (savedFormId) setFormId(savedFormId);
                     source = "local";
                 } else {
                     console.warn("Invalid or empty data found in localStorage formData. Clearing.");
                     clearSavedProgress();
                 }
             } catch (e) {
                 console.error("Error parsing formData from localStorage:", e);
                 clearSavedProgress();
             }
         }

         if (source !== "local" && savedFormId && savedUsername) {
           try {
             const savedSubmission = await fetchFormSubmission(savedFormId);
             if (
               savedSubmission &&
               savedSubmission.username === savedUsername &&
               !savedSubmission.is_complete
             ) {
               const addressParts = parseAddressString(savedSubmission.address);
               restoredData = {
                 username: savedSubmission.username || '',
                 password: '',
                 streetAddress: addressParts.streetAddress || '',
                 city: addressParts.city || '',
                 state: addressParts.state || '',
                 zipCode: addressParts.zipCode || '',
                 birthdate: savedSubmission.birthdate || '',
                 aboutYou: savedSubmission.about_you || '',
               };
               setFormData(restoredData);
               setFormId(savedFormId);
               source = "api";
             } else {
               clearSavedProgress();
               setFormData(INITIAL_FORM_DATA);
               setFormId(null);
               source = "clear";
             }
           } catch (fetchError) {
             console.error('Error fetching saved progress:', fetchError);
             setError('Could not load saved progress. Starting fresh.');
             clearSavedProgress();
             setFormData(INITIAL_FORM_DATA);
             setFormId(null);
             source = "clear";
           }
         }

         const dataForStepCheck = restoredData || INITIAL_FORM_DATA;
         const dataDerivedStep = localConfig ? determineInitialStep(dataForStepCheck, localConfig) : PANEL_STEP_MAP[1];
         let stepFromStorage = null;

         if (savedStepString) {
             const parsedStep = parseInt(savedStepString, 10);
             if (Object.values(PANEL_STEP_MAP).includes(parsedStep) && parsedStep < PANEL_STEP_MAP[4]) {
                 stepFromStorage = parsedStep;
             } else {
                 console.warn(`Invalid saved step (${savedStepString}). Ignoring.`);
                 localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
             }
         }

         finalInitialStep = stepFromStorage ?? dataDerivedStep;

         if (source === "clear" || source === "fresh") {
              finalInitialStep = PANEL_STEP_MAP[1];
              if (source === "fresh" && !savedFormDataString && !savedFormId) {
                  clearSavedProgress();
              }
         }

         if (finalInitialStep >= PANEL_STEP_MAP[4]) {
             console.warn(`Initial load determined step ${finalInitialStep}, resetting to 1.`);
             finalInitialStep = PANEL_STEP_MAP[1];
             clearSavedProgress();
             setFormData(INITIAL_FORM_DATA);
             setFormId(null);
         }
       } catch (configError) {
         console.error('Error fetching form configuration:', configError);
         setError('Failed to load form configuration. Please try again later.');
         setLoading(false);
         return;
       } finally {
         setCurrentStep(finalInitialStep);
         if (finalInitialStep > PANEL_STEP_MAP[1] && finalInitialStep < PANEL_STEP_MAP[4]) {
              localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, finalInitialStep.toString());
         } else {
              localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
         }
         setLoading(false);
       }
    };
    loadInitialData();
  }, [clearSavedProgress]);

  useEffect(() => {
    if (
        !loading &&
        !isSaving &&
        Object.keys(formData).length > 0 &&
        currentStep !== PANEL_STEP_MAP[4]
       )
    {
      try {
        localStorage.setItem(LOCAL_STORAGE_FORM_DATA_KEY, JSON.stringify(formData));
      } catch (e) {
        console.error("Error saving form data to localStorage:", e);
      }
    } else if (currentStep === PANEL_STEP_MAP[4]) {
        console.log("On Thank You page (Step 4), preventing save to localStorage.");
    }
  }, [formData, loading, isSaving, currentStep]);

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

const validateStep = useCallback((step) => {
  const errors = {};
  let isValid = true;
  if (!formConfig?.fields) {
      console.warn("Validation skipped: formConfig not loaded.");
      return true; 
  }

  Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
    // Only validate fields that are ENABLED for the CURRENT step being validated
    if (fieldConfig.enabled && fieldConfig.panel === step) {
      if (fieldName === 'username') {
        if (isBlank(formData.username)) { errors.username = 'Username is required.'; isValid = false; }
      } else if (fieldName === 'password') {
         if (isBlank(formData.password)) { errors.password = 'Password is required.'; isValid = false; }
      } else if (fieldName === 'address') {
        if (isBlank(formData.streetAddress)) { errors.streetAddress = 'Street Address is required.'; isValid = false; }
        if (isBlank(formData.city)) { errors.city = 'City is required.'; isValid = false; }
        if (isBlank(formData.state)) { errors.state = 'State is required.'; isValid = false; }
        if (isBlank(formData.zipCode)) { errors.zipCode = 'Zip Code is required.'; isValid = false; }
      } else if (fieldName === 'birthdate') {
        if (isBlank(formData.birthdate)) {
          errors.birthdate = 'Birthdate is required.';
          isValid = false;
        } else {
          const validation = validateBirthdate(formData.birthdate);
          if (!validation.isValid) {
            errors.birthdate = validation.message;
            isValid = false;
          }
        }
      } else if (fieldName === 'aboutYou') {
         if (isBlank(formData.aboutYou)) { errors.aboutYou = 'About You is required.'; isValid = false; }
      }
    }
  });
  setFieldErrors(errors); 
  return isValid;
}, [formConfig, formData]);

  const findLastEnabledStep = useCallback(() => {
     let lastStep = PANEL_STEP_MAP[1];
     if (!formConfig?.fields) return lastStep;
     for (let step = PANEL_STEP_MAP[3]; step >= PANEL_STEP_MAP[1]; step--) {
         if (doesStepHaveEnabledFields(step)) {
             lastStep = step;
             break;
         }
     }
     return lastStep;
  }, [formConfig, doesStepHaveEnabledFields]);

  const lastDataStep = findLastEnabledStep();

  const saveFormData = useCallback(async (isComplete = false) => {
    if (!formConfig?.fields || isSaving) {
        console.warn("Save prevented: Already saving or formConfig not ready.");
        return false;
    }
    const stepToValidate = isComplete ? lastDataStep : currentStep;
    if (!validateStep(stepToValidate)) {
        setError("Please correct the errors indicated below.");
        return false;
    }

    setIsSaving(true);
    setError(''); 

    const submissionData = {
      username: formData.username,
      password: formData.password,
      is_complete: isComplete,
    };

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled && fieldName !== 'username' && fieldName !== 'password') {
        if (fieldName === 'address') {
          submissionData.address = combineAddressParts(formData);
        } else if (fieldName === 'birthdate') {
           // Send null if blank, otherwise send the value
           submissionData.birthdate = isBlank(formData.birthdate) ? null : formData.birthdate;
        } else if (fieldName === 'aboutYou') {
           // Send empty string if blank/undefined
          submissionData.about_you = formData.aboutYou || '';
        }
      }
    });

    try {
      let response;
      const currentFormId = formId || localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);

      if (currentFormId) {
        response = await updateFormSubmission(currentFormId, submissionData);
      } else {
        if (!submissionData.username || !submissionData.password) {
             throw new Error("Username and Password are required to create a submission.");
        }
        response = await createFormSubmission(submissionData);
        const newFormId = response?.id;
        if (newFormId) {
          setFormId(newFormId);
          localStorage.setItem(LOCAL_STORAGE_FORM_ID_KEY, newFormId);
          localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, formData.username);
        } else {
           console.error("API did not return a form ID on creation.", response);
           throw new Error("API did not return a form ID on creation.");
        }
      }
      setIsSaving(false);
      
      if (isComplete) {
           clearSavedProgress();
      }
      return true;

    } catch (apiError) {
      console.error('Error saving form data to API:', apiError);
      let errorMessage = 'Error saving data. Please try again.';
      if (apiError.response?.data?.message) {
          errorMessage = `Error saving data: ${apiError.response.data.message}`;
      } else if (apiError.message) {
         errorMessage = `Error saving data: ${apiError.message}`;
      }
      setError(errorMessage);
      setIsSaving(false);
      return false;
    }
  }, [
      formConfig,
      formData,
      formId,
      isSaving,
      currentStep,
      lastDataStep,
      validateStep,
      clearSavedProgress,
  ]);

  const handleNext = async () => {
    if (isSaving) return;
    if (!validateStep(currentStep)) {
        setError("Please fill in all required fields for this step."); // Set general error
        return;
    }
    setError('');

    let nextStep = currentStep + 1;
    while (nextStep < PANEL_STEP_MAP[4]) {
      if (doesStepHaveEnabledFields(nextStep)) break;
      nextStep++;
    }
     if (nextStep >= PANEL_STEP_MAP[4]) {
         handleSubmit();
         return;
     }
    const success = await saveFormData(false);

    if (success) {
      setCurrentStep(nextStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, nextStep.toString());
      setFieldErrors({}); // Clear specific field errors when moving step
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
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, prevStep.toString());
      setFieldErrors({});
      setError(''); // Clear general errors when navigating back
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!validateStep(lastDataStep)) {
        setError("Please correct the errors indicated below before submitting.");
        if (currentStep !== lastDataStep) {
             setCurrentStep(lastDataStep);
             localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, lastDataStep.toString());
        }
        return; // Stop submission if validation fails
    }
    // Clear general error if validation passes
    setError('');
    const success = await saveFormData(true);

    if (success) {
      setFieldErrors({});
      setError('');
      setCurrentStep(PANEL_STEP_MAP[4]);
    }
  };

  const resetForm = useCallback(() => {
    clearSavedProgress();
    setFormData(INITIAL_FORM_DATA);
    setFormId(null);
    setCurrentStep(PANEL_STEP_MAP[1]);
    setError('');
    setFieldErrors({});
  }, [clearSavedProgress]);

  const renderCurrentStep = () => {
    const stepProps = {
        formData,
        handleInputChange,
        formConfig,
        fieldErrors, // Pass fieldErrors down to steps
    };
    switch (currentStep) {
      case PANEL_STEP_MAP[1]: return <Step1Login {...stepProps} />;
      case PANEL_STEP_MAP[2]: return <StepFields {...stepProps} stepNumber={2} />;
      case PANEL_STEP_MAP[3]: return <StepFields {...stepProps} stepNumber={3} />;
      case PANEL_STEP_MAP[4]: return <Step4ThankYou onRestart={resetForm} />;
      default:
          console.error("Attempting to render invalid step:", currentStep);
          return <div className="error-message">Invalid Step Detected. Please refresh or <button onClick={resetForm}>start over</button>.</div>;
    }
  };

   if (loading) {
       return <div className="wizard-container"><p>Loading form...</p></div>;
   }
   if (!formConfig && !loading) {
       return <div className="wizard-container error-message"><p>Error loading form configuration. Please try refreshing.</p></div>;
   }

  return (
    <div className="wizard-container">
      <div className="header">
        <h1>Zealthy Coding Exercise!</h1>
        <button onClick={() => navigate('/admin')} className="admin-link">Admin</button>
      </div>

      {currentStep < PANEL_STEP_MAP[4] && <ProgressBar currentStep={currentStep} lastDataStep={lastDataStep}/>}
      {error && <div className="general-error">{error}</div>}

      <div>
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
            <button type="button" onClick={handleSubmit} className="btn btn-success" disabled={isSaving}>
              {isSaving ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wizard;