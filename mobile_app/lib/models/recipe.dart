/// Recipe model for Kitchen*IT
/// Ingredients and instructions are REQUIRED (non-null) per product requirements.
class Ingredient {
  final String name;
  final double? amount;
  final String? unit;
  final String original;

  Ingredient({
    required this.name,
    required this.original,
    this.amount,
    this.unit,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      name: (json['name'] ?? '').toString(),
      original: (json['original'] ?? '').toString(),
      amount: json['amount'] == null ? null : (json['amount'] as num).toDouble(),
      unit: json['unit']?.toString(),
    );
  }
}

class Recipe {
  final int apiId;
  final String title;
  final String image;
  final String instructions; // REQUIRED
  final List<Ingredient> ingredients; // REQUIRED
  final String? sourceUrl;
  final int? readyInMinutes;
  final int? servings;
  final String? id; // DB id when saved

  Recipe({
    required this.apiId,
    required this.title,
    required this.image,
    required this.instructions,
    required this.ingredients,
    this.sourceUrl,
    this.readyInMinutes,
    this.servings,
    this.id,
  });

  factory Recipe.fromJson(Map<String, dynamic> json) {
    final ingredientsJson = (json['ingredients'] as List<dynamic>? ?? [])
        .map((e) => Ingredient.fromJson(e as Map<String, dynamic>))
        .toList();

    if (ingredientsJson.isEmpty || (json['instructions'] ?? '').toString().isEmpty) {
      throw ArgumentError('Recipe missing required ingredients or instructions');
    }

    return Recipe(
      apiId: (json['apiId'] ?? json['id']) as int,
      title: (json['title'] ?? '').toString(),
      image: (json['image'] ?? '').toString(),
      instructions: (json['instructions'] ?? '').toString(),
      ingredients: ingredientsJson,
      sourceUrl: json['sourceUrl']?.toString(),
      readyInMinutes: (json['readyInMinutes'] as num?)?.toInt(),
      servings: (json['servings'] as num?)?.toInt(),
      id: json['_id']?.toString(),
    );
  }
}