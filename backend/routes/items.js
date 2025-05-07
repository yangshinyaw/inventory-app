// backend/routes/items.js
const express = require('express');
const router = express.Router();
const { 
  createItem, 
  getItems, 
  getItemById, 
  updateItem, 
  deleteItem,
  addTransaction,
  getItemTransactions
} = require('../controllers/itemController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.route('/:id')
  .get(protect, getItemById)
  .put(protect, authorize('admin', 'manager'), updateItem)
  .delete(protect, authorize('admin'), deleteItem);

// Transaction routes
router.route('/:id/transaction')
  .post(protect, addTransaction);

router.route('/:id/transactions')
  .get(protect, getItemTransactions);

module.exports = router;('/')
  .post(protect, authorize('admin', 'manager'), createItem)
  .get(protect, getItems);

router.route