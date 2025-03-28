const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ticker: String,
  quantity: Number,
  buyPrice: Number,
  dateAdded: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', stockSchema);
