// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the User schema
const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6 // Minimum length for passwords
  },
  userType: {
    type: String,
    enum: ['admin', 'superadmin'],
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
  },
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create and export the User model
module.exports = mongoose.model('User', UserSchema);