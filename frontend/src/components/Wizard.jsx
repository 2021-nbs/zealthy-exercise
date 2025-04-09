// src/components/Wizard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ... (imports remain the same)
import {
  fetchFormConfig,
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
  }, []); // No dependencies needed here as it only uses localStorage and constants

  useEffect(() => {
    const loadInitialData = async () => {
       setLoading(true);
       setError('');
       let finalInitialStep = PANEL_STEP_MAP[1];
       let restoredData = null;
       let source = "fresh"; 

       try {
         const config = await fetchFormConfig();
         setFormConfig(config);

         const savedFormDataString = localStorage.getItem(LOCAL_STORAGE_FORM_DATA_KEY);
         const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
         const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
         const savedStepString = localStorage.getItem(LOCAL_STORAGE_CURRENT_STEP_KEY);

         if (savedFormDataString) {
             try {
                 const parsedData = JSON.parse(savedFormDataString);
                 if (parsedData && typeof parsedData === 'object') {
                     console.log("Restoring formData from localStorage.");
                     restoredData = parsedData;
                     setFormData(restoredData); // Set state from local storage
                     if (savedFormId) setFormId(savedFormId); // Keep formId consistent if available
                     source = "local";
                 } else {
                     console.warn("Invalid data found in localStorage formData. Clearing.");
                     localStorage.removeItem(LOCAL_STORAGE_FORM_DATA_KEY);
                 }
             } catch (e) {
                 console.error("Error parsing formData from localStorage:", e);
                 localStorage.removeItem(LOCAL_STORAGE_FORM_DATA_KEY);
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
               console.log("Restoring formData from API.");
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
               console.log("Saved form ID/username found, but data mismatch or form completed. Clearing state.");
               clearSavedProgress();
               source = "clear";
             }
           } catch (fetchError) {
             console.error('Error fetching saved progress:', fetchError);
             setError('Could not load saved progress. Starting fresh.');
             clearSavedProgress();
             source = "clear";
           }
         }

         const dataForStepCheck = restoredData || INITIAL_FORM_DATA;
         const dataDerivedStep = config ? determineInitialStep(dataForStepCheck, config) : PANEL_STEP_MAP[1];
         let stepFromStorage = null;

         if (savedStepString) {
             const parsedStep = parseInt(savedStepString, 10);
             if (!isNaN(parsedStep) && parsedStep >= PANEL_STEP_MAP[1] && parsedStep <= PANEL_STEP_MAP[3]) {
                 stepFromStorage = parsedStep;
             } else {
                 console.warn(`Invalid saved step (${savedStepString}). Ignoring.`);
                 localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
             }
         }

         finalInitialStep = stepFromStorage ?? dataDerivedStep;

         if (source === "clear" || source === "fresh") {
              finalInitialStep = PANEL_STEP_MAP[1];
              if (source === "fresh" && !savedFormDataString) clearSavedProgress(); // Clear if truly fresh start
         }

         console.log(`Restoration source: ${source}. Data suggests step ${dataDerivedStep}. Saved step: ${stepFromStorage}. Final step: ${finalInitialStep}`);

       } catch (configError) {
         console.error('Error fetching initial data:', configError);
         setError('Failed to load form configuration. Please try again later.');
         setLoading(false);
         return;
       } finally {
         setCurrentStep(finalInitialStep);
         if (finalInitialStep > PANEL_STEP_MAP[1] && finalInitialStep < PANEL_STEP_MAP[4]) {
              localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, finalInitialStep.toString());
         } else if (finalInitialStep === PANEL_STEP_MAP[1]) {
              localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
         }
         setLoading(false);
       }
    };

    loadInitialData();
  }, [clearSavedProgress]); // Add clearSavedProgress dependency here

  useEffect(() => {
    if (!loading && !isSaving && Object.keys(formData).length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_FORM_DATA_KEY, JSON.stringify(formData));
      } catch (e) {
        console.error("Error saving form data to localStorage:", e);
      }
    }
  }, [formData, loading, isSaving]);

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
    if (!formConfig?.fields) return true;

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled && fieldConfig.panel === step) {
        if (step === PANEL_STEP_MAP[1]) {
          if (fieldName === 'username' && !formData.username) { errors.username = 'Username is required.'; isValid = false; }
          if (fieldName === 'password' && !formData.password) { errors.password = 'Password is required.'; isValid = false; }
        }
        else if (fieldName === 'birthdate' && formData.birthdate) {
          const validation = validateBirthdate(formData.birthdate);
          if (!validation.isValid) {
            errors.birthdate = validation.message;
            isValid = false;
          }
        }
      }
    });
    setFieldErrors(errors); // setFieldErrors is stable
    return isValid;
  }, [formConfig, formData]);

  const findLastEnabledStep = useCallback(() => {
     let lastStep = PANEL_STEP_MAP[1];
     for (let step = PANEL_STEP_MAP[3]; step >= PANEL_STEP_MAP[1]; step--) {
         if (doesStepHaveEnabledFields(step)) {
             lastStep = step;
             break; 
         }
     }
     return lastStep;
  }, [doesStepHaveEnabledFields]); // Depends on doesStepHaveEnabledFields

  const lastDataStep = findLastEnabledStep(); // Calculate once per render cycle
  const saveFormData = useCallback(async (isComplete = false) => {
    if (!formConfig?.fields || isSaving) return false;

    const stepToValidate = currentStep === PANEL_STEP_MAP[4] ? lastDataStep : currentStep;
    // Use the memoized validateStep now
    if (!validateStep(stepToValidate)) {
        setError("Please correct the validation errors before proceeding.");
        return false;
    }

    setIsSaving(true);
    setError('');

    const submissionData = {
      username: formData.username,
      is_complete: isComplete,
    };

    if (formConfig.fields.password?.enabled) {
      submissionData.password = formData.password;
    }

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled) {
        if (fieldName === 'address') {
          submissionData.address = combineAddressParts(formData);
        } else if (fieldName === 'birthdate' && formData.birthdate) {
          submissionData.birthdate = formData.birthdate;
        } else if (fieldName === 'aboutYou') {
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
        if (!submissionData.username) throw new Error("Username is required to create a submission.");
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
      if (isComplete) {
           clearSavedProgress();
      }
      return true;
    } catch (error) {
      console.error('Error saving form data to API:', error);
      setError(`Error saving data: ${error.message || 'Please try again.'}`);
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
      clearSavedProgress    
  ]);

  const handleNext = async () => {
    if (isSaving) return;

    if (!validateStep(currentStep)) {
        console.log("Validation failed for step:", currentStep, fieldErrors);
        return;
    }

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
      setFieldErrors({});
    } else {
        console.log("API save failed, staying on current step.");
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
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!validateStep(lastDataStep)) {
        setError("Please correct the errors on the relevant step before submitting.");
        if (currentStep !== lastDataStep) {
             setCurrentStep(lastDataStep);
             localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, lastDataStep.toString());
        }
        return;
    }

    const success = await saveFormData(true); // Mark as complete
    if (success) {
      setCurrentStep(PANEL_STEP_MAP[4]);
      setFieldErrors({});
    }
  };

  const resetForm = useCallback(() => {
    clearSavedProgress();
    setFormData(INITIAL_FORM_DATA);
    setFormId(null);
    setCurrentStep(PANEL_STEP_MAP[1]);
    setError('');
    setFieldErrors({});
  }, [clearSavedProgress]); // Dependency on the stable clearSavedProgress

  const renderCurrentStep = () => {
    const stepProps = { formData, handleInputChange, formConfig, fieldErrors };
    switch (currentStep) {
      case PANEL_STEP_MAP[1]: return <Step1Login {...stepProps} />;
      case PANEL_STEP_MAP[2]: return <StepFields {...stepProps} stepNumber={2} />;
      case PANEL_STEP_MAP[3]: return <StepFields {...stepProps} stepNumber={3} />;
      case PANEL_STEP_MAP[4]: return <Step4ThankYou onRestart={resetForm} />; // Pass memoized resetForm
      default: return <div>Invalid Step: {currentStep}</div>;
    }
  };

   if (loading) { return <div className="wizard-container"><p>Loading form...</p></div>; }
   if (!formConfig && !loading) { return <div className="wizard-container error-message"><p>Error loading form configuration. Please try refreshing.</p></div>; }

  return (
    <div className="wizard-container">
      <div className="header">
        <h1>Zealthy Coding Exercise!</h1>
        <button onClick={() => navigate('/admin')} className="admin-link">Admin</button>
      </div>

      {currentStep !== PANEL_STEP_MAP[4] && <ProgressBar currentStep={currentStep} lastDataStep={lastDataStep}/>}

      {error && <div className="error-message general-error">{error}</div>}

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