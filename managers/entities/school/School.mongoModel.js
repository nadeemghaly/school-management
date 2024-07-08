// models/School.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model for admins
    required: true,
  },
  classrooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom'
}]
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model('School', SchoolSchema);