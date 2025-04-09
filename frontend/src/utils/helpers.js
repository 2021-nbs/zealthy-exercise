// src/utils/helpers.js

/**
 * Parses a combined address string into components.
 * Handles potential variations and missing parts gracefully.
 * @param {string | null | undefined} addressString - e.g., "123 Main St, Anytown, CA 94107"
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
        // Match potential state (e.g., CA, NY) and zip (e.g., 12345, 12345-6789)
        const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s*(\d{5}(?:-\d{4})?)?$/);
        if (stateZipMatch) {
          result.state = stateZipMatch[1] ? stateZipMatch[1].trim() : '';
          result.zipCode = stateZipMatch[2] ? stateZipMatch[2].trim() : '';
        } else {
          // Fallback if regex fails, assume state is the whole part if no zip format detected
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
  
    // Check if format is valid for MM/DD/YYYY
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/; // Format: MM/DD/YYYY
    if (!dateRegex.test(birthdate)) {
      return { isValid: false, message: "Birthdate must be in MM/DD/YYYY format." };
    }
  
    // Parse MM/DD/YYYY to a date object
    const [month, day, year] = birthdate.split('/').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
  
    // Check if date is valid (not Feb 30, etc.)
    if (isNaN(date.getTime())) {
      return { isValid: false, message: "Invalid date. Please check month and day values." };
    }
  
    // Check if the entered date parts match what JavaScript parsed
    // This catches cases like 02/31/2023 which JS converts to 03/03/2023
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
  
  /**
   * Gets today's date in YYYY-MM-DD format for the max attribute.
   */
  export const getTodayDateString = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  };