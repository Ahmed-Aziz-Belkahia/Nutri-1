import { useFoodLog } from "../hooks/use-food-log";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronRight, Camera, AlertCircle, Star, Plus, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import AnalyzingMealCardV2 from "./AnalyzingMealCardV2";
import { ANALYSIS_EVENTS } from "./ScannerUI";

// Enhanced helper function to format food name with quantity
const formatFoodName = (name: string) => {
  // Enhanced regex to catch both "2 eggs" and "2 egg"
  const quantity = name.match(/^(\d+)\s*/);
  if (!quantity) return name.charAt(0).toUpperCase() + name.slice(1);

  const foodName = name.replace(/^\d+\s*/, '').trim();
  // Remove trailing 's' for plural items when formatting base name
  const baseName = foodName.replace(/s$/, '');
  const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  const count = parseInt(quantity[1]);

  return `${count} ${formattedName}${count > 1 ? 's' : ''}`;
};

// Updated calculation function to use server-provided totals
const calculateTotal = (name: string, value: string | number) => {
  const baseValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(baseValue)) return 0;
  return baseValue;
};

export default function TodaysMeals() {
  const { foodLogs, isLoadingLogs } = useFoodLog();
  const { user } = useUser();
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingMealData, setAnalyzingMealData] = useState<{
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    image?: string;
  } | null>(null);

  // No longer need to listen for external analysis events
  // Analysis will happen within individual meal cards

  // Handle when analysis animation is complete
  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
    setAnalyzingMealData(null);
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please log in to view your meals.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoadingLogs) {
    return (
      <div className="space-y-2">
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-2">
              <div className="flex gap-2">
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 bg-gray-200 rounded-lg" />
                  <div className="h-2.5 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 leading-none">Today's Meals</h2>
          <p className="text-xs text-gray-500 mt-0.5">Track your daily nutrition</p>
        </div>
        <Link href="/add-food">
          <Button size="icon" className="w-8 h-8 rounded-lg bg-[#0CC5BA] hover:bg-[#0CC5BA]/90">
            <Plus className="h-4 w-4 text-white" />
          </Button>
        </Link>
      </div>

      <div className="space-y-1.5">
        {foodLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200"
          >
            <Camera className="h-6 w-6 mx-auto text-gray-400 mb-1.5" />
            <p className="text-sm text-gray-600 font-medium">No meals logged today</p>
            <p className="text-xs text-gray-500 mt-0.5">Add your first meal to get started</p>
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            {foodLogs.map((log) => {
              // Check if this meal needs analysis (placeholder meal)
              const needsAnalysis = log.name === "Analizowanie..." && log.calories === "0" && log.image;
              
              if (needsAnalysis) {
                return (
                  <AnalyzingMealCardV2
                    key={log.id}
                    meal={{
                      id: log.id,
                      name: log.name,
                      calories: parseInt(log.calories) || 0,
                      protein: parseInt(log.protein) || 0,
                      carbs: parseInt(log.carbs) || 0,
                      fat: parseInt(log.fat) || 0,
                      image: log.image || undefined,
                      createdAt: log.date.toISOString()
                    }}
                    onAnalysisComplete={() => {
                      // Refresh food logs after analysis
                      // The cache will be updated by the updateFood mutation
                    }}
                  />
                );
              }
              
              // Regular meal card for completed meals
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="group"
                >
                <Card className="overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer">
                  <div className="flex flex-col">
                    <div className="flex items-center p-2">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {log.image ? (
                          <img
                            src={log.image}
                            alt={formatFoodName(log.name)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 ml-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#0CC5BA] transition-colors">
                              {formatFoodName(log.name)}
                            </h3>
                            <div className="flex items-center">
                              <div className="flex -space-x-0.5">
                                {[...Array(4)].map((_, i) => (
                                  <Star key={i} className="h-2.5 w-2.5 text-yellow-400 fill-current" />
                                ))}
                                <Star className="h-2.5 w-2.5 text-gray-300" />
                              </div>
                              <span className="text-[9px] text-gray-500 ml-1">(24)</span>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-[#0CC5BA]">
                            {calculateTotal(log.name, log.calories)} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-500">
                            Protein: {log.protein}g
                          </span>
                          <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                          <span className="text-[9px] text-gray-500">
                            Carbs: {log.carbs}g
                          </span>
                          <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                          <span className="text-[9px] text-gray-500">
                            Fat: {log.fat}g
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedLogId === log.id ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </div>

                    <AnimatePresence>
                      {expandedLogId === log.id && log.components && log.components.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-2 bg-gray-50">
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Components:</h4>
                            <div className="space-y-3">
                              {log.components.map((component, idx) => (
                                <div key={idx} className="p-2 bg-white rounded-lg shadow-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {component.name}
                                    </span>
                                    <span className="text-xs text-[#0CC5BA]">
                                      {component.calories} kcal
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Type:</span>
                                      <span>{component.details?.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Serving:</span>
                                      <span>{component.quantity}x {component.servingSize}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Preparation:</span>
                                      <span>{component.details?.preparation}</span>
                                    </div>
                                    {component.details?.cookingMethod && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Cooking Method:</span>
                                        <span>{component.details.cookingMethod}</span>
                                      </div>
                                    )}
                                    {component.details?.doneness && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Doneness:</span>
                                        <span>{component.details.doneness}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Texture:</span>
                                      <span>{component.details?.texture}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Color:</span>
                                      <span>{component.details?.color}</span>
                                    </div>
                                    {component.details?.temperature && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Temperature:</span>
                                        <span>{component.details.temperature}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Est. Weight:</span>
                                      <span>{component.details?.estimatedWeight}</span>
                                    </div>
                                    {component.details?.seasonings && component.details.seasonings.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Seasonings:</span>
                                        <span>{component.details.seasonings.join(', ')}</span>
                                      </div>
                                    )}
                                    {component.details?.garnishes && component.details.garnishes.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Garnishes:</span>
                                        <span>{component.details.garnishes.join(', ')}</span>
                                      </div>
                                    )}
                                    {component.details?.sauce && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Sauce:</span>
                                        <span>{component.details.sauce}</span>
                                      </div>
                                    )}
                                    {component.details?.accompaniments && component.details.accompaniments.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Accompaniments:</span>
                                        <span>{component.details.accompaniments.join(', ')}</span>
                                      </div>
                                    )}
                                    {component.details?.presentation && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">Presentation:</span>
                                        <span>{component.details.presentation}</span>
                                      </div>
                                    )}
                                    <div className="mt-1 pt-1 border-t border-gray-100">
                                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                                        <span>Protein: {component.protein}g</span>
                                        <span>Carbs: {component.carbs}g</span>
                                        <span>Fat: {component.fat}g</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}