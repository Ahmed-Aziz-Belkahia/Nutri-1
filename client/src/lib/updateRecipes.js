// This is a utility script to update recipes with ingredients and instructions
// It uses the new PUT endpoint we created

async function updateRecipes() {
  // Get authentication token by logging in
  const loginResponse = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'piotrekster1998@gmail.com',
      password: 'password'
    }),
    credentials: 'include'
  });

  const loginData = await loginResponse.json();
  if (!loginData.ok) {
    console.error('Login failed', loginData);
    return;
  }
  
  console.log('Login successful');

  // Recipe updates - adding ingredients and instructions to each recipe
  const recipeUpdates = {
    24: { // Bright Start (Day 2) - breakfast
      ingredients: [
        "2 large eggs",
        "1/4 cup Greek yogurt",
        "1 cup spinach, chopped",
        "1/2 avocado, sliced",
        "1 slice whole grain bread, toasted",
        "1 tablespoon olive oil",
        "1/4 teaspoon salt",
        "1/8 teaspoon black pepper",
        "1 tablespoon fresh chives, chopped"
      ],
      instructions: [
        "Heat olive oil in a non-stick pan over medium heat.",
        "Whisk eggs in a bowl with salt and pepper.",
        "Pour the eggs into the heated pan and cook until set but still creamy, about 2-3 minutes.",
        "Meanwhile, toast the bread.",
        "Place the toast on a plate and spread the yogurt on top.",
        "Add the spinach, then the cooked eggs.",
        "Top with sliced avocado and sprinkle with fresh chives.",
        "Serve immediately for a protein-rich breakfast."
      ]
    },
    22: { // Lunchtime Luxury (Day 2) - lunch
      ingredients: [
        "4 oz grilled chicken breast, sliced",
        "1 cup mixed greens",
        "1/2 cup quinoa, cooked",
        "1/4 cup cherry tomatoes, halved",
        "1/4 cup cucumber, diced",
        "2 tablespoons feta cheese, crumbled",
        "2 tablespoons olive oil",
        "1 tablespoon lemon juice",
        "1 teaspoon honey",
        "1/2 teaspoon Dijon mustard",
        "Salt and pepper to taste"
      ],
      instructions: [
        "Cook quinoa according to package instructions and let cool.",
        "In a small bowl, whisk together olive oil, lemon juice, honey, mustard, salt, and pepper to make the dressing.",
        "In a large bowl, combine mixed greens, cooked quinoa, cherry tomatoes, and cucumber.",
        "Add the sliced grilled chicken on top.",
        "Drizzle with the prepared dressing.",
        "Sprinkle with crumbled feta cheese.",
        "Toss gently before serving.",
        "Can be prepared ahead and refrigerated for up to 24 hours."
      ]
    },
    23: { // Evening Elegance (Day 2) - dinner
      ingredients: [
        "5 oz salmon fillet",
        "1 cup broccoli florets",
        "1/2 cup brown rice, cooked",
        "1 tablespoon olive oil",
        "1 clove garlic, minced",
        "1 lemon, sliced",
        "1 teaspoon dried dill",
        "1/4 teaspoon paprika",
        "Salt and pepper to taste",
        "2 tablespoons fresh parsley, chopped"
      ],
      instructions: [
        "Preheat oven to 400°F (200°C).",
        "Place salmon on a baking sheet lined with parchment paper.",
        "Season with salt, pepper, paprika, and dried dill.",
        "Place lemon slices on top of the salmon.",
        "Bake for 12-15 minutes until salmon flakes easily with a fork.",
        "Meanwhile, heat olive oil in a pan over medium heat.",
        "Add minced garlic and sauté for 30 seconds until fragrant.",
        "Add broccoli and cook for 5-7 minutes until tender-crisp.",
        "Serve salmon with broccoli and brown rice.",
        "Garnish with fresh parsley and a squeeze of lemon juice."
      ]
    }
  };

  // Update each recipe
  for (const [recipeId, updates] of Object.entries(recipeUpdates)) {
    try {
      console.log(`Updating recipe ${recipeId}...`);
      
      const updateResponse = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: updates.ingredients,
          instructions: updates.instructions
        }),
        credentials: 'include'
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error(`Failed to update recipe ${recipeId}:`, errorData);
        continue;
      }

      const updatedRecipe = await updateResponse.json();
      console.log(`Recipe ${recipeId} updated successfully:`, updatedRecipe);
    } catch (error) {
      console.error(`Error updating recipe ${recipeId}:`, error);
    }
  }

  console.log('Recipe updates completed.');
}

// Auto-execute
updateRecipes().catch(error => {
  console.error('Script execution failed:', error);
});