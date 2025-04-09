// src/components/common/AddressFields.jsx
import React from 'react';
import FormField from './FormField';

const AddressFields = ({ formData, onChange, required, errors = {} }) => {
  return (
    <div className="address-fields">
      <FormField
        name="streetAddress"
        label="Street Address"
        value={formData.streetAddress || ''}
        onChange={onChange}
        required={required}
        error={errors?.streetAddress || ''}
      />
      <FormField
        name="city"
        label="City"
        value={formData.city || ''}
        onChange={onChange}
        required={required}
        error={errors?.city || ''}
      />
      <FormField
        name="state"
        label="State"
        value={formData.state || ''}
        onChange={onChange}
        required={required}
        error={errors?.state || ''}
      />
      <FormField
        name="zipCode"
        label="Zip Code"
        value={formData.zipCode || ''}
        onChange={onChange}
        required={required}
        error={errors?.zipCode || ''}
      />
    </div>
  );
};

export default AddressFields;