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
      title: "Spersonalizowane cele",
      description: "Na podstawie Twoich danych z onboardingu"
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Ulubione kuchnie", 
      description: "Wybierz swoje preferowane style kulinarne"
    },
    {
      icon: <ChefHat className="w-5 h-5" />,
      title: "Poziom gotowania",
      description: "Przepisy dopasowane do Twoich umiejętności"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Czas przygotowania",
      description: "Posiłki pasujące do Twojego stylu życia"
    }
  ];

  const basicFeatures = [
    {
      icon: <Apple className="w-5 h-5" />,
      title: "Podstawowe preferencje",
      description: "Typ diety, kalorie, alergie"
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Szybkie generowanie",
      description: "Plan na tydzień w kilka minut"
    }
  ];

  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 bg-[#0CC5BA]/10 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-10 h-10 text-[#0CC5BA]" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-[#0CC5BA] mb-2">
          Brak planu posiłków
        </h3>
        <p className="text-gray-600 max-w-xs mx-auto mb-6">
          Utwórz swój pierwszy plan posiłków, aby otrzymać spersonalizowane sugestie posiłków dostosowane do Twoich celów żywieniowych.
        </p>
        <Button 
          onClick={() => setLocation('/meal-planning-quiz')}
          className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white font-medium hover:from-blue-500 hover:to-[#0CC5BA] shadow-md px-6 py-2 rounded-lg"
        >
          Utwórz plan posiłków
        </Button>
      </div>
    </div>
  );
}