// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
// Update CORS to allow requests from your Netlify domain
app.use(cors({
  origin: [
    'https://zealthy-exercise-fb2f.onrender.com', 
    'https://zealthycodingexercise.netlify.app', // Removed trailing slash
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight request results for 24 hours (in seconds)
}));
app.use(bodyParser.json());

// Initial form configuration
let formConfig = {
  fields: {
    address: { enabled: true, panel: 2 },
    birthdate: { enabled: true, panel: 2 },
    aboutYou: { enabled: true, panel: 3 }
  }
};

// API Routes
app.get('/api/form-config', (req, res) => {
  res.json(formConfig);
});

app.post('/api/update-form-config', (req, res) => {
  const newConfig = req.body;
  
  // Basic validation
  if (!newConfig.fields) {
    return res.status(400).json({ success: false, message: 'Invalid configuration format' });
  }

  // Validate the structure of each field
  const requiredFields = ['address', 'birthdate', 'aboutYou'];
  const validPanels = [2, 3];
  
  for (const fieldName of requiredFields) {
    const field = newConfig.fields[fieldName];
    
    // Check if field exists and has the correct properties
    if (!field || typeof field.enabled !== 'boolean' || !validPanels.includes(field.panel)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid configuration for field: ${fieldName}` 
      });
    }
  }
  
  // Ensure at least one field is assigned to each panel
  const panel2Fields = Object.values(newConfig.fields).filter(
    field => field.enabled && field.panel === 2
  );
  
  const panel3Fields = Object.values(newConfig.fields).filter(
    field => field.enabled && field.panel === 3
  );
  
  if (panel2Fields.length === 0 || panel3Fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Each panel must have at least one field'
    });
  }
  
  // Update configuration if validation passes
  formConfig = {
    fields: {
      address: {
        enabled: Boolean(newConfig.fields.address.enabled),
        panel: Number(newConfig.fields.address.panel)
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
  
  res.json({ success: true, message: 'Configuration updated' });
});

// Create or update form submission
app.post('/api/submit-form', async (req, res) => {
  try {
    const formData = req.body;
    
    // Create a submission object with only the fields that are present
    const submission = {
      username: formData.username,
      password: formData.password, // Note: In a real app, this should be hashed
      is_complete: formData.isComplete || false,
      last_updated: new Date()
    };
    
    // Only add fields that are present in the submitted data
    if (formData.hasOwnProperty('address')) {
      submission.address = formData.address;
    }
    
    if (formData.hasOwnProperty('birthdate')) {
      // Only add birthdate if it's not an empty string
      if (formData.birthdate) {
        submission.birthdate = formData.birthdate;
      } else {
        // Set to null if empty to avoid date parsing errors
        submission.birthdate = null;
      }
    }
    
    if (formData.hasOwnProperty('aboutYou')) {
      submission.about_you = formData.aboutYou;
    }
    
    // Insert the form data into Supabase
    const { data, error } = await supabase
      .from('form_submissions')
      .insert([submission])
      .select();
    
    if (error) {
      throw error;
    }
    
    // Return the ID of the newly created record
    res.json({ 
      success: true, 
      message: 'Form data saved successfully',
      id: data[0].id
    });
  } catch (error) {
    console.error('Error saving form to Supabase:', error);
    res.status(500).json({ success: false, message: 'Error saving form data' });
  }
});

// Update an existing form submission
app.put('/api/update-form/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    
    // Create an update object with only the fields that are present
    const updateData = {
      is_complete: formData.isComplete || false,
      last_updated: new Date()
    };
    
    // Add username and password if provided (they should be present in most cases)
    if (formData.username) {
      updateData.username = formData.username;
    }
    
    if (formData.password) {
      updateData.password = formData.password;
    }
    
    // Only add other fields that are present in the submitted data
    if (formData.hasOwnProperty('address')) {
      updateData.address = formData.address;
    }
    
    if (formData.hasOwnProperty('birthdate')) {
      // Only add birthdate if it's not an empty string
      if (formData.birthdate) {
        updateData.birthdate = formData.birthdate;
      } else {
        // Set to null if empty to avoid date parsing errors
        updateData.birthdate = null;
      }
    }
    
    if (formData.hasOwnProperty('aboutYou')) {
      updateData.about_you = formData.aboutYou;
    }
    
    // Update the record in Supabase
    const { data, error } = await supabase
      .from('form_submissions')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      throw error;
    }
    
    res.json({ 
      success: true, 
      message: 'Form data updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating form in Supabase:', error);
    res.status(500).json({ success: false, message: 'Error updating form data' });
  }
});

// Route to get a specific form submission by ID
app.get('/api/form-submission/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Form submission not found' });
    }
    
    // For security in a real application, you would typically remove sensitive data like passwords
    const sanitizedData = {
      ...data,
      password: '********' // Mask the password
    };
    
    res.json(sanitizedData);
  } catch (error) {
    console.error('Error fetching submission from Supabase:', error);
    res.status(500).json({ error: 'Failed to fetch form submission' });
  }
});

// Route to get all form submissions
app.get('/api/form-submissions', async (req, res) => {
  try {
    // Fetch all submissions from Supabase, ordered by last update (newest first)
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .order('last_updated', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // For security in a real application, you would typically remove sensitive data like passwords
    const sanitizedData = data.map(record => ({
      ...record,
      password: '********' // Mask the password
    }));
    
    res.json(sanitizedData);
  } catch (error) {
    console.error('Error fetching submissions from Supabase:', error);
    res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
});

// Add a root route for health checks
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});