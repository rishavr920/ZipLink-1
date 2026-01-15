const express = require('express');
const urlRoutes = require('./routes/urlRoutes');
const app = express();
const cors = require('cors');

// Trust proxy when behind nginx/load balancer
// This allows express-rate-limit to correctly identify users via X-Forwarded-For header
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.send('System is Healthy 🚀'));

// API Routes
app.use('/', urlRoutes);

module.exports = app;