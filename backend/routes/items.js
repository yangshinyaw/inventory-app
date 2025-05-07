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
router.route('/')
  .post(protect, authorize('admin', 'manager'), createItem)
  .get(protect, getItems);

router.route