// Test the optimized meal planning system for speed and accuracy
import fetch from 'node-fetch';

async function testOptimizedMealPlanning() {
  console.log('🧪 Testing Optimized Meal Planning System\n');
  
  const testCases = [
    {
      name: "Simple Omnivore (should use templates - very fast)",
      preferences: {
        dietaryType: "omnivore",
        calorieTarget: 2000,
        mealsPerDay: 3,
        allergies: [],
        excludedIngredients: [],
        preferredIngredients: [],
        cuisinePreferences: [],
        healthGoals: [],
        maxCookingTime: 30,
        budgetPreference: "medium",
        cookingSkillLevel: "beginner"
      }
    },
    {
      name: "Medium Complexity (should use hybrid - fast)",
      preferences: {
        dietaryType: "omnivore",
        calorieTarget: 2200,
        mealsPerDay: 3,
        allergies: ["nuts"],
        excludedIngredients: ["dairy"],
        preferredIngredients: ["chicken", "rice"],
        cuisinePreferences: ["azjatycka"],
        healthGoals: ["weight_loss"],
        maxCookingTime: 25,
        budgetPreference: "low",
        cookingSkillLevel: "intermediate"
      }
    },
    {
      name: "High Complexity (should use AI-mini - medium speed)",
      preferences: {
        dietaryType: "vegetarian",
        calorieTarget: 1800,
        mealsPerDay: 3,
        allergies: ["gluten", "nuts", "soy"],
        excludedIngredients: ["eggs", "dairy", "wheat"],
        preferredIngredients: ["quinoa", "legumes", "vegetables"],
        cuisinePreferences: ["mediterranean", "azjatycka"],
        healthGoals: ["muscle_gain", "energy_boost"],
        maxCookingTime: 15,
        budgetPreference: "high",
        cookingSkillLevel: "advanced"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('⏱️  Starting timer...');
    
    const startTime = Date.now();
    
    try {
      // Test the optimized meal planning endpoint
      const response = await fetch('http://localhost:5000/api/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=test-session' // Mock session for testing
        },
        body: JSON.stringify({
          targetDate: '2025-06-27',
          replaceExisting: false,
          ...testCase.preferences
        })
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`⏱️  Generation completed in: ${duration.toFixed(2)} seconds`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success!');
        console.log(`📊 Meals generated: ${result.meals?.length || 0}`);
        console.log(`🔥 Total calories: ${result.totalCalories || 'N/A'}`);
        
        // Validate meal content
        if (result.meals && result.meals.length > 0) {
          console.log('🍽️  Sample meals:');
          result.meals.slice(0, 2).forEach((meal, index) => {
            console.log(`   ${index + 1}. ${meal.name} (${meal.mealType})`);
          });
        }
        
        // Check if generation time meets our target
        if (duration <= 20) {
          console.log('🚀 SPEED TARGET MET: Under 20 seconds');
        } else {
          console.log('⚠️  Speed target missed: Over 20 seconds');
        }
        
      } else {
        console.log('❌ Failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`❌ Error after ${duration.toFixed(2)} seconds:`, error.message);
    }
    
    console.log('─'.repeat(60));
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('• Simple cases should complete in under 3 seconds');
  console.log('• Medium complexity should complete in under 10 seconds'); 
  console.log('• High complexity should complete in under 20 seconds');
  console.log('• All cases should maintain accuracy and personalization');
}

// Run the test
testOptimizedMealPlanning().catch(console.error);