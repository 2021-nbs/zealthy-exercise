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
   * @param {string} dateString - e.g., "YYYY-MM-DD"
   * @returns {{ isValid: boolean, message: string }}
   */
  export const validateBirthdate = (dateString) => {
    if (!dateString) {
      return { isValid: true, message: '' }; // Allow empty
    }
  
    const selectedDate = new Date(dateString + 'T00:00:00'); // Ensure consistent parsing
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
  
    if (isNaN(selectedDate.getTime())) {
      return { isValid: false, message: 'Invalid date format.' };
    }
  
    if (selectedDate > today) {
      return { isValid: false, message: 'Birthdate cannot be in the future.' };
    }
  
    return { isValid: true, message: '' };
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
  export const getTodayDateString = () => new Date().toISOString().split('T')[0];