// src/components/common/FormField.jsx
import React from 'react';

const FormField = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  error = ''
}) => {
  // Generate a label from the name if not provided
  const fieldLabel = label || name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  
  return (
    <div className="form-group">
      <label htmlFor={name}>
        {fieldLabel}{required && <span className="required-mark">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={error ? 'input-error' : ''}
          required={required}
        />
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          className={error ? 'input-error' : ''}
          required={required}
        />
      )}
      
      {error && <div className="field-error">{error}</div>}
    </div>
  );
};

export default FormField;