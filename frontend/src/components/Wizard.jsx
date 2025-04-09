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
    console.log("Clearing saved progress from localStorage.");
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
         console.log("Wizard Mount: Fetching config...");
         localConfig = await fetchFormConfig();
         setFormConfig(localConfig);

         console.log("Wizard Mount: Checking localStorage...");
         const savedFormDataString = localStorage.getItem(LOCAL_STORAGE_FORM_DATA_KEY);
         const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
         const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
         const savedStepString = localStorage.getItem(LOCAL_STORAGE_CURRENT_STEP_KEY);

         if (savedFormDataString) {
             try {
                 const parsedData = JSON.parse(savedFormDataString);
                 if (parsedData && typeof parsedData === 'object' && Object.keys(parsedData).length > 0) {
                     console.log("Restoring formData from localStorage.");
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
             console.log(`Fetching submission ${savedFormId} for user ${savedUsername}...`);
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
               console.log("Saved form ID/username found, but data mismatch, form completed, or fetch failed. Clearing potentially stale state.");
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

         console.log(`Restoration source: ${source}. Data suggests step ${dataDerivedStep}. Saved step: ${stepFromStorage}. Final step: ${finalInitialStep}`);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        console.log(`Saving formData to localStorage for step ${currentStep}`);
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

  // Update the validateStep function in Wizard.jsx
const validateStep = useCallback((step) => {
  const errors = {};
  let isValid = true;
  if (!formConfig?.fields) {
      console.warn("Validation skipped: formConfig not loaded.");
      return true; // Can't validate without config
  }

  console.log(`Validating step ${step} for required fields`);
  Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
    // Only validate fields that are ENABLED for the CURRENT step being validated
    if (fieldConfig.enabled && fieldConfig.panel === step) {

      // Handle specific field names and their corresponding formData keys
      if (fieldName === 'username') {
        if (isBlank(formData.username)) { errors.username = 'Username is required.'; isValid = false; }
      } else if (fieldName === 'password') {
         if (isBlank(formData.password)) { errors.password = 'Password is required.'; isValid = false; }
      } else if (fieldName === 'address') {
        // If 'address' is enabled, check all its constituent parts with specific error messages
        if (isBlank(formData.streetAddress)) { errors.streetAddress = 'Street Address is required.'; isValid = false; }
        if (isBlank(formData.city)) { errors.city = 'City is required.'; isValid = false; }
        if (isBlank(formData.state)) { errors.state = 'State is required.'; isValid = false; }
        if (isBlank(formData.zipCode)) { errors.zipCode = 'Zip Code is required.'; isValid = false; }
      } else if (fieldName === 'birthdate') {
        // Check if required first
        if (isBlank(formData.birthdate)) {
          errors.birthdate = 'Birthdate is required.';
          isValid = false;
        } else {
          // If not blank, perform existing format validation
          const validation = validateBirthdate(formData.birthdate);
          if (!validation.isValid) {
            // Use the specific validation error message from the helper function
            errors.birthdate = validation.message;
            isValid = false;
          }
        }
      } else if (fieldName === 'aboutYou') {
         // Use fieldName for formData key here
         if (isBlank(formData.aboutYou)) { errors.aboutYou = 'About You is required.'; isValid = false; }
      }
      // Add checks for any other potential fields configured in Admin.jsx here
    }
  });

  if (!isValid) {
      console.log("Validation failed (required fields check):", errors);
  }
  setFieldErrors(errors); // Update field errors state
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
     console.log("Last data step determined as:", lastStep);
     return lastStep;
  }, [formConfig, doesStepHaveEnabledFields]);

  const lastDataStep = findLastEnabledStep();

  const saveFormData = useCallback(async (isComplete = false) => {
    if (!formConfig?.fields || isSaving) {
        console.warn("Save prevented: Already saving or formConfig not ready.");
        return false;
    }

    const stepToValidate = isComplete ? lastDataStep : currentStep;
    console.log(`Save attempt: Validating step ${stepToValidate}. Is Complete: ${isComplete}`);

    // *** Validation is now more stringent ***
    if (!validateStep(stepToValidate)) {
        console.log("Save prevented: Validation failed.");
        // Ensure general error reflects validation failure if needed,
        // but fieldErrors should guide the user primarily.
        setError("Please correct the errors indicated below.");
        return false;
    }

    setIsSaving(true);
    setError(''); // Clear previous general errors before trying to save

    const submissionData = {
      username: formData.username,
      password: formData.password,
      is_complete: isComplete,
    };

    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled && fieldName !== 'username' && fieldName !== 'password') {
        if (fieldName === 'address') {
          // combineAddressParts should handle potentially blank parts if validation somehow passed
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
      console.log(`Saving data. Form ID: ${currentFormId}. Data:`, submissionData);

      if (currentFormId) {
        console.log(`Updating submission ${currentFormId}`);
        response = await updateFormSubmission(currentFormId, submissionData);
      } else {
        console.log("Creating new submission");
        if (!submissionData.username || !submissionData.password) {
             throw new Error("Username and Password are required to create a submission.");
        }
        response = await createFormSubmission(submissionData);
        const newFormId = response?.id;
        if (newFormId) {
          console.log(`Submission created with ID: ${newFormId}`);
          setFormId(newFormId);
          localStorage.setItem(LOCAL_STORAGE_FORM_ID_KEY, newFormId);
          localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, formData.username);
        } else {
           console.error("API did not return a form ID on creation.", response);
           throw new Error("API did not return a form ID on creation.");
        }
      }

      console.log("API save successful.");
      setIsSaving(false);

      if (isComplete) {
           console.log("Form marked complete, clearing saved progress.");
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
      validateStep,       // validateStep dependency is key here
      clearSavedProgress,
  ]);

  const handleNext = async () => {
    if (isSaving) return;
    console.log("Next button clicked for step:", currentStep);

    // *** Validation checks current step for required fields ***
    if (!validateStep(currentStep)) {
        console.log("Cannot proceed to next: Validation failed for current step.");
        setError("Please fill in all required fields for this step."); // Set general error
        return;
    }
    // Clear general error if validation passes
    setError('');

    let nextStep = currentStep + 1;
    while (nextStep < PANEL_STEP_MAP[4]) {
      if (doesStepHaveEnabledFields(nextStep)) break;
      console.log(`Skipping step ${nextStep} as it has no enabled fields.`);
      nextStep++;
    }

     if (nextStep >= PANEL_STEP_MAP[4]) {
         console.log("Next step is Thank You page or beyond, triggering submit.");
         handleSubmit();
         return;
     }

    console.log(`Attempting to save progress before moving to step ${nextStep}...`);
    const success = await saveFormData(false);

    if (success) {
      console.log(`Save successful. Moving to step ${nextStep}.`);
      setCurrentStep(nextStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, nextStep.toString());
      setFieldErrors({}); // Clear specific field errors when moving step
    } else {
        console.log("API save failed, staying on current step.");
        // Error message should already be set by saveFormData or validation
    }
  };

  const handlePrevious = () => {
    if (currentStep > PANEL_STEP_MAP[1] && !isSaving) {
        console.log("Previous button clicked for step:", currentStep);
        let prevStep = currentStep - 1;
        while (prevStep > PANEL_STEP_MAP[1]) {
            if (doesStepHaveEnabledFields(prevStep)) break;
            console.log(`Skipping step ${prevStep} backwards as it has no enabled fields.`);
            prevStep--;
        }

      console.log(`Moving back to step ${prevStep}.`);
      setCurrentStep(prevStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, prevStep.toString());
      setFieldErrors({});
      setError(''); // Clear general errors when navigating back
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    console.log("Submit button clicked.");

    // *** Validation checks last data step for required fields ***
    console.log(`Validating final step (${lastDataStep}) before submission...`);
    if (!validateStep(lastDataStep)) {
        setError("Please correct the errors indicated below before submitting."); // Use a general message
        // If the user is not currently on the step with the error, navigate them there
        if (currentStep !== lastDataStep) {
             console.log(`Validation failed on step ${lastDataStep}, navigating user there from ${currentStep}.`);
             setCurrentStep(lastDataStep);
             localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, lastDataStep.toString());
        }
        return; // Stop submission if validation fails
    }
    // Clear general error if validation passes
    setError('');

    console.log("Attempting final save (isComplete=true)...");
    const success = await saveFormData(true);

    if (success) {
      console.log("Submission successful. Moving to Thank You page.");
      setFieldErrors({});
      setError('');
      setCurrentStep(PANEL_STEP_MAP[4]);
    } else {
        console.log("Final submission failed.");
        // Error message should have been set by saveFormData or validation
    }
  };

  const resetForm = useCallback(() => {
    console.log("Resetting form completely.");
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
      // Ensure StepFields uses fieldErrors to display messages near inputs
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