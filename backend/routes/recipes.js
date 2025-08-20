/**
 * Recipe routes
 * - GET /search?q=...&offset=0&number=10
 *   Uses Spoonacular:
 *   1) complexSearch (instructionsRequired=true)
 *   2) informationBulk (ids=...) to fetch full details (ingredients + instructions) efficiently
 * - POST /save  (auth) Save a recipe snapshot to user's collection (ingredients required)
 * - DELETE /save/:id (auth) Remove saved recipe
 */
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const auth = require('../middleware/auth');
const Recipe = require('../models/Recipe');

const router = express.Router();

// Short-TTL cache to protect free tier (cache search results for 10 minutes)
const cache = new NodeCache({ stdTTL: 600, useClones: false });

const BASE = 'https://api.spoonacular.com';
const API_KEY = process.env.SPOONACULAR_API_KEY;

/** Map Spoonacular extendedIngredients -> normalized array */
function mapIngredients(extendedIngredients = []) {
  return extendedIngredients.map(ing => ({
    name: ing.name || (ing.originalName || '').trim(),
    amount: typeof ing.amount === 'number' ? ing.amount : undefined,
    unit: ing.unit || undefined,
    original: ing.original || `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()
  })).filter(x => x.original); // ensure we keep only valid lines
}

/** Build a single instructions string from either instructions or analyzedInstructions */
function buildInstructions(info) {
  if (info.instructions && info.instructions.trim().length > 0) {
    return info.instructions.trim();
  }
  const analyzed = info.analyzedInstructions || [];
  const lines = [];
  for (const block of analyzed) {
    for (const s of (block.steps || [])) {
      if (s.step) lines.push(`${s.number ? s.number + '. ' : ''}${s.step.trim()}`);
    }
  }
  return lines.join('\n').trim();
}

/** GET /api/recipes/search */
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const number = Math.max(1, Math.min(parseInt(req.query.number || '10', 10), 20));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

    if (!q) return res.status(400).json({ message: 'Query parameter q is required' });
    if (!API_KEY) return res.status(500).json({ message: 'API not configured' });

    const cacheKey = `complex:${q}:${offset}:${number}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // 1) complexSearch for IDs (instructionsRequired=true ensures cookable recipes)
    const complexResp = await axios.get(`${BASE}/recipes/complexSearch`, {
      params: {
        apiKey: API_KEY,
        query: q,
        number,
        offset,
        instructionsRequired: true
        // NOTE: We do NOT set addRecipeInformation here to keep this call light;
        // we'll fetch full details in a single bulk call next.
      },
      timeout: 10_000
    });

    const results = complexResp.data?.results || [];
    if (results.length === 0) {
      cache.set(cacheKey, []);
      return res.json([]);
    }

    const ids = results.map(r => r.id).join(',');

    // 2) informationBulk to get full details
    const bulkResp = await axios.get(`${BASE}/recipes/informationBulk`, {
      params: { apiKey: API_KEY, ids },
      timeout: 10_000
    });

    const full = (bulkResp.data || []).map(info => {
      const ingredients = mapIngredients(info.extendedIngredients);
      const instructions = buildInstructions(info);

      return {
        id: info.id,
        apiId: info.id,
        title: info.title,
        image: info.image,
        sourceUrl: info.sourceUrl,
        readyInMinutes: info.readyInMinutes,
        servings: info.servings,
        ingredients,
        instructions
      };
    })
    // enforces "ingredients required" at the API layer too
    .filter(item => Array.isArray(item.ingredients) && item.ingredients.length > 0 && item.instructions);

    // keeps only fields the client needs for list view + detail
    cache.set(cacheKey, full);
    return res.json(full);
  } catch (e) {
    console.error('search error', e?.response?.data || e.message);
    return res.status(500).json({ message: 'Recipe search failed' });
  }
});

/** POST /api/recipes/save 
 * Body: the recipe object returned from /search for a single item
 */
router.post('/save', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      apiId, title, image, sourceUrl, readyInMinutes, servings,
      ingredients, instructions
    } = req.body || {};

    if (!apiId || !title || !image) {
      return res.status(400).json({ message: 'apiId, title, and image are required' });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'ingredients are required and cannot be empty' });
    }
    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ message: 'instructions are required' });
    }

    const doc = await Recipe.create({
      apiId,
      title,
      image,
      sourceUrl,
      readyInMinutes,
      servings,
      ingredients,
      instructions,
      owner: userId
    });

    return res.json({ message: 'Recipe saved', id: doc._id });
  } catch (e) {
    console.error('save recipe error', e);
    return res.status(500).json({ message: 'Could not save recipe' });
  }
});

/** DELETE /api/recipes/save/:id  (auth) */
router.delete('/save/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const deleted = await Recipe.deleteOne({ _id: id, owner: userId });
    if (deleted.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Recipe removed' });
  } catch (e) {
    console.error('delete recipe error', e);
    return res.status(500).json({ message: 'Could not remove recipe' });
  }
});

module.exports = router;