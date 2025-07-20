import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Apple } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MealComponent {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  quantity?: number;
  details?: {
    type?: string;
    cut?: string;
    cookingMethod?: string;
    doneness?: string;
    texture?: string;
    temperature?: string;
    color?: string;
    accompaniments?: string[];
    sauce?: string;
    seasonings?: string[];
    garnishes?: string[];
    presentation?: string;
    preparation?: string;
    estimatedWeight?: string;
  };
}

interface MealComponentsProps {
  components: MealComponent[];
}

// Helper function to calculate proper nutritional values based on quantity
const calculateAdjustedNutrition = (component: MealComponent) => {
  const quantity = component.quantity || 1;

  return {
    calories: Math.round(component.calories * quantity),
    protein: (component.protein * quantity).toFixed(1),
    carbs: (component.carbs * quantity).toFixed(1),
    fat: (component.fat * quantity).toFixed(1)
  };
};

export function MealComponents({ components }: MealComponentsProps) {
  const { t } = useTranslation();
  if (!components?.length) return null;

  // Calculate total nutrition values
  const totalNutrition = components.reduce((acc, component) => {
    const adjusted = calculateAdjustedNutrition(component);
    return {
      calories: acc.calories + parseInt(adjusted.calories.toString()),
      protein: (parseFloat(acc.protein) + parseFloat(adjusted.protein)).toFixed(1),
      carbs: (parseFloat(acc.carbs) + parseFloat(adjusted.carbs)).toFixed(1),
      fat: (parseFloat(acc.fat) + parseFloat(adjusted.fat)).toFixed(1)
    };
  }, { calories: 0, protein: '0', carbs: '0', fat: '0' });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {components.map((component, index) => {
          const nutrition = calculateAdjustedNutrition(component);
          return (
            <Card key={index} className="p-4 bg-card hover:bg-accent/5 transition-colors">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0CC5BA]/10 flex items-center justify-center">
                      <Apple className="h-5 w-5 text-[#0CC5BA]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-lg text-[#0CC5BA]">
                        {component.name}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {/* Handle different serving size formats correctly */}
                        {component.servingSize?.match(/^1\s+1\/2\s+/) 
                          ? component.servingSize.replace(/^1\s+/, '') // Remove the leading "1 " from "1 1/2 cup"
                          : component.servingSize?.match(/^\d+\s+/) 
                            ? component.servingSize 
                            : `${component.quantity || 1} ${(component.servingSize || 'serving').replace(/^(one|1)\s+/i, '')}`}
                        {component.details?.estimatedWeight && ` (${component.details.estimatedWeight})`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0CC5BA]/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-500">{t('nutrition.calories', 'Kalorie')}</p>
                    <p className="font-medium text-[#0CC5BA]">
                      {nutrition.calories} kcal
                    </p>
                  </div>
                  <div className="bg-[#0CC5BA]/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-500">{t('nutrition.protein', 'Białko')}</p>
                    <p className="font-medium text-[#0CC5BA]">
                      {nutrition.protein}g
                    </p>
                  </div>
                  <div className="bg-[#0CC5BA]/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-500">{t('nutrition.carbs', 'Węglowodany')}</p>
                    <p className="font-medium text-[#0CC5BA]">
                      {nutrition.carbs}g
                    </p>
                  </div>
                  <div className="bg-[#0CC5BA]/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-500">{t('nutrition.fat', 'Tłuszcz')}</p>
                    <p className="font-medium text-[#0CC5BA]">
                      {nutrition.fat}g
                    </p>
                  </div>
                </div>

                {component.details && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {component.details.type && (
                        <div className="text-sm">
                          <span className="text-gray-500">{t('mealComponents.type', 'Typ')}: </span>
                          <span className="text-gray-700">{component.details.type}</span>
                        </div>
                      )}
                      {component.details.cookingMethod && (
                        <div className="text-sm">
                          <span className="text-gray-500">{t('mealComponents.cooking', 'Gotowanie')}: </span>
                          <span className="text-gray-700">{component.details.cookingMethod}</span>
                        </div>
                      )}
                      {component.details.texture && (
                        <div className="text-sm">
                          <span className="text-gray-500">{t('mealComponents.texture', 'Tekstura')}: </span>
                          <span className="text-gray-700">{component.details.texture}</span>
                        </div>
                      )}
                      {component.details.preparation && (
                        <div className="text-sm">
                          <span className="text-gray-500">{t('mealComponents.prep', 'Przygotowanie')}: </span>
                          <span className="text-gray-700">{component.details.preparation}</span>
                        </div>
                      )}
                    </div>
                    {component.details.seasonings && component.details.seasonings.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">{t('mealComponents.seasonings', 'Przyprawy')}: </span>
                        <span className="text-gray-700">{component.details.seasonings.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 mt-4 bg-[#0CC5BA]/5">
        <h4 className="font-semibold text-[#0CC5BA] mb-3">{t('mealComponents.totalNutrition', 'Całkowite wartości odżywcze')}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('nutrition.calories', 'Kalorie')}</p>
            <p className="font-medium text-[#0CC5BA]">{totalNutrition.calories} kcal</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('nutrition.protein', 'Białko')}</p>
            <p className="font-medium text-[#0CC5BA]">{totalNutrition.protein}g</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('nutrition.carbs', 'Węglowodany')}</p>
            <p className="font-medium text-[#0CC5BA]">{totalNutrition.carbs}g</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('nutrition.fat', 'Tłuszcz')}</p>
            <p className="font-medium text-[#0CC5BA]">{totalNutrition.fat}g</p>
          </div>
        </div>
      </Card>
    </div>
  );
}