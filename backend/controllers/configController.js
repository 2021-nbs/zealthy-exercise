// Backend/controllers/configController.js

// Initial form configuration (lives in this controller now)
let formConfig = {
    fields: {
      address: { enabled: true, panel: 2 },
      birthdate: { enabled: true, panel: 2 },
      aboutYou: { enabled: true, panel: 3 }
    }
  };
  
  // GET /api/form-config
  const getFormConfig = (res) => {
    res.json(formConfig);
  };
  
  // POST /api/update-form-config
  const updateFormConfig = (req, res) => {
    const newConfig = req.body;

    if (!newConfig || !newConfig.fields) {
      return res.status(400).json({ success: false, message: 'Invalid configuration format: Missing fields object.' });
    }
  
    const requiredFields = ['address', 'birthdate', 'aboutYou'];
    const validPanels = [2, 3];
  
    for (const fieldName of requiredFields) {
      const field = newConfig.fields[fieldName];
      if (!field || typeof field.enabled !== 'boolean' || !validPanels.includes(field.panel)) {
        return res.status(400).json({
          success: false,
          message: `Invalid configuration for field: ${fieldName}. Ensure 'enabled' (boolean) and 'panel' (2 or 3) are correct.`
        });
      }
    }
  
    // Ensure at least one ENABLED field is assigned to each panel that is expected to have fields
    // (This assumes if ANY field is enabled, both panels need at least one enabled field - adjust if needed)
     const enabledFields = Object.values(newConfig.fields).filter(field => field.enabled);
     if (enabledFields.length > 0) { // Only validate panels if there are enabled fields
         const panel2EnabledFields = enabledFields.filter(field => field.panel === 2);
         const panel3EnabledFields = enabledFields.filter(field => field.panel === 3);
  
          // Check if *both* panels are required to have fields if *any* field is enabled
         if (panel2EnabledFields.length === 0) {
              return res.status(400).json({
                  success: false,
                  message: 'Configuration invalid: Panel 2 must have at least one enabled field.'
              });
         }
          if (panel3EnabledFields.length === 0) {
              return res.status(400).json({
                  success: false,
                  message: 'Configuration invalid: Panel 3 must have at least one enabled field.'
              });
          }
     }
    // Update configuration safely (create a new object)
    formConfig = {
      fields: {
        address: {
          enabled: Boolean(newConfig.fields.address.enabled),
          panel: Number(newConfig.fields.address.panel) // Ensure type safety
        },
        birthdate: {
          enabled: Boolean(newConfig.fields.birthdate.enabled),
          panel: Number(newConfig.fields.birthdate.panel)
        },
        aboutYou: {
          enabled: Boolean(newConfig.fields.aboutYou.enabled),
          panel: Number(newConfig.fields.aboutYou.panel)
        }
      }
    };
  
    res.json({ success: true, message: 'Configuration updated successfully' });
  };
  
  module.exports = {
    getFormConfig,
    updateFormConfig
  };