// backend/controllers/itemController.js
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// @desc    Create a new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      quantity, 
      price, 
      unit, 
      location, 
      sku, 
      threshold, 
      image 
    } = req.body;
    
    // Check if SKU already exists
    if (sku) {
      const itemExists = await Item.findOne({ sku });
      
      if (itemExists) {
        return res.status(400).json({ message: 'Item with this SKU already exists' });
      }
    }
    
    // Create new item
    const item = await Item.create({
      name,
      description,
      category,
      quantity,
      price,
      unit,
      location,
      sku,
      threshold,
      image,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id
    });
    
    // Create initial transaction
    if (quantity > 0) {
      await Transaction.create({
        item: item._id,
        type: 'in',
        quantity,
        performedBy: req.user._id,
        notes: 'Initial inventory'
      });
    }
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all items
// @route   GET /api/items
// @access  Private
exports.getItems = async (req, res) => {
  try {
    // Build query
    const query = {};
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }
    
    if (req.query.lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$threshold'] };
    }
    
    const items = await Item.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name');
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get item by ID
// @route   GET /api/items/:id
// @access  Private
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name');
    
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      quantity, 
      price, 
      unit, 
      location, 
      sku, 
      threshold, 
      image 
    } = req.body;
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if SKU changed and already exists
    if (sku && sku !== item.sku) {
      const itemExists = await Item.findOne({ sku });
      
      if (itemExists) {
        return res.status(400).json({ message: 'Item with this SKU already exists' });
      }
    }
    
    // Check if quantity changed to create transaction
    if (quantity !== undefined && quantity !== item.quantity) {
      const difference = quantity - item.quantity;
      
      await Transaction.create({
        item: item._id,
        type: difference > 0 ? 'in' : 'out',
        quantity: Math.abs(difference),
        performedBy: req.user._id,
        notes: 'Quantity adjustment'
      });
    }
    
    // Update item fields
    item.name = name || item.name;
    item.description = description !== undefined ? description : item.description;
    item.category = category || item.category;
    item.quantity = quantity !== undefined ? quantity : item.quantity;
    item.price = price !== undefined ? price : item.price;
    item.unit = unit || item.unit;
    item.location = location !== undefined ? location : item.location;
    item.sku = sku || item.sku;
    item.threshold = threshold !== undefined ? threshold : item.threshold;
    item.image = image || item.image;
    item.lastUpdatedBy = req.user._id;
    item.lastUpdated = Date.now();
    
    const updatedItem = await item.save();
    
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private/Admin
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete associated transactions
    await Transaction.deleteMany({ item: item._id });
    
    // Delete the item
    await item.deleteOne();
    
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add stock transaction
// @route   POST /api/items/:id/transaction
// @access  Private
exports.addTransaction = async (req, res) => {
  try {
    const { type, quantity, notes, reference } = req.body;
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Create transaction
    const transaction = await Transaction.create({
      item: item._id,
      type,
      quantity,
      notes,
      reference,
      performedBy: req.user._id
    });
    
    // Update item quantity
    if (type === 'in') {
      item.quantity += quantity;
    } else if (type === 'out') {
      if (item.quantity < quantity) {
        return res.status(400).json({ message: 'Not enough stock available' });
      }
      item.quantity -= quantity;
    }
    
    item.lastUpdatedBy = req.user._id;
    item.lastUpdated = Date.now();
    
    await item.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transactions for an item
// @route   GET /api/items/:id/transactions
// @access  Private
exports.getItemTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ item: req.params.id })
      .populate('performedBy', 'name')
      .sort({ date: -1 });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};