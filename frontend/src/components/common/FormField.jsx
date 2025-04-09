import React from 'react';
import { FIELD_LABELS } from '../../constants';
import { getTodayDateString } from '../../utils/helpers';

const FormField = ({
  name,
  type = 'text',
  value,
  onChange,
  required = true,
  error = '',
  rows = 5, // for textarea
}) => {
  const label = FIELD_LABELS[name] || name;
  const inputProps = {
    id: name,
    name: name,
    value: value || '', // Ensure controlled component
    onChange: onChange,
    required: required,
  };

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {type === 'textarea' ? (
        <textarea {...inputProps} rows={rows}></textarea>
      ) : (
        <input
          type={type}
          {...inputProps}
          max={type === 'date' ? getTodayDateString() : undefined}
        />
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
};

export default FormField;