// Backend/routes/configRoutes.js
const express = require('express');
const { getFormConfig, updateFormConfig } = require('../controllers/configController');
const router = express.Router();

router.get('/form-config', getFormConfig);
router.post('/update-form-config', updateFormConfig);

module.exports = router;