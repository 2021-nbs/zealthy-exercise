// src/components/Admin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zealthy-exercise-fb2f.onrender.com'

const Admin = () => {
  const navigate = useNavigate();
  const [formConfig, setFormConfig] = useState({
    fields: {
      address: { enabled: true, panel: 2 },
      birthdate: { enabled: true, panel: 2 },
      aboutYou: { enabled: true, panel: 3 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/form-config`);
        setFormConfig(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching form configuration:', error);
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, []);

  const handleToggleChange = (field) => {
    setFormConfig({
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [field]: {
          ...formConfig.fields[field],
          enabled: !formConfig.fields[field].enabled
        }
      }
    });
  };

  const handlePanelChange = (field, panel) => {
    setFormConfig({
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [field]: {
          ...formConfig.fields[field],
          panel: panel
        }
      }
    });
  };

  const validateConfiguration = () => {
    // Check if panel 2 has at least one field
    const hasPanel2Field = Object.values(formConfig.fields).some(
      field => field.enabled && field.panel === 2
    );

    // Check if panel 3 has at least one field
    const hasPanel3Field = Object.values(formConfig.fields).some(
      field => field.enabled && field.panel === 3
    );

    if (!hasPanel2Field) {
      setValidationError('Panel 2 must have at least one field.');
      return false;
    }

    if (!hasPanel3Field) {
      setValidationError('Panel 3 must have at least one field.');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateConfiguration()) {
      return;
    }
    
    setSaveStatus('Saving...');
    
    try {
      await axios.post(`${API_URL}/api/update-form-config`, formConfig);
      setSaveStatus('Configuration saved successfully!');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error updating form configuration:', error);
      setSaveStatus('Error saving configuration. Please try again.');
    }
  };

  const navigateToWizard = () => {
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
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
          <p>Select which fields to show and on which panel they should appear:</p>
          
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
              <tr>
                <td>Address</td>
                <td>
                  <input
                    type="checkbox"
                    checked={formConfig.fields.address.enabled}
                    onChange={() => handleToggleChange('address')}
                  />
                </td>
                <td>
                  <select
                    value={formConfig.fields.address.panel}
                    onChange={(e) => handlePanelChange('address', parseInt(e.target.value))}
                    disabled={!formConfig.fields.address.enabled}
                  >
                    <option value={2}>Panel 2</option>
                    <option value={3}>Panel 3</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Birthdate</td>
                <td>
                  <input
                    type="checkbox"
                    checked={formConfig.fields.birthdate.enabled}
                    onChange={() => handleToggleChange('birthdate')}
                  />
                </td>
                <td>
                  <select
                    value={formConfig.fields.birthdate.panel}
                    onChange={(e) => handlePanelChange('birthdate', parseInt(e.target.value))}
                    disabled={!formConfig.fields.birthdate.enabled}
                  >
                    <option value={2}>Panel 2</option>
                    <option value={3}>Panel 3</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>About You</td>
                <td>
                  <input
                    type="checkbox"
                    checked={formConfig.fields.aboutYou.enabled}
                    onChange={() => handleToggleChange('aboutYou')}
                  />
                </td>
                <td>
                  <select
                    value={formConfig.fields.aboutYou.panel}
                    onChange={(e) => handlePanelChange('aboutYou', parseInt(e.target.value))}
                    disabled={!formConfig.fields.aboutYou.enabled}
                  >
                    <option value={2}>Panel 2</option>
                    <option value={3}>Panel 3</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="panel-preview">
            <div className="panel-box">
              <h3>Panel 2 Preview</h3>
              <ul>
                {Object.entries(formConfig.fields).map(([key, field]) => (
                  field.enabled && field.panel === 2 ? (
                    <li key={key}>{key === 'aboutYou' ? 'About You' : key.charAt(0).toUpperCase() + key.slice(1)}</li>
                  ) : null
                ))}
                {!Object.values(formConfig.fields).some(field => field.enabled && field.panel === 2) && (
                  <li className="empty-panel">No fields assigned</li>
                )}
              </ul>
            </div>
            <div className="panel-box">
              <h3>Panel 3 Preview</h3>
              <ul>
                {Object.entries(formConfig.fields).map(([key, field]) => (
                  field.enabled && field.panel === 3 ? (
                    <li key={key}>{key === 'aboutYou' ? 'About You' : key.charAt(0).toUpperCase() + key.slice(1)}</li>
                  ) : null
                ))}
                {!Object.values(formConfig.fields).some(field => field.enabled && field.panel === 3) && (
                  <li className="empty-panel">No fields assigned</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="admin-actions">
          <button type="submit" className="btn btn-primary">Save Configuration</button>
          {saveStatus && <div className="save-status">{saveStatus}</div>}
        </div>
      </form>
    </div>
  );
};

export default Admin;