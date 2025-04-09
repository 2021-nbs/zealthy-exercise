import React from 'react';
import FormField from './FormField';

const AddressFields = ({ formData, onChange, required = true }) => {
  return (
    <div className="address-fields">
      <h3>Address Information</h3>
      <FormField
        name="streetAddress"
        value={formData.streetAddress}
        onChange={onChange}
        required={required}
      />
      <FormField
        name="city"
        value={formData.city}
        onChange={onChange}
        required={required}
      />
      <div className="address-row">
        <div className="form-group state-field">
          <FormField
            name="state"
            value={formData.state}
            onChange={onChange}
            required={required}
          />
        </div>
        <div className="form-group zip-field">
          <FormField
            name="zipCode"
            type="text"
            value={formData.zipCode}
            onChange={onChange}
            required={required}
          />
        </div>
      </div>
    </div>
  );
};

export default AddressFields;