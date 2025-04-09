// src/utils/helpers.js

/**
 * Parses a combined address string into components.
 * Handles potential variations and missing parts gracefully.
 * @param {string | null | undefined} addressString
 * @returns {{ streetAddress: string, city: string, state: string, zipCode: string }}
 */
export const parseAddressString = (addressString) => {
    const result = { streetAddress: '', city: '', state: '', zipCode: '' };
    if (!addressString) return result;
  
    try {
      const parts = addressString.split(',').map(part => part.trim());
  
      if (parts.length > 0) result.streetAddress = parts[0];
      if (parts.length > 1) result.city = parts[1];
      if (parts.length > 2) {
        const stateZipPart = parts[2].trim();
        const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s*(\d{5}(?:-\d{4})?)?$/);
        if (stateZipMatch) {
          result.state = stateZipMatch[1] ? stateZipMatch[1].trim() : '';
          result.zipCode = stateZipMatch[2] ? stateZipMatch[2].trim() : '';
        } else {
          result.state = stateZipPart;
        }
      }
    } catch (e) {
        console.warn('Could not parse address string:', addressString, e);
        // Return potentially partially parsed data or default values
    }
    return result;
  };
  
  /**
   * Combines address components into a single string.
   * @param {{ streetAddress: string, city: string, state: string, zipCode: string }} parts
   * @returns {string} - e.g., "123 Main St, Anytown, CA 94107"
   */
  export const combineAddressParts = ({ streetAddress, city, state, zipCode }) => {
    let combined = '';
    if (streetAddress) combined += streetAddress;
    if (city) combined += (combined ? ', ' : '') + city;
    const stateZip = [state, zipCode].filter(Boolean).join(' ');
    if (stateZip) combined += (combined ? ', ' : '') + stateZip;
    return combined;
  };
  
  /**
   * Validates if a date string represents a date that is not in the future.
   * @param {string} dateString 
   * @returns {{ isValid: boolean, message: string }}
   */
  export const validateBirthdate = (birthdate) => {
    // If no birthdate is provided, we'll let the required check handle this
    if (!birthdate) {
      return { isValid: false, message: "Birthdate is required." };
    }
  
    // Check if format is valid
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Format: YYYY-MM-DD
    if (!dateRegex.test(birthdate)) {
      return { isValid: false, message: "Birthdate must be in YYYY-MM-DD format." };
    }
  
    // Parse YYYY-MM-DD to a date object
    const date = new Date(birthdate + 'T00:00:00');
  
    // Check if date is valid (not Feb 30, etc.)
    if (isNaN(date.getTime())) {
      return { isValid: false, message: "Invalid date. Please check month and day values." };
    }
  
    // Check if the entered date parts match what JavaScript parsed
    const [year, month, day] = birthdate.split('-').map(Number);
    const parsedYear = date.getFullYear();
    const parsedMonth = date.getMonth() + 1; // JS months are 0-indexed
    const parsedDay = date.getDate();
    
    if (year !== parsedYear || month !== parsedMonth || day !== parsedDay) {
      return { isValid: false, message: "Invalid date. Please check month and day values." };
    }
  
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for fair comparison
    if (date > today) {
      return { isValid: false, message: "Birthdate cannot be in the future." };
    }
  
    // All checks passed
    return { isValid: true, message: "" };
  };
  
  
  /**
   * Determines the initial step based on saved data and config.
   * @param {object} savedData - The fetched submission data.
   * @param {object} formConfig - The form configuration.
   * @returns {number} - The step number (1, 2, or 3).
   */
  export const determineInitialStep = (savedData, formConfig) => {
    if (!savedData || !formConfig?.fields) return 1;
  
    const hasDataForPanel = (panelNumber) => {
      return Object.entries(formConfig.fields).some(([fieldName, fieldConfig]) => {
        if (fieldConfig.enabled && fieldConfig.panel === panelNumber) {
          // Map form field names to saved data keys (snake_case)
          const dataKey = fieldName === 'aboutYou' ? 'about_you' : fieldName;
          return !!savedData[dataKey]; // Check if data exists for this field
        }
        return false;
      });
    };
  
    if (hasDataForPanel(3)) return 3;
    if (hasDataForPanel(2)) return 2;
    return 1;
  };
  
  export const getTodayDateString = () => new Date().toISOString().split('T')[0];