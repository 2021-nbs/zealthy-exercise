// Backend/routes/submissionRoutes.js
const express = require('express');
const {
  createSubmission,
  updateSubmission,
  getSubmissionById,
  getAllSubmissions
} = require('../controllers/submissionController');
const router = express.Router();

// Note: Paths here are relative to where this router is mounted (e.g., /api)

router.post('/submit-form', createSubmission);         // Maps to POST /api/submit-form
router.put('/update-form/:id', updateSubmission);       // Maps to PUT /api/update-form/:id
router.get('/form-submission/:id', getSubmissionById); // Maps to GET /api/form-submission/:id
router.get('/form-submissions', getAllSubmissions);    // Maps to GET /api/form-submissions

module.exports = router;