/**
 * User routes
 * - GET /recipes    : list current user's saved recipes
 * - POST /notes     : add a note tied to a saved recipe
 * - GET /notes?recipe=<recipeId> : list user's notes (optionally filter by recipe)
 */
const express = require('express');
const auth = require('../middleware/auth');
const Recipe = require('../models/RecipeModel');
const Note = require('../models/NoteModel');

const router = express.Router();

// GET /api/user/recipes  (auth)
router.get('/recipes', auth, async (req, res) => {
  try {
    const list = await Recipe.find({ owner: req.user.userId }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    console.error('get saved recipes error', e);
    return res.status(500).json({ message: 'Failed to fetch saved recipes' });
  }
});

// POST /api/user/notes  (auth)
router.post('/notes', auth, async (req, res) => {
  try {
    const { recipeId, content } = req.body || {};
    if (!recipeId || !content) return res.status(400).json({ message: 'recipeId and content are required' });

    const recipe = await Recipe.findOne({ _id: recipeId, owner: req.user.userId });
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const note = await Note.create({ user: req.user.userId, recipe: recipe._id, content });
    return res.json({ message: 'Note saved', note });
  } catch (e) {
    console.error('add note error', e);
    return res.status(500).json({ message: 'Could not save note' });
  }
});

// GET /api/user/notes (auth)  optional ?recipe=<recipeId>
router.get('/notes', auth, async (req, res) => {
  try {
    const filter = { user: req.user.userId };
    if (req.query.recipe) filter.recipe = req.query.recipe;

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    return res.json(notes);
  } catch (e) {
    console.error('get notes error', e);
    return res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

module.exports = router;