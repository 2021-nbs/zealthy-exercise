// Backend/server.js
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Keep allowed origins updated
const allowedOrigins = [
    'https://zealthy-exercise-fb2f.onrender.com',
    'https://zealthycodingexercise.netlify.app',
    'http://localhost:3000' // For local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware for parsing JSON bodies
app.use(bodyParser.json());

// Root route for health checks or basic info
app.get('/', (res) => {
  res.json({ status: 'Zealthy API is running', version: '1.0.0' });
});

// Mount the API routes under the /api prefix
app.use('/api', apiRoutes);

app.use((err, res) => {
  console.error("Unhandled Error:", err.stack || err); 

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
        res.status(404).json({ success: false, message: 'Resource not found.' });
    } else {
         res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
    }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});