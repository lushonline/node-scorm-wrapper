const express = require('express');

const router = express.Router();

// Import home controller
const wrapperController = require('../controllers/wrapperController');

// Contact routes
router.post('/', wrapperController.post);

// Export API routes
module.exports = router;
