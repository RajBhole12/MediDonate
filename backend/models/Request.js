const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  medicine_name: { type: String, required: true },
  quantity:  { type: Number, required: true },
  city:      { type: String, required: true },
  urgency:   { type: String, required: true },
  ngo_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, default: 'requested' }
}, { timestamps: true });

module.exports = mongoose.models.Request || mongoose.model('Request', requestSchema);
