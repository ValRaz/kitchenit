/**
 * Note model
 * - One note per recipe/user combo is fine; allow many as well.
 */
const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
  content:{ type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);