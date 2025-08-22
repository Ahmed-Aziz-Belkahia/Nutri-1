import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  X, Plus, Minus, ChefHat, ArrowLeft, Sparkles, 
  Utensils, Clock, Users, CheckCircle2, Edit3, Trash2, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

// Polish translations for ingredients
const ingredientTranslations: Record<string, string> = {
  'lemon': 'cytryna',
  'lemons': 'cytryny',
  'eggplant': 'bakłażan',
  'eggplants': 'bakłażany',
  'pineapple': 'ananas',
  'garlic': 'czosnek',
  'orange': 'pomarańcza',
  'oranges': 'pomarańcze',
  'broccoli': 'brokuł',
  'cucumber': 'ogórek',
  'cucumbers': 'ogórki',
  'carrot': 'marchewka',
  'carrots': 'marchewki',
  'apple': 'jabłko',
  'apples': 'jabłka',
  'grapes': 'winogrona',
  'milk': 'mleko',
  'yogurt': 'jogurt',
  'green bell pepper': 'zielona papryka',
  'red bell pepper': 'czerwona papryka',
  'bell pepper': 'papryka',
  'strawberries': 'truskawki',
  'strawberry': 'truskawka',
  'eggs': 'jajka',
  'egg': 'jajko',
  'cherries': 'wiśnie',
  'cherry': 'wiśnia',
  'blueberries': 'jagody',
  'blueberry': 'jagoda',
  'radishes': 'rzodkiewka',
  'radish': 'rzodkiewka',
  'onion': 'cebula',
  'onions': 'cebule',
  'tomato': 'pomidor',
  'tomatoes': 'pomidory',
  'potato': 'ziemniak',
  'potatoes': 'ziemniaki',
  'spinach': 'szpinak',
  'lettuce': 'sałata',
  'cabbage': 'kapusta',
  'cheese': 'ser',
  'butter': 'masło',
  'bread': 'chleb',
  'rice': 'ryż',
  'pasta': 'makaron',
  'chicken': 'kurczak',
  'beef': 'wołowina',
  'pork': 'wieprzowina',
  'fish': 'ryba',
  'salmon': 'łosoś',
  'mushroom': 'grzyb',
  'mushrooms': 'grzyby',
  'banana': 'banan',
  'bananas': 'banany',
  'avocado': 'awokado',
  'paprika': 'papryka',
  'herbs': 'zioła',
  'basil': 'bazylia',
  'parsley': 'pietruszka',
  'dill': 'koper',
  'new ingredient': 'nowy składnik'
};

// Polish unit translations
const unitTranslations: Record<string, string> = {
  'pieces': 'sztuk',
  'piece': 'sztuka',
  'jar': 'słoik',
  'bunch': 'pęczek',
  'bowl': 'miska',
  'cup': 'szklanka',
  'tablespoon': 'łyżka',
  'teaspoon': 'łyżeczka',
  'gram': 'gram',
  'grams': 'gramów',
  'kilogram': 'kilogram',
  'kg': 'kg',
  'liter': 'litr',
  'ml': 'ml',
  'bulb': 'główka'
};

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  estimatedWeight: number;
  freshness?: string;
  quality?: string;
}

interface AnalysisData {
  ingredients: Ingredient[];
  confidence?: number;
  image?: string;
}

export default function IngredientConfirmation() {
  const [location, setLocation] = useLocation();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Recipe preferences state
  const [difficulty, setDifficulty] = useState<string>("Średni");
  const [cookingTime, setCookingTime] = useState<number[]>([30]);
  const [flavor, setFlavor] = useState<string>("Zrównoważony");
  
  const { toast } = useToast();
  const { t } = useTranslation();

  // Helper function to translate ingredient names to Polish
  const translateIngredient = (name: string): string => {
    const lowerName = name.toLowerCase();
    return ingredientTranslations[lowerName] || name;
  };

  // Helper function to translate units to Polish
  const translateUnit = (unit: string): string => {
    const lowerUnit = unit.toLowerCase();
    return unitTranslations[lowerUnit] || unit;
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const data = searchParams.get('data');
    
    if (!data) {
      setError('Nie znaleziono danych składników');
      setIsLoading(false);
      return;
    }

    try {
      const decodedData = decodeURIComponent(data);
      const parsedData = JSON.parse(decodedData);

      if (!parsedData || !parsedData.ingredients) {
        throw new Error('Nieprawidłowy format danych');
      }

      setAnalysisData(parsedData);
      setIngredients(parsedData.ingredients);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to parse ingredient data:', error);
      setError('Nie udało się załadować danych składników');
      setIsLoading(false);
    }
  }, []);

  const updateIngredientQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, quantity: newQuantity } : ingredient
    ));
  };

  const updateIngredientUnit = (index: number, newUnit: string) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, unit: newUnit } : ingredient
    ));
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomIngredient = () => {
    const newIngredient: Ingredient = {
      name: "nowy składnik",
      quantity: 1,
      unit: "sztuka",
      estimatedWeight: 100,
      freshness: "świeże",
      quality: "dobra jakość"
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const updateIngredientName = (index: number, newName: string) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, name: newName } : ingredient
    ));
  };

  const generateRecipes = async () => {
    if (ingredients.length === 0) {
      toast({
        variant: "destructive",
        title: t('ingredientConfirmation.noIngredients', 'Brak składników'),
        description: t('ingredientConfirmation.noIngredientsDesc', 'Dodaj co najmniej jeden składnik, aby wygenerować przepisy.')
      });
      return;
    }

    setIsGenerating(true);

    try {
      const analysisDataWithPreferences = {
        ...analysisData,
        ingredients: ingredients,
        preferences: {
          difficulty: difficulty,
          timeNeeded: cookingTime[0],
          flavor: flavor,
          language: 'pl'
        }
      };

      const encodedData = encodeURIComponent(JSON.stringify(analysisDataWithPreferences));
      const resultUrl = `/recipe-results?data=${encodedData}`;
      
      setLocation(resultUrl);
    } catch (error) {
      console.error('Failed to generate recipes:', error);
      toast({
        variant: "destructive",
        title: t('common.error', 'Błąd'),
        description: t('ingredientConfirmation.generateError', 'Nie udało się wygenerować przepisów. Spróbuj ponownie.')
      });
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0CC5BA]"></div>
        <p className="text-base font-medium text-gray-600">
          {t('common.loading', 'Ładowanie składników...')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('common.error', 'Błąd')}</h2>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
        <Link href="/scan-recipe">
          <Button className="bg-[#0CC5BA] hover:bg-[#0BB5AA] text-white px-6 py-2 rounded-xl font-medium">
            {t('common.tryAgain', 'Spróbuj ponownie')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
      {/* Navigation matching recipes page style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
      >
        <div className="w-full px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/scan-recipe')}
              className="flex items-center gap-2 text-gray-700 hover:text-[#0CC5BA] hover:bg-[#0CC5BA]/10 rounded-xl px-4 py-2 font-medium transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', 'Wstecz')}
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-[#0CC5BA]" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
                {t('ingredientConfirmation.title', 'Potwierdź składniki')}
              </h1>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </motion.div>

      {/* Main content with recipes page styling */}
      <div className="w-full px-6 lg:px-12 py-8">
        {/* Confidence indicator */}
        {analysisData?.confidence && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/50 p-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-emerald-800 font-semibold text-sm">
                    {t('ingredientConfirmation.detectionSuccess', 'Wykrywanie zakończone sukcesem')}
                  </p>
                  <p className="text-emerald-700 text-xs">
                    {Math.round((analysisData.confidence || 0) * 100)}% {t('ingredientConfirmation.confidence', 'pewności')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Section header matching recipes page */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center mb-6">
            <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
              <Utensils className="h-5 w-5 text-[#0CC5BA]" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent ml-2">
              {t('ingredientConfirmation.detectedIngredients', 'Wykryte składniki')}
            </h2>
          </div>

          {/* Ingredients grid with recipes page card styling */}
          <div className="grid gap-4">
            {ingredients.map((ingredient, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="group"
              >
                <Card className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-lg transition-all duration-300 hover:border-[#0CC5BA]/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={translateIngredient(ingredient.name)}
                          onChange={(e) => updateIngredientName(index, e.target.value)}
                          className="text-lg font-bold text-gray-900 bg-transparent border-none p-0 h-auto focus:ring-0 focus:border-none shadow-none capitalize flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#0CC5BA] hover:bg-[#0CC5BA]/10 rounded-full w-8 h-8 p-0 transition-all duration-200"
                          onClick={() => removeIngredient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Quantity and unit controls */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-full hover:bg-white hover:shadow-sm"
                            onClick={() => updateIngredientQuantity(index, ingredient.quantity - 1)}
                            disabled={ingredient.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredientQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 text-center text-sm font-bold border-none bg-transparent shadow-none focus:ring-0"
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-full hover:bg-white hover:shadow-sm"
                            onClick={() => updateIngredientQuantity(index, ingredient.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Input
                          value={translateUnit(ingredient.unit)}
                          onChange={(e) => updateIngredientUnit(index, e.target.value)}
                          className="w-28 text-sm bg-gray-50 border-none rounded-2xl font-medium focus:ring-0 focus:bg-white text-center"
                          placeholder="Jednostka"
                        />
                      </div>

                      {/* Quality badges */}
                      <div className="flex flex-wrap gap-2">
                        {ingredient.freshness && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 rounded-full px-2 py-1 text-xs font-medium">
                            {ingredient.freshness === 'fresh' ? 'świeże' : ingredient.freshness}
                          </Badge>
                        )}
                        {ingredient.quality && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 rounded-full px-2 py-1 text-xs font-medium">
                            {ingredient.quality === 'good quality' ? 'dobra jakość' : ingredient.quality}
                          </Badge>
                        )}
                        {ingredient.estimatedWeight && (
                          <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 rounded-full px-2 py-1 text-xs font-medium">
                            ~{ingredient.estimatedWeight}g
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Add ingredient card matching recipes page style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * ingredients.length }}
            >
              <Card 
                className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 hover:border-[#0CC5BA] hover:bg-[#0CC5BA]/5 transition-all duration-300 cursor-pointer group"
                onClick={addCustomIngredient}
              >
                <div className="flex items-center justify-center gap-3 text-gray-500 group-hover:text-[#0CC5BA] transition-colors duration-300">
                  <div className="bg-gray-100 group-hover:bg-[#0CC5BA]/10 p-2 rounded-full transition-colors duration-300">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="font-medium">
                    {t('ingredientConfirmation.addIngredient', 'Dodaj własny składnik')}
                  </span>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Recipe Preferences Section - Always Visible */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center mb-6">
            <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
              <Settings className="h-5 w-5 text-[#0CC5BA]" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent ml-2">
              Preferencje przepisów
            </h2>
          </div>

          <Card className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
            <div className="space-y-8">
              {/* Difficulty Selection with Buttons */}
              <div className="space-y-4">
                <label className="text-lg font-semibold text-gray-900">Poziom trudności</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "Łatwy", label: "Łatwy", desc: "podstawowe" },
                    { value: "Średni", label: "Średni", desc: "umiarkowane" },
                    { value: "Trudny", label: "Trudny", desc: "zaawansowane" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={difficulty === option.value ? "default" : "outline"}
                      onClick={() => setDifficulty(option.value)}
                      className={`h-[60px] px-4 rounded-xl border-2 transition-all duration-300 ${
                        difficulty === option.value
                          ? "bg-[#0CC5BA] text-white border-[#0CC5BA] shadow-lg"
                          : "bg-white border-gray-200 hover:border-[#0CC5BA]/50 hover:bg-[#0CC5BA]/5"
                      }`}
                    >
                      <div className="text-center w-full flex justify-center items-center h-full">
                        <div className="font-bold text-lg">{option.label}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cooking Time Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold text-gray-900">Czas gotowania</label>
                  <span className="text-[#0CC5BA] font-bold text-xl">{cookingTime[0]} minut</span>
                </div>
                <div className="px-3">
                  <Slider
                    value={cookingTime}
                    onValueChange={setCookingTime}
                    max={120}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>10 min</span>
                    <span>60 min</span>
                    <span>120 min</span>
                  </div>
                </div>
              </div>

              {/* Flavor Profile Selection with Buttons */}
              <div className="space-y-4">
                <label className="text-lg font-semibold text-gray-900">Profil smakowy</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "Łagodny", label: "Łagodny", desc: "delikatne smaki" },
                    { value: "Zrównoważony", label: "Zrównoważony", desc: "uniwersalny" },
                    { value: "Intensywny", label: "Intensywny", desc: "bogate aromaty" },
                    { value: "Pikantny", label: "Pikantny", desc: "ostre przyprawy" },
                    { value: "Słodki", label: "Słodki", desc: "słodkie akcenty" },
                    { value: "Świeży", label: "Świeży", desc: "orzeźwiające" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={flavor === option.value ? "default" : "outline"}
                      onClick={() => setFlavor(option.value)}
                      className={`h-[60px] px-4 rounded-xl border-2 transition-all duration-300 ${
                        flavor === option.value
                          ? "bg-[#0CC5BA] text-white border-[#0CC5BA] shadow-lg"
                          : "bg-white border-gray-200 hover:border-[#0CC5BA]/50 hover:bg-[#0CC5BA]/5"
                      }`}
                    >
                      <div className="text-center w-full flex justify-center items-center h-full">
                        <div className="font-bold text-lg">{option.label}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.section>
      </div>

      {/* Fixed bottom generate button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 p-4 safe-area-pb"
      >
        <div className="w-full px-6 lg:px-12">
          <Button
            onClick={generateRecipes}
            disabled={isGenerating || ingredients.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#0CC5BA] to-[#0C9CCC] text-white rounded-2xl font-semibold text-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                {t('ingredientConfirmation.generating', 'Generowanie przepisów...')}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="h-5 w-5" />
                {t('ingredientConfirmation.generateRecipes', 'Generuj przepisy')}
                <span className="bg-white/20 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {ingredients.length}
                </span>
              </div>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}