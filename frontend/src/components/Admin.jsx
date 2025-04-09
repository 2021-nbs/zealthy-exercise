// src/components/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFormConfig, updateAdminFormConfig } from '../services/api'; // Use the service
import LoadingIndicator from './common/LoadingIndicator'; 

// Default config structure if fetch fails or for initial state
const DEFAULT_FORM_CONFIG = {
    fields: {
      address: { enabled: true, panel: 2 },
      birthdate: { enabled: true, panel: 2 },
      aboutYou: { enabled: true, panel: 3 }
    }
  };


const Admin = () => {
  const navigate = useNavigate();
  const [formConfig, setFormConfig] = useState(DEFAULT_FORM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [validationError, setValidationError] = useState('');
  const [error, setError] = useState(''); // For fetch errors

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await fetchFormConfig(); // Use API service
        // Add validation/check for expected structure if necessary
        if (config && config.fields) {
             setFormConfig(config);
        } else {
            console.warn("Fetched config is missing expected structure, using default.");
            setFormConfig(DEFAULT_FORM_CONFIG); // Fallback
            setError("Fetched configuration was incomplete. Displaying defaults.");
        }

      } catch (error) {
        console.error('Error fetching form configuration:', error);
        setError('Error fetching form configuration. Displaying defaults.');
        setFormConfig(DEFAULT_FORM_CONFIG); // Use default on error
      } finally {
          setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleToggleChange = (field) => {
    setFormConfig(prevConfig => ({
      ...prevConfig,
      fields: {
        ...prevConfig.fields,
        [field]: {
          ...prevConfig.fields[field],
          enabled: !prevConfig.fields[field].enabled
        }
      }
    }));
    setValidationError(''); // Clear validation on change
    setSaveStatus('');
  };

  const handlePanelChange = (field, panel) => {
    setFormConfig(prevConfig => ({
      ...prevConfig,
      fields: {
        ...prevConfig.fields,
        [field]: {
          ...prevConfig.fields[field],
          panel: panel
        }
      }
    }));
     setValidationError(''); // Clear validation on change
     setSaveStatus('');
  };


  const validateConfiguration = () => {
    // Ensure fields exist before trying to access them
     const fields = formConfig?.fields ?? {};

    // Check if panel 2 has at least one field enabled
    const hasPanel2Field = Object.values(fields).some(
      field => field && field.enabled && field.panel === 2
    );

    // Check if panel 3 has at least one field enabled
    const hasPanel3Field = Object.values(fields).some(
      field => field && field.enabled && field.panel === 3
    );

    // Add check: At least one field must be enabled overall (optional but good)
    const hasAnyEnabledField = Object.values(fields).some(field => field && field.enabled);

    if (!hasAnyEnabledField) {
      setValidationError('At least one field (Address, Birthdate, or About You) must be enabled.');
      return false;
    }

     if (hasAnyEnabledField && !hasPanel2Field) {
       setValidationError('Configuration invalid: Panel 2 must have at least one *enabled* field.');
       return false;
     }

     if (hasAnyEnabledField && !hasPanel3Field) {
       setValidationError('Configuration invalid: Panel 3 must have at least one *enabled* field.');
       return false;
     }


    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateConfiguration()) {
      setSaveStatus(''); // Clear any previous save status
      return;
    }

    setSaveStatus('Saving...');
    setValidationError(''); // Clear validation error message

    try {
      await updateAdminFormConfig(formConfig); // Use API service
      setSaveStatus('Configuration saved successfully!');

      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error updating form configuration:', error);
      setSaveStatus(`Error saving configuration: ${error.message || 'Please try again.'}`);
    }
  };

  const navigateToWizard = () => {
    navigate('/');
  };

   // Use the common LoadingIndicator
  if (loading) {
    return <div className="admin-container"><LoadingIndicator message="Loading Configuration..." /></div>;
  }

  // Display fetch error if any
   if (error && !loading) {
     return (
       <div className="admin-container error-message">
         <p>{error}</p>
         <button onClick={() => window.location.reload()}>Try Again</button>
       </div>
     );
   }

  // Ensure formConfig and formConfig.fields exist before rendering the table
   const fields = formConfig?.fields;
   if (!fields) {
       return <div className="admin-container error-message">Configuration data is missing or invalid.</div>;
   }


  return (
    <div className="admin-container">
      <div className="header">
        <h1>Zealthy Admin Configuration</h1>
        <div className="admin-nav">
          <a href="/data" className="nav-link">View Submissions Data</a>
          <button
            onClick={navigateToWizard}
            className="back-link"
            type="button"
          >
            Back to Form
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="config-options">
          <h2>Configure Form Fields</h2>
          <p>Select which fields to show and on which panel they should appear (Panel 1 is always Login Info).</p>

          {validationError && (
            <div className="validation-error">
              {validationError}
            </div>
          )}

          <table className="config-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Enable</th>
                <th>Panel</th>
              </tr>
            </thead>
            <tbody>
               {/* Check if field exists before rendering row */}
              {fields.address && (
                  <tr>
                    <td>Address</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={fields.address.enabled}
                        onChange={() => handleToggleChange('address')}
                      />
                    </td>
                    <td>
                      <select
                        value={fields.address.panel}
                        onChange={(e) => handlePanelChange('address', parseInt(e.target.value))}
                        disabled={!fields.address.enabled}
                      >
                        <option value={2}>Panel 2</option>
                        <option value={3}>Panel 3</option>
                      </select>
                    </td>
                  </tr>
              )}
               {fields.birthdate && (
                  <tr>
                    <td>Birthdate</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={fields.birthdate.enabled}
                        onChange={() => handleToggleChange('birthdate')}
                      />
                    </td>
                    <td>
                      <select
                        value={fields.birthdate.panel}
                        onChange={(e) => handlePanelChange('birthdate', parseInt(e.target.value))}
                        disabled={!fields.birthdate.enabled}
                      >
                        <option value={2}>Panel 2</option>
                        <option value={3}>Panel 3</option>
                      </select>
                    </td>
                  </tr>
               )}
                {fields.aboutYou && (
                  <tr>
                    <td>About You</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={fields.aboutYou.enabled}
                        onChange={() => handleToggleChange('aboutYou')}
                      />
                    </td>
                    <td>
                      <select
                        value={fields.aboutYou.panel}
                        onChange={(e) => handlePanelChange('aboutYou', parseInt(e.target.value))}
                        disabled={!fields.aboutYou.enabled}
                      >
                        <option value={2}>Panel 2</option>
                        <option value={3}>Panel 3</option>
                      </select>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>

          {}
          <div className="panel-preview">
             <div className="panel-box">
               <h3>Panel 2 Preview</h3>
               <ul>
                 {Object.entries(fields).map(([key, field]) => (
                   field && field.enabled && field.panel === 2 ? (
                     <li key={key}>{key === 'aboutYou' ? 'About You' : key.charAt(0).toUpperCase() + key.slice(1)}</li>
                   ) : null
                 ))}
                 {!Object.values(fields).some(field => field && field.enabled && field.panel === 2) && (
                   <li className="empty-panel">No enabled fields assigned</li>
                 )}
               </ul>
             </div>
             <div className="panel-box">
               <h3>Panel 3 Preview</h3>
               <ul>
                 {Object.entries(fields).map(([key, field]) => (
                   field && field.enabled && field.panel === 3 ? (
                    <li key={key}>{key === 'aboutYou' ? 'About You' : key.charAt(0).toUpperCase() + key.slice(1)}</li>
                   ) : null
                 ))}
                 {!Object.values(fields).some(field => field && field.enabled && field.panel === 3) && (
                   <li className="empty-panel">No enabled fields assigned</li>
                 )}
               </ul>
             </div>
           </div>
        </div>

        <div className="admin-actions">
          <button type="submit" className="btn btn-primary">Save Configuration</button>
          {saveStatus && <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>{saveStatus}</div>}
        </div>
      </form>
    </div>
  );
};

export default Admin;