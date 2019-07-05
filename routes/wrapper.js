const express = require('express');

const router = express.Router();

// Import home controller
const wrapperController = require('../controllers/wrapperController');

const uploadPath = 'public/uploads';

// Contact routes
router.post('/', wrapperController.post);

router.get('/:uuid', (req, res, next) => {
  req.uploadPath = uploadPath;
  wrapperController.getByUUID(req, res, next);
});

router.get('/', (req, res, next) => {
  req.uploadPath = uploadPath;
  wrapperController.getAll(req, res, next);
});

router.get('/:uuid/delete', (req, res, next) => {
  req.uploadPath = uploadPath;
  wrapperController.deleteByUUID(req, res, next);
});

// Export API routes
module.exports = router;
