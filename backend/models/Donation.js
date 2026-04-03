const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  donor_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicine_name: { type: String, required: true },
  quantity:   { type: Number, required: true },
  expiry_date: String,
  condition:  String,
  note:       String,
  status:     { type: String, default: 'pending' },
  admin_note: String
}, { timestamps: true });

module.exports = mongoose.models.Donation || mongoose.model('Donation', donationSchema);
