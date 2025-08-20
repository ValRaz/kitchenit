import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/recipe.dart';

/// Centralized HTTP client for Kitchen*IT
/// - Stores JWT in SharedPreferences
/// - Talks to our Render-hosted backend (never calls Spoonacular directly)
class ApiService {
  // TODO: set to your Render API base
  static String baseUrl = "https://<your-render-service>.onrender.com";
  static String? _token;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('authToken');
  }

  static Map<String, String> _headers() {
    final h = {'Content-Type': 'application/json'};
    if (_token != null) h['Authorization'] = 'Bearer $_token';
    return h;
  }

  static Future<void> signup(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['message'] ?? 'Signup failed');
    }
    final data = jsonDecode(res.body);
    _token = data['token'];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('authToken', _token!);
  }

  static Future<void> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['message'] ?? 'Login failed');
    }
    final data = jsonDecode(res.body);
    _token = data['token'];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('authToken', _token!);
  }

  /// Search recipes (server returns full details already; we map to Recipe)
  static Future<List<Recipe>> searchRecipes(String query) async {
    final url = Uri.parse('$baseUrl/api/recipes/search?q=${Uri.encodeQueryComponent(query)}');
    final res = await http.get(url, headers: _headers());
    if (res.statusCode != 200) {
      throw Exception('Search failed: ${res.statusCode}');
    }
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => Recipe.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> saveRecipe(Recipe r) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/recipes/save'),
      headers: _headers(),
      body: jsonEncode({
        'apiId': r.apiId,
        'title': r.title,
        'image': r.image,
        'sourceUrl': r.sourceUrl,
        'readyInMinutes': r.readyInMinutes,
        'servings': r.servings,
        'instructions': r.instructions,
        'ingredients': r.ingredients.map((i) => {
          'name': i.name,
          'amount': i.amount,
          'unit': i.unit,
          'original': i.original,
        }).toList()
      }),
    );
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['message'] ?? 'Save failed');
    }
  }

  static Future<List<Recipe>> getSavedRecipes() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/user/recipes'),
      headers: _headers(),
    );
    if (res.statusCode != 200) throw Exception('Failed to load saved recipes');
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => Recipe.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> addNote(String recipeDbId, String content) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/user/notes'),
      headers: _headers(),
      body: jsonEncode({'recipeId': recipeDbId, 'content': content}),
    );
    if (res.statusCode != 200) throw Exception('Failed to add note');
  }
}