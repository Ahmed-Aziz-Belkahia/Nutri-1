import React from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Trash2, Calendar, Clock, Layers, Apple, Activity, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, X, Edit, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useFoodLog } from "../hooks/use-food-log";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useCallback, useMemo, useEffect } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FoodComponent, FoodComponentDetails, Meal } from '../types/food';
import { ComponentEditor } from '../components/ComponentEditor';
import { useUser } from "@/hooks/use-user";

// Format the serving size string according to requirements
function formatServingSize(servingSize?: string, quantity?: number): string {
  // If servingSize starts with "1 1/2 ", remove the leading "1 "
  if (servingSize?.match(/^1\s+1\/2\s+/)) {
    return servingSize.replace(/^1\s+/, '');
  }
  // If servingSize already starts with a number, use it as is
  else if (servingSize?.match(/^\d+\s+/)) {
    return servingSize;
  } 
  // Otherwise format with quantity and add plural if needed
  else {
    const qty = quantity || 1;
    const base = servingSize?.replace(/^(one|1)\s+/i, '') || 'serving';
    return `${qty} ${base}${qty > 1 ? 's' : ''}`;
  }
}

const MealComponentView = ({ 
  components,
  emblaRef,
  expandedComponent,
  setExpandedComponent,
  onDeleteComponent
}: { 
  components: FoodComponent[],
  emblaRef: any,
  expandedComponent: string | null,
  setExpandedComponent: (name: string | null) => void,
  onDeleteComponent: (index: number) => void
}) => {
  const { t } = useTranslation();
  
  // Create a local state to track which components should be visible
  const [visibleComponents, setVisibleComponents] = useState<FoodComponent[]>(components);
  
  // Update visible components when the main components list changes
  useEffect(() => {
    setVisibleComponents(components);
  }, [components]);
  
  // Handle component removal with animation - using local state for immediate UI feedback
  const handleRemoveComponent = (index: number) => {
    // First update local state to immediately remove the component from the UI
    const filteredComponents = visibleComponents.filter((_, i) => i !== index);
    setVisibleComponents(filteredComponents);
    
    // Then call the parent delete handler to update the backend
    setTimeout(() => {
      onDeleteComponent(index);
    }, 100); // Short delay to allow animation to start
  };
  
  // Force Embla to recalculate after component removal
  useEffect(() => {
    if (emblaRef.current) {
      const api = emblaRef.current.parentElement?.__emblaApi;
      if (api) {
        setTimeout(() => {
          api.reInit();
        }, 300); // Delay to allow animation to complete
      }
    }
  }, [visibleComponents.length, emblaRef]);
  
  // Also recalculate when main components list changes
  useEffect(() => {
    if (emblaRef.current && emblaRef.current.parentElement?.__emblaApi) {
      setTimeout(() => {
        emblaRef.current.parentElement.__emblaApi.reInit();
      }, 100);
    }
  }, [components.length, emblaRef]);
  
  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 -ml-4">
          <AnimatePresence initial={false}>
            {visibleComponents.map((component, index) => (
              <motion.div
                key={`${component.name}-${index}`}
                className="min-w-[280px] pl-4 flex-shrink-0"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05,
                  height: { delay: 0.1, duration: 0.2 }
                }}
                layout
              >
                <motion.div
                  className="rounded-xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  layout
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0CC5BA]/10 flex items-center justify-center">
                          <Apple className="h-5 w-5 text-[#0CC5BA]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{component.name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatServingSize(component.servingSize, component.quantity)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveComponent(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div 
                      className="mb-2 cursor-pointer"
                      onClick={() => setExpandedComponent(expandedComponent === component.name ? null : component.name)}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: t("macros.calories", "Calories"), value: component.calories, unit: "kcal" },
                          { label: t("macros.protein", "Protein"), value: component.protein, unit: "g" },
                          { label: t("macros.carbs", "Carbs"), value: component.carbs, unit: "g" },
                          { label: t("macros.fat", "Fat"), value: component.fat, unit: "g" }
                        ].map((macro, i) => (
                          <div key={i} className="bg-[#0CC5BA]/5 p-2 rounded-lg">
                            <p className="text-xs text-gray-500">{macro.label}</p>
                            <p className="font-medium text-[#0CC5BA]">
                              {macro.value}{macro.unit}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {expandedComponent === component.name && component.details && (
                      <div className="mt-4 pt-4 border-t border-[#0CC5BA]/10">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">{t("meal.additionalDetails", "Dodatkowe szczegóły")}</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          {typeof component.details === 'object' && component.details && 'type' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.type", "Typ")}:</span> {String(component.details.type || '')}</div>
                          )}
                          {typeof component.details === 'object' && component.details && 'cookingMethod' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.cookingMethod", "Metoda gotowania")}:</span> {String(component.details.cookingMethod || '')}</div>
                          )}
                          {typeof component.details === 'object' && component.details && 'preparation' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.preparation", "Przygotowanie")}:</span> {String(component.details.preparation || '')}</div>
                          )}
                          {typeof component.details === 'object' && component.details && 'texture' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.texture", "Tekstura")}:</span> {String(component.details.texture || '')}</div>
                          )}
                          {typeof component.details === 'object' && component.details && 'temperature' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.temperature", "Temperatura")}:</span> {String(component.details.temperature || '')}</div>
                          )}
                          {typeof component.details === 'object' && component.details && 'estimatedWeight' in component.details && (
                            <div><span className="text-gray-500">{t("meal.details.estimatedWeight", "Szacowana waga")}:</span> {String(component.details.estimatedWeight || '')}</div>
                          )}
                        </div>
                        
                        {typeof component.details === 'object' && component.details && 
                        'seasonings' in component.details && 
                        component.details.seasonings && 
                        Array.isArray(component.details.seasonings) && 
                        component.details.seasonings.length > 0 ? (
                          <div className="mt-2">
                            <span className="text-gray-500 text-xs">{t("meal.details.seasonings", "Przyprawy")}:</span> 
                            <span className="text-xs text-gray-600"> {(component.details.seasonings as string[]).join(', ')}</span>
                          </div>
                        ) : null
                        }
                        
                        {typeof component.details === 'object' && component.details && 
                        'garnishes' in component.details && 
                        component.details.garnishes && 
                        Array.isArray(component.details.garnishes) && 
                        component.details.garnishes.length > 0 ? (
                          <div className="mt-1">
                            <span className="text-gray-500 text-xs">{t("meal.details.garnishes", "Dekoracja")}:</span> 
                            <span className="text-xs text-gray-600"> {(component.details.garnishes as string[]).join(', ')}</span>
                          </div>
                        ) : null
                        }
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/80 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default function MealDetail() {
  const { t } = useTranslation();
  const [showFullImage, setShowFullImage] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mealId = parseInt(location.split('/').pop() || '0');
  const { user } = useUser(); // Get user profile for macro goals
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  // State to track expanded component details in the food details section
  const [expandedDetails, setExpandedDetails] = useState<number[]>([]);
  
  // State for editing meal details
  const [editingComponentIndex, setEditingComponentIndex] = useState<number | null>(null);
  const [editingDetail, setEditingDetail] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [editingSeasonings, setEditingSeasonings] = useState<boolean>(false);
  const [seasoningsInput, setSeassoningsInput] = useState<string>('');
  const [editingGarnishes, setEditingGarnishes] = useState<boolean>(false);
  const [garnishesInput, setGarnishesInput] = useState<string>('');
  
  // Full component editing mode state
  const [editingComponent, setEditingComponent] = useState<boolean>(false);
  const [editedComponent, setEditedComponent] = useState<FoodComponent | null>(null);
  
  // Usunięto zmienną stanu editingMacro, aby uniknąć problemów z kolejnością hooków
  
  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("meal.imageTooLarge", "Zbyt duży rozmiar zdjęcia"),
        description: t("meal.imageSizeLimit", "Maksymalny rozmiar zdjęcia to 5MB")
      });
      return;
    }
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mealId', mealId.toString());
    
    try {
      const response = await fetch(`/api/food-logs/${mealId}/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result = await response.json();
      
      // Update meal with new image URL
      if (meal) {
        const updatedMeal = { ...meal, image: result.imageUrl };
        updateMealMutation.mutate(updatedMeal);
      }
      
      toast({
        title: t("meal.imageUploadSuccess", "Sukces"),
        description: t("meal.imageUploadedSuccessfully", "Zdjęcie posiłku zostało pomyślnie dodane")
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("meal.imageUploadError", "Błąd podczas przesyłania"),
        description: error instanceof Error ? error.message : t("meal.imageUploadFailed", "Nie udało się przesłać zdjęcia")
      });
    }
  };

  // Use React Query to fetch the specific meal by ID
  const { data: meal, isLoading: isMealLoading } = useQuery<Meal>({
    queryKey: ["/api/food-logs", mealId],
    queryFn: async () => {
      console.log("[MealDetail] Fetching meal by ID:", mealId);
      const response = await fetch(`/api/food-logs/${mealId}`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch meal: ${await response.text()}`);
      }
      
      return response.json();
    },
    enabled: mealId > 0
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/food-logs/${mealId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      toast({
        title: "Success",
        description: "Meal deleted successfully",
      });
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete meal",
      });
    },
  });
  
  // Mutation for updating meal components
  const updateMealMutation = useMutation({
    mutationFn: async (updatedMeal: Meal) => {
      const response = await fetch(`/api/food-logs/${mealId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedMeal),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Logowanie danych odpowiedzi dla debugowania
      if (data) {
        console.log("[MealDetail] Update successful with data:", data);
      }
      
      // Invalidate query cache to force reload from server
      queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      
      // Powiadamiamy użytkownika o sukcesie
      toast({
        title: "Sukces",
        description: "Wartości zostały zaktualizowane pomyślnie",
      });
      
      // Reset editing states
      setEditingComponentIndex(null);
      setEditingDetail(null);
      setEditedValue('');
      setEditingSeasonings(false);
      setEditingGarnishes(false);
      
      // Usunięto resetowanie stanu editingMacro
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update meal details",
      });
    }
  });

  function getMealTime(date: Date): string {
    const hour = date.getHours();
    if (hour < 10) return t("meal.types.breakfast", "Śniadanie");
    if (hour < 14) return t("meal.types.lunch", "Obiad");
    if (hour < 18) return t("meal.types.snack", "Przekąska");
    return t("meal.types.dinner", "Kolacja");
  }

  if (isMealLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0CC5BA]"></div>
          <p className="text-gray-500">Loading meal details...</p>
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
        <p className="text-gray-500">Meal not found</p>
      </div>
    );
  }

  const parseComponents = (mealData: Meal): FoodComponent[] => {
    // Primero verificamos si ya hay componentes definidos
    if (mealData.components && Array.isArray(mealData.components)) {
      console.log('[MealDetail] Using existing components:', mealData.components.length);
      return mealData.components.map(comp => ({
        name: comp.name,
        calories: typeof comp.calories === 'number' ? comp.calories : parseFloat(comp.calories as string),
        protein: typeof comp.protein === 'number' ? comp.protein : parseFloat(comp.protein as string),
        carbs: typeof comp.carbs === 'number' ? comp.carbs : parseFloat(comp.carbs as string),
        fat: typeof comp.fat === 'number' ? comp.fat : parseFloat(comp.fat as string),
        servingSize: comp.servingSize || '1 serving',
        quantity: comp.quantity || 1,
        details: comp.details || undefined
      }));
    }

    console.log('[MealDetail] No components found, parsing from meal name');
    
    // Si no hay componentes, intentamos extraerlos del nombre de la comida
    const components = mealData.name.split(',')
      .filter((item: string) => item.trim())
      .map((item: string) => item.trim());

    // Si ni siquiera hay comas en el nombre, usamos el nombre completo como un componente
    if (components.length === 0) {
      const totalMacros = {
        calories: typeof mealData.calories === 'number' ? mealData.calories : parseFloat(mealData.calories as string),
        protein: typeof mealData.protein === 'number' ? mealData.protein : parseFloat(mealData.protein as string),
        carbs: typeof mealData.carbs === 'number' ? mealData.carbs : parseFloat(mealData.carbs as string),
        fat: typeof mealData.fat === 'number' ? mealData.fat : parseFloat(mealData.fat as string)
      };
      
      return [{
        name: mealData.name.trim(),
        calories: totalMacros.calories,
        protein: totalMacros.protein,
        carbs: totalMacros.carbs,
        fat: totalMacros.fat,
        quantity: 1,
        servingSize: '1 serving'
      }];
    }

    const componentCount = components.length;
    const totalMacros = {
      calories: typeof mealData.calories === 'number' ? mealData.calories : parseFloat(mealData.calories as string),
      protein: typeof mealData.protein === 'number' ? mealData.protein : parseFloat(mealData.protein as string),
      carbs: typeof mealData.carbs === 'number' ? mealData.carbs : parseFloat(mealData.carbs as string),
      fat: typeof mealData.fat === 'number' ? mealData.fat : parseFloat(mealData.fat as string)
    };

    const perComponentMacros = {
      calories: totalMacros.calories / componentCount,
      protein: totalMacros.protein / componentCount,
      carbs: totalMacros.carbs / componentCount,
      fat: totalMacros.fat / componentCount
    };

    return components.map((component: string) => {
      const quantityMatch = component.match(/^(\d+)\s+/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      const name = quantityMatch
        ? component.slice(quantityMatch[0].length)
        : component;

      return {
        name: name.trim(),
        calories: Math.round(perComponentMacros.calories),
        protein: parseFloat((perComponentMacros.protein).toFixed(1)),
        carbs: parseFloat((perComponentMacros.carbs).toFixed(1)),
        fat: parseFloat((perComponentMacros.fat).toFixed(1)),
        quantity,
        servingSize: '1 serving'
      };
    });
  };

  // Zamiast używać useMemo, co powoduje problemy z kolejnością hooków,
  // używamy zwykłej zmiennej, która jest tworzona tylko gdy meal istnieje
  let mainComponents: FoodComponent[] = [];
  if (meal) {
    mainComponents = parseComponents(meal);
  }

  // Helper function to toggle expanded state for food component details
  const toggleExpandedDetails = (index: number) => {
    setExpandedDetails(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
  // Function to start full component editing mode
  const startEditingComponent = (componentIndex: number) => {
    setEditingComponentIndex(componentIndex);
    setEditingComponent(true);
    setEditedComponent(JSON.parse(JSON.stringify(mainComponents[componentIndex]))); // Deep copy
    // Reset other editing states
    setEditingDetail(null);
    setEditedValue('');
    setEditingSeasonings(false);
    setEditingGarnishes(false);
  };

  // Function to start editing a specific component detail
  const startEditing = (componentIndex: number, detailKey: string, initialValue: string) => {
    setEditingComponentIndex(componentIndex);
    setEditingDetail(detailKey);
    setEditedValue(initialValue || '');
    setEditingSeasonings(false);
    setEditingGarnishes(false);
  };
  
  // Function to start editing seasonings
  const startEditingSeasonings = (componentIndex: number) => {
    const component = mainComponents[componentIndex];
    if (!component?.details?.seasonings) return;
    
    setEditingComponentIndex(componentIndex);
    setEditingSeasonings(true);
    setSeassoningsInput(component.details.seasonings.join(', '));
    setEditingGarnishes(false);
    setEditingDetail(null);
  };
  
  // Function to start editing garnishes
  const startEditingGarnishes = (componentIndex: number) => {
    const component = mainComponents[componentIndex];
    if (!component?.details?.garnishes) return;
    
    setEditingComponentIndex(componentIndex);
    setEditingGarnishes(true);
    setGarnishesInput(component.details.garnishes.join(', '));
    setEditingSeasonings(false);
    setEditingDetail(null);
  };
  
  // Function to save the edited value
  const saveEditedDetail = () => {
    if (editingComponentIndex === null) return;
    
    const newComponents = [...mainComponents];
    const component = { ...newComponents[editingComponentIndex] };
    
    if (!component.details) {
      component.details = {};
    }
    
    // Create a copy of details to avoid mutating the original
    component.details = { ...component.details };
    
    if (editingDetail) {
      component.details[editingDetail] = editedValue;
    } else if (editingSeasonings) {
      component.details.seasonings = seasoningsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else if (editingGarnishes) {
      component.details.garnishes = garnishesInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    newComponents[editingComponentIndex] = component;
    
    const updatedMeal = {
      ...meal,
      components: newComponents
    };
    
    updateMealMutation.mutate(updatedMeal);
  };
  
  // Function to save edited component (from ComponentEditor)
  const saveEditedComponent = (updatedComponent: FoodComponent) => {
    if (editingComponentIndex === null) return;
    
    const newComponents = [...mainComponents];
    newComponents[editingComponentIndex] = updatedComponent;
    
    const updatedMeal = {
      ...meal,
      components: newComponents
    };
    
    updateMealMutation.mutate(updatedMeal);
    
    // Reset editing state
    setEditingComponent(false);
    setEditingComponentIndex(null);
    setEditedComponent(null);
  };
  
  // Function to cancel component editing
  const cancelEditingComponent = () => {
    setEditingComponent(false);
    setEditingComponentIndex(null);
    setEditedComponent(null);
  };
  
  // Function to cancel editing
  const cancelEditing = () => {
    setEditingComponentIndex(null);
    setEditingDetail(null);
    setEditedValue('');
    setEditingSeasonings(false);
    setEditingGarnishes(false);
  };
  
  // Removed the macro editing function

  // We're not using this state anymore since we're using local state in MealComponentView

  // Function to handle component deletion with immediate visual feedback
  const handleDeleteComponent = (indexToDelete: number) => {
    if (!meal) return;
    
    // Make a copy of components
    const newComponents = [...mainComponents];
    
    // If we're left with only one component, don't proceed
    if (newComponents.length <= 1) {
      toast({
        variant: "destructive",
        title: t("meal.components.deleteError", "Błąd usuwania"),
        description: t("meal.components.cannotDeleteLast", "Nie można usunąć ostatniego składnika posiłku")
      });
      return;
    }
    
    // Create a copy to avoid mutating the original array directly
    const componentsAfterDeletion = [...newComponents];
    
    // Remove the component at the specified index
    componentsAfterDeletion.splice(indexToDelete, 1);
    
    // Calculate new total macros based on remaining components
    const newTotalCalories = componentsAfterDeletion.reduce((sum, comp) => sum + (comp.calories || 0), 0);
    const newTotalProtein = componentsAfterDeletion.reduce((sum, comp) => sum + (comp.protein || 0), 0);
    const newTotalCarbs = componentsAfterDeletion.reduce((sum, comp) => sum + (comp.carbs || 0), 0);
    const newTotalFat = componentsAfterDeletion.reduce((sum, comp) => sum + (comp.fat || 0), 0);
    
    // Update the meal with new components and adjusted macros
    const updatedMeal = {
      ...meal,
      components: componentsAfterDeletion,
      calories: newTotalCalories,
      protein: newTotalProtein,
      carbs: newTotalCarbs,
      fat: newTotalFat
    };
    
    // Immediately update the UI to reflect the deletion
    queryClient.setQueryData(["/api/food-logs"], (oldData: any) => {
      if (!oldData || !oldData.logs) return oldData;
      
      return {
        ...oldData,
        logs: oldData.logs.map((log: any) => 
          log.id === meal.id ? updatedMeal : log
        )
      };
    });
    
    // Send the update to the server
    updateMealMutation.mutate(updatedMeal, {
      onError: () => {
        toast({
          variant: "destructive",
          title: t("meal.components.deleteError", "Błąd usuwania"),
          description: t("meal.components.failedToDelete", "Nie udało się usunąć składnika")
        });
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      }
    });
  };
  
  // Calcular los totales basados en los componentes o usar los valores del meal directamente
  const calculateTotalMacros = () => {
    if (!meal) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // Si hay componentes, calculamos los totales sumando cada componente
    if (mainComponents.length > 0) {
      const totals = mainComponents.reduce((acc, component) => {
        return {
          calories: acc.calories + (typeof component.calories === 'number' ? component.calories : 0),
          protein: acc.protein + (typeof component.protein === 'number' ? component.protein : 0),
          carbs: acc.carbs + (typeof component.carbs === 'number' ? component.carbs : 0),
          fat: acc.fat + (typeof component.fat === 'number' ? component.fat : 0),
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      return {
        calories: Math.round(totals.calories),
        protein: Number(totals.protein.toFixed(1)),
        carbs: Number(totals.carbs.toFixed(1)),
        fat: Number(totals.fat.toFixed(1))
      };
    }
    
    // Si no hay componentes, usamos los valores del meal
    return {
      calories: typeof meal.calories === 'number' ? meal.calories : parseFloat(meal.calories as string),
      protein: typeof meal.protein === 'number' ? meal.protein : parseFloat(meal.protein as string),
      carbs: typeof meal.carbs === 'number' ? meal.carbs : parseFloat(meal.carbs as string),
      fat: typeof meal.fat === 'number' ? meal.fat : parseFloat(meal.fat as string)
    };
  };
  
  const totalMacros = calculateTotalMacros();
  
  // Get profile macro goals or default values
  const calorieGoal = user?.profile?.calorieGoal || 2000;
  const proteinGoal = user?.profile?.proteinGoal || 150;
  const carbsGoal = user?.profile?.carbsGoal || 200;
  const fatGoal = user?.profile?.fatGoal || 67;

  // Calculate percentage of daily goals
  const caloriePercentage = Math.round((totalMacros.calories / calorieGoal) * 100);
  const proteinPercentage = Math.round((totalMacros.protein / proteinGoal) * 100);
  const carbsPercentage = Math.round((totalMacros.carbs / carbsGoal) * 100);
  const fatPercentage = Math.round((totalMacros.fat / fatGoal) * 100);

  const macroDetails = [
    {
      name: t("macros.totalCalories", "Kalorie łącznie"),
      value: totalMacros.calories,
      unit: "kcal",
      breakdown: [
        `${t("macros.protein", "Białko")}: ${totalMacros.protein}g`,
        `${t("macros.carbs", "Węglowodany")}: ${totalMacros.carbs}g`,
        `${t("macros.fat", "Tłuszcz")}: ${totalMacros.fat}g`,
        `${t("macros.dailyGoal", "Cel dzienny")}: ${caloriePercentage}% (${calorieGoal} kcal)`
      ]
    },
    {
      name: t("macros.totalFat", "Tłuszcz łącznie"),
      value: totalMacros.fat,
      unit: "g",
      breakdown: [
        `${t("macros.saturatedFat", "Tłuszcze nasycone")}: ${(totalMacros.fat * 0.3).toFixed(1)}g`,
        `${t("macros.unsaturatedFat", "Tłuszcze nienasycone")}: ${(totalMacros.fat * 0.7).toFixed(1)}g`,
        `${t("macros.dailyGoal", "Cel dzienny")}: ${fatPercentage}% (${fatGoal}g)`
      ]
    },
    {
      name: t("macros.totalCarbs", "Węglowodany łącznie"),
      value: totalMacros.carbs,
      unit: "g",
      breakdown: [
        `${t("macros.fiber", "Błonnik")}: ${(totalMacros.carbs * 0.1).toFixed(1)}g`,
        `${t("macros.sugar", "Cukier")}: ${(totalMacros.carbs * 0.2).toFixed(1)}g`,
        `${t("macros.dailyGoal", "Cel dzienny")}: ${carbsPercentage}% (${carbsGoal}g)`
      ]
    },
    {
      name: t("macros.protein", "Białko"),
      value: totalMacros.protein,
      unit: "g",
      breakdown: [
        `${t("macros.essentialAminoAcids", "Niezbędne aminokwasy")}: ${Math.round(totalMacros.protein * 0.4)}%`,
        `${t("macros.bcaa", "BCAA")}: ${(totalMacros.protein * 0.2).toFixed(1)}g`,
        `${t("macros.dailyGoal", "Cel dzienny")}: ${proteinPercentage}% (${proteinGoal}g)`
      ]
    }
  ];




  return (
    <AnimatePresence>
      {showFullImage && meal?.image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center"
          onClick={() => setShowFullImage(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="relative max-w-[90vw] max-h-[90vh]"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setShowFullImage(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={meal.image}
              alt={meal.name}
              className="w-full h-full object-contain rounded-lg"
            />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        className="fixed inset-0 bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 backdrop-blur-md z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-xl shadow-2xl overflow-y-auto"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          <div className="sticky top-0 z-50 px-4 py-3 flex justify-between items-center border-b border-white/20 backdrop-blur-xl bg-white/60">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
              onClick={() => setLocation('/dashboard')}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this meal?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="w-full px-6 lg:px-12 py-6 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden rounded-3xl border-0 shadow-xl bg-gradient-to-br from-white/90 to-white/70">
                <div className="relative">
                  {meal.image ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl group">
                      <img
                        src={meal.image}
                        alt={meal.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setShowFullImage(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Change photo button overlay */}
                      <div 
                        className="absolute top-3 right-3 h-10 w-10 bg-white/80 backdrop-blur-sm rounded-full 
                                  flex items-center justify-center cursor-pointer shadow-md hover:bg-white 
                                  hover:scale-105 transition-all duration-200 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('meal-image-upload')?.click();
                        }}
                      >
                        <input
                          id="meal-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0CC5BA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="h-32 bg-gradient-to-br from-[#0CC5BA]/20 to-blue-500/20 flex items-center justify-center cursor-pointer relative"
                      onClick={() => document.getElementById('meal-image-upload')?.click()}
                    >
                      <input
                        id="meal-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-white/80 flex items-center justify-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0CC5BA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-[#0CC5BA] font-medium">{t("meal.addPhoto", "Dodaj zdjęcie")}</p>
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <motion.h1
                      className="text-3xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-4"
                    >
                      {meal.name}
                    </motion.h1>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{getMealTime(new Date(meal.date))}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(meal.date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <Card className="p-6 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-white/90 to-white/70">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#0CC5BA]" />
                    <h3 className="text-xl font-semibold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                      {t("meal.components", "Składniki posiłku")}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={scrollPrev}
                      className="h-8 w-8 rounded-full hover:bg-[#0CC5BA]/10"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={scrollNext}
                      className="h-8 w-8 rounded-full hover:bg-[#0CC5BA]/10"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <MealComponentView 
                  components={mainComponents}
                  emblaRef={emblaRef}
                  expandedComponent={expandedComponent}
                  setExpandedComponent={setExpandedComponent}
                  onDeleteComponent={handleDeleteComponent}
                />
              </Card>

              <Card className="p-6 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-white/90 to-white/70">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#0CC5BA]" />
                    <h3 className="text-xl font-semibold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                      {t("meal.nutritionOverview", "Przegląd wartości odżywczych")}
                    </h3>
                  </div>
                  
                  {/* Removed macro editing button as requested */}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {macroDetails.map((macro, index) => (
                      <motion.div
                        key={macro.name}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-[#0CC5BA]/5 to-[#0CC5BA]/10"
                      >
                        <h4 className="text-sm text-gray-600 mb-1">{macro.name}</h4>
                        <p className="text-2xl font-bold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                          {macro.value}{macro.unit}
                        </p>
                        <div className="mt-2 space-y-1">
                          {macro.breakdown.map((detail, i) => (
                            <p key={i} className="text-xs text-gray-500">{detail}</p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
              </Card>

              {/* Enhanced Food Details Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-6 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-white/90 to-white/70 overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center shadow-md">
                      <Layers className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                      {t("meal.foodDetails", "Szczegóły potrawy")}
                    </h3>
                  </div>
                  
                  {mainComponents.filter(component => component.details).map((component, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.15 }}
                      className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-[#F5FCFB] border border-[#0CC5BA]/20 shadow-lg"
                    >
                      <div 
                        className="bg-gradient-to-r from-[#0CC5BA] to-[#0CC5BA]/90 px-5 py-3.5 border-b border-[#0CC5BA]/10 relative overflow-hidden cursor-pointer"
                        onClick={() => toggleExpandedDetails(index)}
                      >
                        <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10"></div>
                        <div className="absolute right-12 bottom-0 w-12 h-12 rounded-full bg-white/10"></div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-xl text-white">{component.name}</h4>
                          <div className="flex items-center gap-2 text-white">
                            {expandedDetails.includes(index) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingComponent(index);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {expandedDetails.includes(index) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Component Editor - full editing mode */}
                      {expandedDetails.includes(index) && editingComponent && editingComponentIndex === index && editedComponent && (
                        <div className="p-5">
                          <ComponentEditor 
                            component={editedComponent} 
                            onSave={saveEditedComponent}
                            onCancel={cancelEditingComponent}
                          />
                        </div>
                      )}
                      
                      {/* Regular component details view */}
                      {expandedDetails.includes(index) && component.details && !editingComponent && (
                        <div className="p-5">
                          {/* Basic Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Left column */}
                            <div className="space-y-4">
                              <h5 className="text-sm font-semibold text-[#0CC5BA] uppercase tracking-wider mb-3 flex items-center">
                                <div className="w-1 h-4 bg-[#0CC5BA] rounded-full mr-2"></div>
                                {t("meal.details.basicProperties", "Podstawowe właściwości")}
                              </h5>
                              
                              {'type' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0CC5BA]/10">
                                    <Activity className="h-4 w-4 text-[#0CC5BA]" />
                                  </div>
                                  <div className="flex-grow">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.type", "Typ")}</div>
                                    {editingComponentIndex === index && editingDetail === 'type' ? (
                                      <div className="flex items-center gap-2">
                                        <Input 
                                          className="h-8 text-sm"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100" 
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-800 font-medium">{String(component.details.type || '')}</div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                          onClick={() => startEditing(index, 'type', String(component.details?.type || ''))}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'preparation' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.preparation", "Przygotowanie")}</div>
                                    {editingComponentIndex === index && editingDetail === 'preparation' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz sposób przygotowania"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details.preparation || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'preparation' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'preparation', String(component.details?.preparation || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'texture' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50">
                                    <Activity className="h-4 w-4 text-purple-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.texture", "Tekstura")}</div>
                                    {editingComponentIndex === index && editingDetail === 'texture' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz teksturę"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details.texture || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'texture' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'texture', String(component.details?.texture || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'estimatedWeight' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-50">
                                    <Activity className="h-4 w-4 text-amber-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.weight", "Waga")}</div>
                                    {editingComponentIndex === index && editingDetail === 'estimatedWeight' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz wagę"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details?.estimatedWeight || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'estimatedWeight' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'estimatedWeight', String(component.details?.estimatedWeight || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Right column */}
                            <div className="space-y-4">
                              <h5 className="text-sm font-semibold text-[#0CC5BA] uppercase tracking-wider mb-3 flex items-center">
                                <div className="w-1 h-4 bg-[#0CC5BA] rounded-full mr-2"></div>
                                {t("meal.details.cookingDetails", "Szczegóły przygotowania")}
                              </h5>
                              
                              {'cookingMethod' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-50">
                                    <Activity className="h-4 w-4 text-orange-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.cookingMethod", "Metoda gotowania")}</div>
                                    {editingComponentIndex === index && editingDetail === 'cookingMethod' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz metodę gotowania"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details?.cookingMethod || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'cookingMethod' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'cookingMethod', String(component.details?.cookingMethod || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'doneness' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50">
                                    <Activity className="h-4 w-4 text-red-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.doneness", "Stopień wypieczenia")}</div>
                                    {editingComponentIndex === index && editingDetail === 'doneness' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz stopień wypieczenia"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details?.doneness || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'doneness' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'doneness', String(component.details?.doneness || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'temperature' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.temperature", "Temperatura")}</div>
                                    {editingComponentIndex === index && editingDetail === 'temperature' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz temperaturę"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details?.temperature || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'temperature' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'temperature', String(component.details?.temperature || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {'color' in component.details && (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
                                    <Activity className="h-4 w-4 text-indigo-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium">{t("meal.details.color", "Kolor")}</div>
                                    {editingComponentIndex === index && editingDetail === 'color' ? (
                                      <div className="mt-1">
                                        <Input 
                                          className="text-sm"
                                          placeholder="Wpisz kolor"
                                          value={editedValue}
                                          onChange={(e) => setEditedValue(e.target.value)}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-800 font-medium">{String(component.details?.color || '')}</div>
                                    )}
                                  </div>
                                  <div>
                                    {editingComponentIndex === index && editingDetail === 'color' ? (
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                          onClick={saveEditedDetail}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                          onClick={cancelEditing}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => startEditing(index, 'color', String(component.details?.color || ''))}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Presentation details */}
                          {'presentation' in component.details && (
                            <div className="bg-gradient-to-r from-[#0CC5BA]/5 to-transparent p-4 rounded-xl mt-4 border border-[#0CC5BA]/10">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="text-sm font-semibold text-[#0CC5BA] flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  {t("meal.details.presentation", "Prezentacja")}
                                </h5>
                                
                                {editingComponentIndex === index && editingDetail === 'presentation' ? (
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                      onClick={saveEditedDetail}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                      onClick={cancelEditing}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    onClick={() => startEditing(index, 'presentation', String(component.details?.presentation || ''))}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {editingComponentIndex === index && editingDetail === 'presentation' ? (
                                <div className="mt-2">
                                  <Textarea 
                                    className="text-sm min-h-[80px]"
                                    placeholder="Opisz sposób prezentacji potrawy"
                                    value={editedValue}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedValue(e.target.value)}
                                  />
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700 italic">{String(component.details?.presentation || '')}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Seasonings & Garnishes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            {/* Seasonings */}
                            {component.details.seasonings && 
                             Array.isArray(component.details.seasonings) && 
                             (component.details.seasonings.length > 0 || editingComponentIndex === index && editingSeasonings) && (
                              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="text-sm font-semibold text-[#0CC5BA] flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    {t("meal.details.seasonings", "Przyprawy")}
                                  </h5>
                                  
                                  {editingComponentIndex === index && editingSeasonings ? (
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                        onClick={saveEditedDetail}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                        onClick={cancelEditing}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                      onClick={() => startEditingSeasonings(index)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                
                                {editingComponentIndex === index && editingSeasonings ? (
                                  <div className="mt-2">
                                    <Input 
                                      className="text-sm"
                                      placeholder="Przyprawy oddzielone przecinkami, np. sól, pieprz, bazylia"
                                      value={seasoningsInput}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeassoningsInput(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t("meal.details.seasoningsHint", "Wpisz przyprawy oddzielone przecinkami")}</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {component.details.seasonings.map((seasoning, idx) => (
                                      <span key={idx} className="inline-flex rounded-full px-3 py-1 bg-[#0CC5BA]/10 text-[#0CC5BA] text-xs font-medium">
                                        {seasoning}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Garnishes */}
                            {component.details.garnishes && 
                             Array.isArray(component.details.garnishes) && 
                             (component.details.garnishes.length > 0 || editingComponentIndex === index && editingGarnishes) && (
                              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    {t("meal.details.garnishes", "Dodatki")}
                                  </h5>
                                  
                                  {editingComponentIndex === index && editingGarnishes ? (
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                        onClick={saveEditedDetail}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                        onClick={cancelEditing}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                      onClick={() => startEditingGarnishes(index)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                
                                {editingComponentIndex === index && editingGarnishes ? (
                                  <div className="mt-2">
                                    <Input 
                                      className="text-sm"
                                      placeholder="Dodatki oddzielone przecinkami, np. pietruszka, szczypiorek, cytryna"
                                      value={garnishesInput}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGarnishesInput(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t("meal.details.garnishesHint", "Wpisz dodatki oddzielone przecinkami")}</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {component.details.garnishes.map((garnish, idx) => (
                                      <span key={idx} className="inline-flex rounded-full px-3 py-1 bg-green-50 text-green-600 text-xs font-medium">
                                        {garnish}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </Card>
              </motion.div>

            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}