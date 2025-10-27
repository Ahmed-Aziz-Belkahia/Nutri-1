import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface FoodDetailViewProps {
  food?: {
    id?: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image?: string;
    isComposite?: boolean;
    components?: Array<{
      name: string;
      calories: number;
      protein: string | number;
      carbs: string | number;
      fat: string | number;
      size?: 'small' | 'medium' | 'large';
      quantity?: number;
      details?: {
        type?: string;
        preparation?: string;
        texture?: string;
        estimatedWeight?: string;
        cookingMethod?: string;
        doneness?: string;
        temperature?: string;
      };
    }>;
  };
  isLoading?: boolean;
  onSave?: (food: any) => void;
}

export default function FoodDetailView({ food, isLoading }: FoodDetailViewProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState(1);

  if (isLoading || !food) {
    return (
      <div className="fixed inset-0 bg-white">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F8F9FA] overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 fixed top-0 left-0 right-0 z-10 bg-[#F8F9FA]">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-3 pt-16 pb-32">
        {/* Food Photo Card */}
        <div className="bg-white rounded-3xl overflow-hidden mb-4">
          <div className="aspect-square bg-gray-50">
            {food.image ? (
              <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Food Info */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold">{food.name}</h1>
            </div>

            {/* Quantity Selector (only show for non-composite meals) */}
            {!food.isComposite && (
              <div className="flex justify-end gap-4 items-center mb-4">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm"
                >
                  -
                </button>
                <span className="text-base w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            )}

            {/* Calories */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5">
                <svg viewBox="0 0 24 24" className="w-full h-full text-orange-500">
                  <path fill="currentColor" d="M11.5,20L16.36,10.27H13V4L8.64,13.73H12V20H11.5M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                </svg>
              </div>
              <span className="text-lg font-semibold">
                {Math.round(food.isComposite ? food.calories : (Number(food.calories) * quantity))}
              </span>
              <span className="text-gray-500">{t('nutrition.calories', 'Kalorie')}</span>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-rose-500">
                      <path fill="currentColor" d="M8.5,3A5.5,5.5 0 0,1 14,8.5C14,9.83 13.53,11.05 12.74,12H21V21H12V12.74C11.05,13.53 9.83,14 8.5,14A5.5,5.5 0 0,1 3,8.5A5.5,5.5 0 0,1 8.5,3Z" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">{t('nutrition.protein', 'Białko')}</span>
                </div>
                <div className="text-base font-medium">
                  {food.isComposite ? food.protein : Math.round(Number(food.protein) * quantity)}g
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-amber-500">
                      <path fill="currentColor" d="M12,2L6.5,11H17.5L12,2M12,5.84L13.93,9H10.06L12,5.84M17.5,13C15.17,13 13.89,14.98 14.33,17.23L22,13V17L14.33,21.23C13.89,23.48 15.17,25.46 17.5,25.46A3.5,3.5 0 0,0 21,21.96V17.46A3.5,3.5 0 0,0 17.5,13M6.5,13A3.5,3.5 0 0,0 3,16.46V20.96A3.5,3.5 0 0,0 6.5,24.46C8.83,24.46 10.11,22.48 9.67,20.23L2,24V20L9.67,15.77C10.11,13.52 8.83,13 6.5,13Z" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">{t('nutrition.carbs', 'Węglowodany')}</span>
                </div>
                <div className="text-base font-medium">
                  {food.isComposite ? food.carbs : Math.round(Number(food.carbs) * quantity)}g
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-blue-500">
                      <path fill="currentColor" d="M19.5,9.5C19.5,13.09 16.09,16.5 12.5,16.5H11.5A3,3 0 0,1 8.5,13.5A3,3 0 0,1 11.5,10.5H13A2,2 0 0,0 15,8.5A2,2 0 0,0 13,6.5H7.5A3,3 0 0,0 4.5,9.5A3,3 0 0,0 7.5,12.5H9A2,2 0 0,1 11,14.5A2,2 0 0,1 9,16.5H3" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">{t('nutrition.fat', 'Tłuszcze')}</span>
                </div>
                <div className="text-base font-medium">
                  {food.isComposite ? food.fat : Math.round(Number(food.fat) * quantity)}g
                </div>
              </div>
            </div>

            {/* Food Components Details */}
            {food.isComposite && food.components && food.components.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3 text-[#0CC5BA]">{t('meal.basicProperties', 'PODSTAWOWE WŁAŚCIWOŚCI')}</h3>
                {food.components.map((component, index) => (
                  <div key={index} className="mb-4 p-3 bg-gray-50 rounded-2xl">
                    <h4 className="font-medium text-gray-800 mb-2">{component.name}</h4>
                    {component.details && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        {component.details.type && (
                          <div><span className="text-gray-500">{t("meal.details.type", "Typ")}:</span> {component.details.type}</div>
                        )}
                        {component.details.preparation && (
                          <div><span className="text-gray-500">{t("meal.details.preparation", "Przygotowanie")}:</span> {component.details.preparation}</div>
                        )}
                        {component.details.texture && (
                          <div><span className="text-gray-500">{t("meal.details.texture", "Tekstura")}:</span> {component.details.texture}</div>
                        )}
                        {component.details.estimatedWeight && (
                          <div><span className="text-gray-500">{t("meal.details.weight", "Waga")}:</span> {component.details.estimatedWeight}</div>
                        )}
                      </div>
                    )}
                    
                    <h5 className="font-medium text-[#0CC5BA] mb-2">{t('meal.preparationDetails', 'SZCZEGÓŁY PRZYGOTOWANIA')}</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {component.details?.cookingMethod && (
                        <div><span className="text-gray-500">{t("meal.details.cookingMethod", "Metoda gotowania")}:</span> {component.details.cookingMethod}</div>
                      )}
                      {component.details?.doneness && (
                        <div><span className="text-gray-500">{t("meal.details.doneness", "Stopień wypieczenia")}:</span> {component.details.doneness}</div>
                      )}
                      {component.details?.temperature && (
                        <div><span className="text-gray-500">{t("meal.details.temperature", "Temperatura")}:</span> {component.details.temperature}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Health Score */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-rose-500">
                    <path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">{t('meal.healthScore', 'Ocena zdrowotna')}</span>
                <span className="text-sm font-medium ml-auto">6/10</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-rose-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#F8F9FA]">
        <Button
          className="w-full h-12 bg-black text-white hover:bg-black/90 rounded-2xl"
          onClick={() => {
            toast({
              title: t('meal.viewing', 'Przeglądasz posiłek'),
              description: t('meal.alreadySaved', 'Ten posiłek jest już zapisany w Twoim dzienniku.')
            });
            navigate('/dashboard');
          }}
        >
          {t('common.back', 'Wróć do pulpitu')}
        </Button>
      </div>
    </div>
  );
}