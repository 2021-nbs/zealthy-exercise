// backend/routes/index.js
const express = require('express');
const configRoutes = require('./configRoutes');
const submissionRoutes = require('./submissionRoutes');

const router = express.Router();

// Mount the specific routers
// All routes defined in configRoutes will be prefixed with '/' relative to the mount point
router.use(configRoutes);
// All routes defined in submissionRoutes will be prefixed with '/' relative to the mount point
router.use(submissionRoutes);

module.exports = router;