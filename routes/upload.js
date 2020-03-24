const express = require('express');
const multer = require('multer');

const router = express.Router();

// Import upload controller
const uploadController = require('../controllers/uploadController');

const uploadPath = 'public/uploads';

// overwrite the storage variable
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // call the callback, passing it the dynamic file name
    cb(null, file.originalname);
  },
});

// overwrite the upload variable
const upload = multer({ storage });

// Contact routes
router.get('/', uploadController.view);

router.post('/', upload.single('scormpif'), (req, res, next) => {
  req.uploadPath = uploadPath;
  uploadController.post(req, res, next);
});

// Export API routes
module.exports = router;
