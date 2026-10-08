const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const { validateContactForm } = require('../middlewares/validator');
const verifyToken = require('../middlewares/auth');


// Public - Anyone can submit
router.post('/contact', validateContactForm, contactController.submitContactForm);

// Admin-only routes - use verifyToken only
router.get('/contact', verifyToken, contactController.getAllSubmissions);
router.get('/contact/:id', verifyToken, contactController.getSubmissionById);
router.post('/contact/:id', verifyToken, validateContactForm, contactController.updateSubmission);
router.delete('/contact/:id', verifyToken, contactController.deleteSubmission);


module.exports = router;
