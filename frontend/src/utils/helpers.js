// This should be in your src/utils/helpers.js

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
  
    // Check if date is valid (not Feb 30, etc.)
    const date = new Date(birthdate);
    if (isNaN(date.getTime())) {
      return { isValid: false, message: "Invalid date. Please check month and day values." };
    }
  
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for fair comparison
    if (date > today) {
      return { isValid: false, message: "Birthdate cannot be in the future." };
    }
  
    // Check if the entered date parts match what JavaScript parsed
    // This catches cases like 2023-02-31 which JS converts to 2023-03-03
    const [year, month, day] = birthdate.split('-').map(Number);
    const parsedYear = date.getFullYear();
    const parsedMonth = date.getMonth() + 1; // JS months are 0-indexed
    const parsedDay = date.getDate();
    
    if (year !== parsedYear || month !== parsedMonth || day !== parsedDay) {
      return { isValid: false, message: "Invalid date. Please check month and day values." };
    }
  
    // All checks passed
    return { isValid: true, message: "" };
  };