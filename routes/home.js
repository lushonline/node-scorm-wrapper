const express = require('express');

const router = express.Router();

// Import home controller
const homeController = require('../controllers/homeController');

// Contact routes
router.get('/', homeController.view);

// Export API routes
module.exports = router;
