const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['ngo', 'donor', 'admin'], required: true },
  city:     { type: String, required: true }
}, { timestamps: true });

// Guard against "Cannot overwrite model" error on hot-reload
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
