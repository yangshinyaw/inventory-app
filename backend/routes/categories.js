// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const { 
  createCategory, 
  getCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.route('/')
  .post(protect, authorize('admin', 'manager'), createCategory)
  .get(protect, getCategories);

router.route('/:id')
  .get(protect, getCategoryById)
  .put(protect, authorize('admin', 'manager'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;