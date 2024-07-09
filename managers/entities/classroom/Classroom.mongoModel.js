const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});
ClassroomSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', ClassroomSchema);