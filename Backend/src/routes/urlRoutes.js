const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const validateShortenUrl = require('../middleware/validation');
const limiter = require('../middleware/rateLimiter');

// Shorten a URL (with validation and rate limiting)
router.post('/api/shorten', limiter, validateShortenUrl, urlController.shortenUrl);

// Get redirect info (for frontend to handle redirects)
router.get('/api/redirect/:code', limiter, urlController.getRedirectInfo);

// Verify password for protected links
router.post('/api/verify-password/:code', limiter, urlController.verifyPassword);

// Redirect (The dynamic :code part should be at the bottom) - for direct browser access
router.get('/:code', urlController.redirect);

module.exports = router;