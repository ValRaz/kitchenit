/**
 * Recipe model (saved by user)
 * - Ingredients REQUIRED (app requirement)
 * - We store a snapshot of details for offline/use later
 */
const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: false },
  unit: { type: String, required: false },
  original: { type: String, required: true }
}, { _id: false });

const RecipeSchema = new mongoose.Schema({
  // Spoonacular identifiers & metadata
  apiId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  image: { type: String, required: true },
  sourceUrl: { type: String, required: false },
  readyInMinutes: { type: Number, required: false },
  servings: { type: Number, required: false },

  // REQUIRED ingredients & instructions
  ingredients: { type: [IngredientSchema], required: true, validate: v => v.length > 0 },
  instructions: { type: String, required: true }, // flattened text for easy display

  // owner
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', RecipeSchema);