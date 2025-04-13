// Backend/controllers/submissionController.js
const { supabase } = require('../db'); // Import Supabase client

// Helper function to sanitize submission data (remove password)
const sanitizeSubmission = (submission) => {
  if (!submission) return null;
  const { password, ...rest } = submission;
  return { ...rest, password: '*** MASKED ***' }; // Mask password explicitly
};

// Helper to prepare data for Supabase (handles optional fields, snake_case)
const prepareSubmissionData = (formData) => {
  const submission = {
    username: formData.username,
    password: formData.password,
    is_complete: formData.isComplete || formData.is_complete || false,
    last_updated: new Date()
  };

  // Only add fields if they exist in the request body
  if (formData.hasOwnProperty('address')) {
    submission.address = formData.address;
  }
  
  if (formData.hasOwnProperty('birthdate')) {
    submission.birthdate = formData.birthdate || null; // Store null if empty
  }

  if (formData.hasOwnProperty('aboutYou')) {
      submission.about_you = formData.aboutYou;
  }

  // Remove properties with undefined values if necessary, though Supabase client might handle this
  Object.keys(submission).forEach(key => {
      if (submission[key] === undefined) {
          delete submission[key];
      }
  });

  return submission;
}

// POST /api/submit-form
const createSubmission = async (req, res) => {
  try {
    const submissionData = prepareSubmissionData(req.body);
    // Basic validation for required fields on creation
    if (!submissionData.username || !submissionData.password) {
        return res.status(400).json({ success: false, message: 'Username and password are required for new submissions.' });
    }

    const { data, error } = await supabase
      .from('form_submissions')
      .insert([submissionData])
      .select('id') // Only select the ID we need to return
      .single(); // Expecting a single record inserted

    if (error) throw error;

    if (!data || !data.id) {
        console.error("Supabase insert did not return an ID:", data);
        throw new Error("Failed to retrieve ID after insert.");
    }

    res.status(201).json({ // Use 201 Created status code
      success: true,
      message: 'Form data saved successfully',
      id: data.id // Return the ID of the newly created record
    });
  } catch (error) {
    console.error('Error saving form to Supabase:', error.message);
    res.status(500).json({ success: false, message: `Error saving form data: ${error.message}` });
  }
};

// PUT /api/update-form/:id
const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Form ID is required for update.' });
    }

    const updateData = prepareSubmissionData(req.body);
    delete updateData.password;
    updateData.last_updated = new Date();
    if (!req.body.hasOwnProperty('username')) delete updateData.username;
    if (!req.body.hasOwnProperty('password')) delete updateData.password;

    const { data, error } = await supabase
      .from('form_submissions')
      .update(updateData)
      .eq('id', id)
      .select('id') // Select something to confirm success
      .single();

    if (error) {
        if (error.code === 'PGRST204') { // Supabase specific code for no rows found
             return res.status(404).json({ success: false, message: 'Form submission not found for update.' });
        }
        throw error;
    }

    res.json({
      success: true,
      message: 'Form data updated successfully',
      id: data.id // Return the ID
    });
  } catch (error) {
    console.error('Error updating form in Supabase:', error.message);
    res.status(500).json({ success: false, message: `Error updating form data: ${error.message}` });
  }
};

// GET /api/form-submission/:id
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
     if (!id) {
        return res.status(400).json({ success: false, message: 'Form ID is required.' });
    }

    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle to return null instead of error if not found

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, message: 'Form submission not found' });
    }

    res.json(sanitizeSubmission(data)); // Return sanitized data
  } catch (error) {
    console.error('Error fetching submission from Supabase:', error.message);
    res.status(500).json({ success: false, message: `Failed to fetch form submission: ${error.message}` });
  }
};

// GET /api/form-submissions
const getAllSubmissions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .order('last_updated', { ascending: false }); // Keep ordering

    if (error) throw error;

    const sanitizedData = data.map(sanitizeSubmission); // Sanitize all records

    res.json(sanitizedData);
  } catch (error) {
    console.error('Error fetching submissions from Supabase:', error.message);
    res.status(500).json({ success: false, message: `Failed to fetch form submissions: ${error.message}` });
  }
};

module.exports = {
  createSubmission,
  updateSubmission,
  getSubmissionById,
  getAllSubmissions
};