import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, CalendarDays, Target, Clock, ChefHat, 
  Globe, Apple, Activity, Heart, Zap 
} from 'lucide-react';

interface MealPlanningWelcomeProps {
  userPreferences?: {
    hasNutritionPrefs: boolean;
    hasDietaryPrefs: boolean;
    weightGoal?: string;
    activityLevel?: string;
    dietaryType?: string;
  };
}

export default function MealPlanningWelcome({ userPreferences }: MealPlanningWelcomeProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Fetch user preferences if needed
  const { data: userNutritionPrefs } = useQuery({
    queryKey: ['userNutritionPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/user-nutrition-preferences');
      if (!response.ok) return null;
      return response.json();
    },
    retry: false
  });

  // Parse user preferences for display
  const contextualPrefs = userNutritionPrefs ? {
    hasNutritionPrefs: true,
    hasDietaryPrefs: true,
    weightGoal: userNutritionPrefs.weightGoal,
    activityLevel: userNutritionPrefs.activityLevel,
    dietaryType: 'omnivore' // Default since this comes from different table
  } : userPreferences;

  const smartFeatures = [
    {
      icon: <Target className="w-5 h-5" />,
      title: "Personalized goals",
      description: "Based on your onboarding data"
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Favorite cuisines", 
      description: "Choose your preferred culinary styles"
    },
    {
      icon: <ChefHat className="w-5 h-5" />,
      title: "Cooking level",
      description: "Recipes matched to your skills"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Prep time",
      description: "Meals that fit your lifestyle"
    }
  ];

  const basicFeatures = [
    {
      icon: <Apple className="w-5 h-5" />,
      title: "Basic preferences",
      description: "Diet type, calories, allergies"
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Quick generation",
      description: "A weekly plan in minutes"
    }
  ];

  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 bg-[#0CC5BA]/10 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-10 h-10 text-[#0CC5BA]" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-[#0CC5BA] mb-2">
          No meal plan yet
        </h3>
        <p className="text-gray-600 max-w-xs mx-auto mb-6">
          Create your first meal plan to get personalized meal suggestions aligned with your nutrition goals.
        </p>
        <Button 
          onClick={() => setLocation('/meal-planning-quiz')}
          className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white font-medium hover:from-blue-500 hover:to-[#0CC5BA] shadow-md px-6 py-2 rounded-lg"
        >
          Create meal plan
        </Button>
      </div>
    </div>
  );
}