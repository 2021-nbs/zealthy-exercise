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

  // Memoized function to check if a step has enabled fields
  const doesStepHaveEnabledFields = useCallback((stepNum) => {
    if (!formConfig?.fields) return false;
    return Object.values(formConfig.fields).some(
      field => field.enabled && field.panel === stepNum
    );
  }, [formConfig]); // Depends only on formConfig

  // Memoized function to clear saved progress from localStorage
  const clearSavedProgress = useCallback(() => {
    console.log("Clearing saved progress from localStorage."); // Added log for debugging
    localStorage.removeItem(LOCAL_STORAGE_FORM_ID_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
    localStorage.removeItem(LOCAL_STORAGE_FORM_DATA_KEY);
  }, []); // No dependencies needed

  // Effect for loading initial data (from localStorage or API)
  useEffect(() => {
    const loadInitialData = async () => {
       setLoading(true);
       setError('');
       let finalInitialStep = PANEL_STEP_MAP[1];
       let restoredData = null;
       let source = "fresh";
       let localConfig = null; // Use local var for config within effect scope

       try {
         console.log("Wizard Mount: Fetching config...");
         localConfig = await fetchFormConfig();
         setFormConfig(localConfig); // Set state

         console.log("Wizard Mount: Checking localStorage...");
         const savedFormDataString = localStorage.getItem(LOCAL_STORAGE_FORM_DATA_KEY);
         const savedFormId = localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
         const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
         const savedStepString = localStorage.getItem(LOCAL_STORAGE_CURRENT_STEP_KEY);

         // Priority 1: Restore from localStorage if valid formData exists
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
                     clearSavedProgress(); // Clear all related keys if data is bad
                 }
             } catch (e) {
                 console.error("Error parsing formData from localStorage:", e);
                 clearSavedProgress(); // Clear all related keys on parse error
             }
         }

         // Priority 2: Restore from API if no local data but ID/Username exist
         if (source !== "local" && savedFormId && savedUsername) {
           try {
             console.log(`Fetching submission ${savedFormId} for user ${savedUsername}...`);
             const savedSubmission = await fetchFormSubmission(savedFormId);
             if (
               savedSubmission &&
               savedSubmission.username === savedUsername &&
               !savedSubmission.is_complete // IMPORTANT: Don't restore completed forms
             ) {
               console.log("Restoring formData from API.");
               const addressParts = parseAddressString(savedSubmission.address);
               restoredData = {
                 username: savedSubmission.username || '',
                 password: '', // Never restore password
                 streetAddress: addressParts.streetAddress || '',
                 city: addressParts.city || '',
                 state: addressParts.state || '',
                 zipCode: addressParts.zipCode || '',
                 birthdate: savedSubmission.birthdate || '',
                 aboutYou: savedSubmission.about_you || '',
               };
               setFormData(restoredData);
               setFormId(savedFormId); // Set formId state here
               source = "api";
             } else {
               console.log("Saved form ID/username found, but data mismatch, form completed, or fetch failed. Clearing potentially stale state.");
               clearSavedProgress(); // Clear local state as it doesn't match a valid incomplete server state
               setFormData(INITIAL_FORM_DATA); // Ensure state is reset too
               setFormId(null);
               source = "clear";
             }
           } catch (fetchError) {
             console.error('Error fetching saved progress:', fetchError);
             setError('Could not load saved progress. Starting fresh.');
             clearSavedProgress(); // Clear local state on fetch error
             setFormData(INITIAL_FORM_DATA);
             setFormId(null);
             source = "clear";
           }
         }

         // Determine the step based on restored data or saved step
         const dataForStepCheck = restoredData || INITIAL_FORM_DATA;
         // Ensure config is available before determining step
         const dataDerivedStep = localConfig ? determineInitialStep(dataForStepCheck, localConfig) : PANEL_STEP_MAP[1];
         let stepFromStorage = null;

         if (savedStepString) {
             const parsedStep = parseInt(savedStepString, 10);
             // Validate saved step against known steps
             if (Object.values(PANEL_STEP_MAP).includes(parsedStep) && parsedStep < PANEL_STEP_MAP[4]) {
                 stepFromStorage = parsedStep;
             } else {
                 console.warn(`Invalid saved step (${savedStepString}). Ignoring.`);
                 localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY); // Remove invalid step
             }
         }

         // Use saved step if valid and available, otherwise use data-derived step
         finalInitialStep = stepFromStorage ?? dataDerivedStep;

         // If we explicitly cleared or started fresh, always go to step 1
         if (source === "clear" || source === "fresh") {
              finalInitialStep = PANEL_STEP_MAP[1];
              // If it was truly fresh (no data found anywhere), ensure local is clean
              if (source === "fresh" && !savedFormDataString && !savedFormId) {
                  clearSavedProgress();
              }
         }

         // Avoid setting step 4 on initial load if somehow indicated
         if (finalInitialStep >= PANEL_STEP_MAP[4]) {
             console.warn(`Initial load determined step ${finalInitialStep}, resetting to 1.`);
             finalInitialStep = PANEL_STEP_MAP[1];
             clearSavedProgress(); // Ensure clean start if we ended up here unexpectedly
             setFormData(INITIAL_FORM_DATA);
             setFormId(null);
         }

         console.log(`Restoration source: ${source}. Data suggests step ${dataDerivedStep}. Saved step: ${stepFromStorage}. Final step: ${finalInitialStep}`);

       } catch (configError) {
         console.error('Error fetching form configuration:', configError);
         setError('Failed to load form configuration. Please try again later.');
         setLoading(false); // Ensure loading stops on config error
         return;
       } finally {
         setCurrentStep(finalInitialStep);
         // Update localStorage for the current step only if it's between step 1 and 3
         if (finalInitialStep > PANEL_STEP_MAP[1] && finalInitialStep < PANEL_STEP_MAP[4]) {
              localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, finalInitialStep.toString());
         } else {
              // Remove step key if on step 1 or an invalid step reached finally block
              localStorage.removeItem(LOCAL_STORAGE_CURRENT_STEP_KEY);
         }
         setLoading(false);
       }
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSavedProgress]); // Only run on mount, clearSavedProgress is stable


  // Effect for saving formData to localStorage (with modification)
  useEffect(() => {
    // --- MODIFICATION START ---
    // Do not save formData to localStorage if loading, saving, form is empty,
    // or we are on the Thank You page (step 4).
    if (
        !loading &&
        !isSaving &&
        Object.keys(formData).length > 0 &&
        currentStep !== PANEL_STEP_MAP[4] // <-- Added condition
       )
    {
      try {
        console.log(`Saving formData to localStorage for step ${currentStep}`); // Added log
        localStorage.setItem(LOCAL_STORAGE_FORM_DATA_KEY, JSON.stringify(formData));
      } catch (e) {
        console.error("Error saving form data to localStorage:", e);
      }
    } else if (currentStep === PANEL_STEP_MAP[4]) {
        // Optional: Log why it's not saving if on step 4
        console.log("On Thank You page (Step 4), preventing save to localStorage.");
    }
    // --- MODIFICATION END ---
  }, [formData, loading, isSaving, currentStep]); // Add currentStep dependency


  // Handler for input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear specific field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Function to validate fields for a specific step
  const validateStep = useCallback((step) => {
    const errors = {};
    let isValid = true;
    if (!formConfig?.fields) {
        console.warn("Validation skipped: formConfig not loaded.");
        return true; // Can't validate without config
    }

    console.log(`Validating step ${step}`);
    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled && fieldConfig.panel === step) {

         // Example: Generic required check (adjust based on actual config if needed)
         // if (fieldConfig.required && !value) {
         //    errors[fieldName] = `${fieldConfig.label || fieldName} is required.`;
         //    isValid = false;
         // }

         // Specific validations from original code:
         if (step === PANEL_STEP_MAP[1]) {
            if (fieldName === 'username' && !formData.username) { errors.username = 'Username is required.'; isValid = false; }
            if (fieldName === 'password' && !formData.password) { errors.password = 'Password is required.'; isValid = false; }
         } else if (fieldName === 'birthdate' && formData.birthdate) {
            // Only validate birthdate format if a value is entered
            const validation = validateBirthdate(formData.birthdate);
            if (!validation.isValid) {
              errors.birthdate = validation.message;
              isValid = false;
            }
         }
         // Add other field-specific validations here if needed
      }
    });

    if (!isValid) {
        console.log("Validation failed:", errors);
    }
    setFieldErrors(errors);
    return isValid;
  }, [formConfig, formData]); // Depends on config and current data

  // Function to find the last step number that contains enabled fields
  const findLastEnabledStep = useCallback(() => {
     // Default to step 1 if no config or no enabled fields found later
     let lastStep = PANEL_STEP_MAP[1];
     if (!formConfig?.fields) return lastStep;

     // Check steps 3 down to 1
     for (let step = PANEL_STEP_MAP[3]; step >= PANEL_STEP_MAP[1]; step--) {
         if (doesStepHaveEnabledFields(step)) {
             lastStep = step;
             break; // Found the highest step with enabled fields
         }
     }
     console.log("Last data step determined as:", lastStep);
     return lastStep;
  }, [formConfig, doesStepHaveEnabledFields]); // Depends on config and the check function

  // Calculate the last step with data fields (memoized by useCallback dependencies)
  const lastDataStep = findLastEnabledStep();

  // Function to save form data to the API
  const saveFormData = useCallback(async (isComplete = false) => {
    // Prevent saving if already saving or config isn't loaded
    if (!formConfig?.fields || isSaving) {
        console.warn("Save prevented: Already saving or formConfig not ready.");
        return false;
    }

    // Determine which step's fields need validation before saving
    // If completing, validate the last step with fields. Otherwise, validate the current step.
    const stepToValidate = isComplete ? lastDataStep : currentStep;
    console.log(`Save attempt: Validating step ${stepToValidate}. Is Complete: ${isComplete}`);

    // Validate relevant step before proceeding
    if (!validateStep(stepToValidate)) {
        console.log("Save prevented: Validation failed.");
        setError("Please correct the validation errors before proceeding.");
        return false; // Stop the save process if validation fails
    }

    setIsSaving(true);
    setError(''); // Clear previous errors before trying to save

    // Prepare submission data, always include credentials as they seem required
    const submissionData = {
      username: formData.username,
      password: formData.password, // Assuming password should always be sent on save/update
      is_complete: isComplete,
    };

    // Map other enabled fields based on config
    Object.entries(formConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.enabled && fieldName !== 'username' && fieldName !== 'password') {
        if (fieldName === 'address') {
          submissionData.address = combineAddressParts(formData);
        } else if (fieldName === 'birthdate') {
           // Only include birthdate if it has a non-empty value
           submissionData.birthdate = formData.birthdate || null; // Send null if empty/undefined
        } else if (fieldName === 'aboutYou') {
          submissionData.about_you = formData.aboutYou || ''; // Send empty string if undefined/null
        }
        // Add mappings for other potential fields here based on fieldName
      }
    });

    try {
      let response;
      // Use formId from state first, fallback to localStorage temporarily if state isn't set yet
      const currentFormId = formId || localStorage.getItem(LOCAL_STORAGE_FORM_ID_KEY);
      console.log(`Saving data. Form ID: ${currentFormId}. Data:`, submissionData);

      if (currentFormId) {
        console.log(`Updating submission ${currentFormId}`);
        response = await updateFormSubmission(currentFormId, submissionData);
      } else {
        console.log("Creating new submission");
        // Ensure username/password are present for creation (should be caught by validation)
        if (!submissionData.username || !submissionData.password) {
             throw new Error("Username and Password are required to create a submission.");
        }
        response = await createFormSubmission(submissionData);
        const newFormId = response?.id; // Use optional chaining
        if (newFormId) {
          console.log(`Submission created with ID: ${newFormId}`);
          setFormId(newFormId); // Update state
          // Save critical identifiers to localStorage immediately after creation success
          localStorage.setItem(LOCAL_STORAGE_FORM_ID_KEY, newFormId);
          localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, formData.username);
        } else {
           console.error("API did not return a form ID on creation.", response);
           throw new Error("API did not return a form ID on creation.");
        }
      }

      console.log("API save successful.");
      setIsSaving(false);

      // CRITICAL: Clear local storage *if* this save marks the form as complete
      if (isComplete) {
           console.log("Form marked complete, clearing saved progress.");
           clearSavedProgress(); // Call the memoized clear function
      }
      return true; // Indicate success

    } catch (apiError) {
      console.error('Error saving form data to API:', apiError);
      let errorMessage = 'Error saving data. Please try again.';
      // Check for specific Supabase/API error structure if possible
      if (apiError.response?.data?.message) {
          errorMessage = `Error saving data: ${apiError.response.data.message}`;
      } else if (apiError.message) {
         errorMessage = `Error saving data: ${apiError.message}`;
      }
      setError(errorMessage);
      setIsSaving(false);
      return false; // Indicate failure
    }
  }, [
      formConfig,
      formData,
      formId, // Include formId from state
      isSaving,
      currentStep,
      lastDataStep,
      validateStep,       // Include memoized validation function
      clearSavedProgress, // Include memoized clear function
      // No need to include combineAddressParts unless it's complex and memoized
  ]);

  // Handler for the 'Next' button
  const handleNext = async () => {
    if (isSaving) return; // Prevent multiple clicks
    console.log("Next button clicked for step:", currentStep);

    // Validate the current step first
    if (!validateStep(currentStep)) {
        console.log("Cannot proceed to next: Validation failed for current step.");
        return; // Stop if validation fails
    }

    // Find the actual next step that has enabled fields
    let nextStep = currentStep + 1;
    while (nextStep < PANEL_STEP_MAP[4]) {
      if (doesStepHaveEnabledFields(nextStep)) break; // Found the next usable step
      console.log(`Skipping step ${nextStep} as it has no enabled fields.`);
      nextStep++;
    }

    // If the next step would be the Thank You page or beyond, trigger submit instead
     if (nextStep >= PANEL_STEP_MAP[4]) {
         console.log("Next step is Thank You page or beyond, triggering submit.");
         handleSubmit(); // Call submit handler directly
         return;
     }

    // Save current progress before moving to the next step (mark as not complete)
    console.log(`Attempting to save progress before moving to step ${nextStep}...`);
    const success = await saveFormData(false);

    if (success) {
      console.log(`Save successful. Moving to step ${nextStep}.`);
      setCurrentStep(nextStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, nextStep.toString()); // Persist current step
      setFieldErrors({}); // Clear errors when moving step
    } else {
        console.log("API save failed, staying on current step.");
        // Error message should already be set by saveFormData
    }
  };

  // Handler for the 'Previous' button
  const handlePrevious = () => {
    // Can only go back if not on the first step and not currently saving
    if (currentStep > PANEL_STEP_MAP[1] && !isSaving) {
        console.log("Previous button clicked for step:", currentStep);
        // Find the actual previous step that has enabled fields
        let prevStep = currentStep - 1;
        while (prevStep > PANEL_STEP_MAP[1]) {
            if (doesStepHaveEnabledFields(prevStep)) break; // Found the previous usable step
            console.log(`Skipping step ${prevStep} backwards as it has no enabled fields.`);
            prevStep--;
        }

      console.log(`Moving back to step ${prevStep}.`);
      setCurrentStep(prevStep);
      localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, prevStep.toString()); // Persist current step
      setFieldErrors({}); // Clear errors when moving step
      setError(''); // Clear general errors when navigating back
    }
  };

  // Handler for the 'Submit' button
  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); // Prevent default form submission if used in a form tag
    if (isSaving) return; // Prevent multiple clicks
    console.log("Submit button clicked.");

    // Validate the *last* step containing data fields before final submission
    console.log(`Validating final step (${lastDataStep}) before submission...`);
    if (!validateStep(lastDataStep)) {
        setError("Please correct the errors on the relevant step before submitting.");
        // If the user is not currently on the step with the error, navigate them there
        if (currentStep !== lastDataStep) {
             console.log(`Validation failed on step ${lastDataStep}, navigating user there from ${currentStep}.`);
             setCurrentStep(lastDataStep);
             localStorage.setItem(LOCAL_STORAGE_CURRENT_STEP_KEY, lastDataStep.toString());
        }
        return; // Stop submission if validation fails
    }

    // Attempt to save the form data, marking it as complete
    console.log("Attempting final save (isComplete=true)...");
    const success = await saveFormData(true); // Mark as complete

    if (success) {
      console.log("Submission successful. Moving to Thank You page.");
      // Clear errors and move to the Thank You step
      setFieldErrors({});
      setError('');
      setCurrentStep(PANEL_STEP_MAP[4]);
      // No need to set localStorage step key for step 4
      // clearSavedProgress() was called inside saveFormData
      // The useEffect saving formData to localStorage is prevented on step 4
    } else {
        console.log("Final submission failed.");
        // Error message should have been set by saveFormData
    }
  };

  // Function to reset the entire form state (passed to Thank You page)
  const resetForm = useCallback(() => {
    console.log("Resetting form completely.");
    clearSavedProgress(); // Clear localStorage
    setFormData(INITIAL_FORM_DATA); // Reset form data state
    setFormId(null); // Reset form ID state
    setCurrentStep(PANEL_STEP_MAP[1]); // Go back to step 1
    setError(''); // Clear general errors
    setFieldErrors({}); // Clear field errors
    // No need to touch localStorage step key, clearSavedProgress handles it
  }, [clearSavedProgress]); // Dependency on the stable clearSavedProgress

  // Renders the component for the current step
  const renderCurrentStep = () => {
    const stepProps = {
        formData,
        handleInputChange,
        formConfig,
        fieldErrors,
        // Pass isSaving maybe? If steps need to disable inputs while saving?
        // isSaving,
    };
    switch (currentStep) {
      case PANEL_STEP_MAP[1]: return <Step1Login {...stepProps} />;
      case PANEL_STEP_MAP[2]: return <StepFields {...stepProps} stepNumber={2} />;
      case PANEL_STEP_MAP[3]: return <StepFields {...stepProps} stepNumber={3} />;
      case PANEL_STEP_MAP[4]: return <Step4ThankYou onRestart={resetForm} />; // Pass memoized resetForm
      default:
          console.error("Attempting to render invalid step:", currentStep);
          // Fallback strategy: reset to step 1?
          // resetForm(); // Could cause infinite loop if resetForm itself has issues
          return <div className="error-message">Invalid Step Detected. Please refresh or <button onClick={resetForm}>start over</button>.</div>;
    }
  };

   // Loading state display
   if (loading) {
       return <div className="wizard-container"><p>Loading form...</p></div>;
   }
   // Error state display if config failed to load fundamentally
   if (!formConfig && !loading) {
       return <div className="wizard-container error-message"><p>Error loading form configuration. Please try refreshing.</p></div>;
   }

  // Main component render
  return (
    <div className="wizard-container">
      <div className="header">
        <h1>Zealthy Coding Exercise!</h1>
        <button onClick={() => navigate('/admin')} className="admin-link">Admin</button>
      </div>

      {/* Show progress bar only for data steps */}
      {currentStep < PANEL_STEP_MAP[4] && <ProgressBar currentStep={currentStep} lastDataStep={lastDataStep}/>}

      {/* Display general error messages */}
      {error && <div className="error-message general-error">{error}</div>}

      {/* Render the current step's content */}
      <div> {/* Consider adding a form element here if needed, though submit is handled manually */}
        {renderCurrentStep()}

        {/* Navigation buttons container */}
        <div className="buttons-container">
          {/* Show 'Previous' button if applicable */}
          {currentStep > PANEL_STEP_MAP[1] && currentStep < PANEL_STEP_MAP[4] && (
            <button type="button" onClick={handlePrevious} className="btn btn-secondary" disabled={isSaving}>
              Previous
            </button>
          )}
          {/* Show 'Next' button if applicable */}
          {currentStep < lastDataStep && currentStep < PANEL_STEP_MAP[4] && (
            <button type="button" onClick={handleNext} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Next'}
            </button>
          )}
          {/* Show 'Submit' button only on the last data step */}
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