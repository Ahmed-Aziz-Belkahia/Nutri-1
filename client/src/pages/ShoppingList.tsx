import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, isToday } from "date-fns";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Calendar,
  ShoppingBag,
  Check,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroceryList } from "@/components/GroceryList";
import { useToast } from "@/hooks/use-toast";

interface ShoppingItem {
  id: number;
  ingredient: string;
  quantity: number;
  unit: string;
  category: string;
  isPurchased: boolean;
  mealPlanId: number;
  mealType?: string;
  recipeName?: string;
  recipeImage?: string;
}

interface ShoppingListResponse {
  items: ShoppingItem[];
  groupedItems: Record<string, ShoppingItem[]>;
  date: string;
  mealPlanIds: number[];
}

// Helper function to determine ingredient emoji
function getIngredientEmoji(ingredient: string): string {
  const ingredientLower = ingredient.toLowerCase();
  
  // Produce
  if (ingredientLower.includes('apple') || ingredientLower.includes('fruit')) return '🍎';
  if (ingredientLower.includes('banana')) return '🍌';
  if (ingredientLower.includes('lemon')) return '🍋';
  if (ingredientLower.includes('orange')) return '🍊';
  if (ingredientLower.includes('avocado')) return '🥑';
  if (ingredientLower.includes('carrot')) return '🥕';
  if (ingredientLower.includes('corn')) return '🌽';
  if (ingredientLower.includes('tomato')) return '🍅';
  if (ingredientLower.includes('potato')) return '🥔';
  if (ingredientLower.includes('broccoli')) return '🥦';
  if (ingredientLower.includes('cabbage')) return '🥬';
  if (ingredientLower.includes('spinach') || ingredientLower.includes('kale') || ingredientLower.includes('lettuce') || ingredientLower.includes('greens')) return '🥬';
  if (ingredientLower.includes('onion')) return '🧅';
  if (ingredientLower.includes('garlic')) return '🧄';
  if (ingredientLower.includes('pepper')) return '🫑';
  if (ingredientLower.includes('cucumber')) return '🥒';
  if (ingredientLower.includes('mushroom')) return '🍄';
  
  // Protein
  if (ingredientLower.includes('egg')) return '🥚';
  if (ingredientLower.includes('chicken')) return '🍗';
  if (ingredientLower.includes('turkey')) return '🦃';
  if (ingredientLower.includes('pork') || ingredientLower.includes('ham') || ingredientLower.includes('bacon')) return '🥓';
  if (ingredientLower.includes('beef') || ingredientLower.includes('steak')) return '🥩';
  if (ingredientLower.includes('fish') || ingredientLower.includes('cod') || ingredientLower.includes('salmon')) return '🐟';
  if (ingredientLower.includes('shrimp') || ingredientLower.includes('prawn')) return '🦐';
  if (ingredientLower.includes('cheese') || ingredientLower.includes('feta')) return '🧀';
  if (ingredientLower.includes('milk')) return '🥛';
  if (ingredientLower.includes('tofu')) return '🧊';
  
  // Grains/Carbs
  if (ingredientLower.includes('bread') || ingredientLower.includes('bun') || ingredientLower.includes('roll')) return '🍞';
  if (ingredientLower.includes('rice')) return '🍚';
  if (ingredientLower.includes('pasta') || ingredientLower.includes('noodle')) return '🍝';
  if (ingredientLower.includes('wrap') || ingredientLower.includes('tortilla')) return '🌮';
  if (ingredientLower.includes('bagel')) return '🥯';
  if (ingredientLower.includes('pretzel')) return '🥨';
  if (ingredientLower.includes('flour') || ingredientLower.includes('breadcrumb')) return '🧇';
  
  // Pantry/Condiments
  if (ingredientLower.includes('salt')) return '🧂';
  if (ingredientLower.includes('oil')) return '🫗';
  if (ingredientLower.includes('vinegar')) return '🧪';
  if (ingredientLower.includes('sauce') || ingredientLower.includes('ketchup') || ingredientLower.includes('mayonnaise')) return '🧴';
  if (ingredientLower.includes('honey') || ingredientLower.includes('maple') || ingredientLower.includes('syrup') || ingredientLower.includes('sugar')) return '🍯';
  if (ingredientLower.includes('spice') || ingredientLower.includes('herb') || ingredientLower.includes('mint') || ingredientLower.includes('basil') || ingredientLower.includes('oregano') || ingredientLower.includes('parsley')) return '🌿';
  if (ingredientLower.includes('peanut butter') || ingredientLower.includes('almond butter')) return '🥜';
  
  // Miscellaneous
  if (ingredientLower.includes('butter')) return '🧈';
  if (ingredientLower.includes('water')) return '💧';
  if (ingredientLower.includes('coffee')) return '☕';
  if (ingredientLower.includes('juice')) return '🧃';
  if (ingredientLower.includes('ice') || ingredientLower.includes('frozen')) return '🧊';
  
  // Default
  return '🍽️';
}

// Redirecting to the enhanced TranslatedShoppingList component
import TranslatedShoppingList from '@/components/TranslatedShoppingList';

export default function ShoppingList() {
  // Return the TranslatedShoppingList component to provide proper multilingual support
  return <TranslatedShoppingList />;
}

// Original implementation (retained for reference)
function OriginalShoppingList() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  
  // Parse URL parameters for date
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const dateParam = urlParams.get('date');
  
  // State to track the selected date
  const [selectedDate, setSelectedDate] = useState<Date>(
    dateParam ? new Date(dateParam) : new Date()
  );
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  
  // Fetch meal plans for the selected date
  const { data: mealPlansData } = useQuery({
    queryKey: ["/api/meal-plans/all"],
    queryFn: async () => {
      const response = await fetch(`/api/meal-plans/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch meal plans');
      }
      return response.json();
    }
  });
  
  // Check if there's a meal plan for the selected date
  const hasMealPlanForDate = mealPlansData?.plans?.some(
    (plan: any) => plan.date === selectedDateString
  ) || false;
  
  // Get meal plan ID for the selected date
  const mealPlanId = mealPlansData?.plans?.find(
    (plan: any) => plan.date === selectedDateString
  )?.id;

  // Fetch shopping list for the selected date
  const { 
    data: shoppingListData, 
    isLoading, 
    error,
    refetch: refetchShoppingList
  } = useQuery<ShoppingListResponse>({
    queryKey: ["/api/shopping-list", selectedDateString],
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list/${selectedDateString}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to view your shopping list.');
        }
        throw new Error('Failed to fetch shopping list');
      }
      return response.json();
    },
    retry: false
  });
  
  // Mutation to generate shopping list for a meal plan
  const generateShoppingListMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch(`/api/meal-plans/${planId}/generate-grocery-list`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to generate shopping list");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchShoppingList();
      toast({
        title: "Success",
        description: "Shopping list generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list",
        variant: "destructive",
      });
    },
  });
  
  // Toggle item purchase status
  const togglePurchaseMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/shopping-list-items/${itemId}/toggle`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to update item status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/shopping-list", selectedDateString],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    },
  });
  
  // Function to navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };
  
  // Function to navigate to next day
  const goToNextDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };
  
  // Tabs for different views
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter items by purchase status
  const getFilteredItems = (items: ShoppingItem[], status: "all" | "pending" | "purchased") => {
    if (status === "all") return items;
    if (status === "pending") return items.filter(item => !item.isPurchased);
    if (status === "purchased") return items.filter(item => item.isPurchased);
    return items;
  };
  
  // Map of meal types for translation
  const mealTypeTranslations: {[key: string]: string} = {
    "breakfast": t('mealTypes.breakfast', 'śniadanie'),
    "morning_snack": t('mealTypes.morningSnack', 'przekąska poranna'),
    "morning snack": t('mealTypes.morningSnack', 'przekąska poranna'),
    "lunch": t('mealTypes.lunch', 'obiad'),
    "afternoon_snack": t('mealTypes.afternoonSnack', 'przekąska popołudniowa'),
    "afternoon snack": t('mealTypes.afternoonSnack', 'przekąska popołudniowa'),
    "snack": t('mealTypes.snack', 'przekąska'),
    "dinner": t('mealTypes.dinner', 'kolacja'),
    "evening_snack": t('mealTypes.eveningSnack', 'przekąska wieczorna'),
    "evening snack": t('mealTypes.eveningSnack', 'przekąska wieczorna')
  };
  
  // Group translations for display
  const groupTranslations: {[key: string]: string} = {
    "morning": t('mealGroups.morning', 'Poranek'),
    "afternoon": t('mealGroups.afternoon', 'Popołudnie'),
    "evening": t('mealGroups.evening', 'Wieczór')
  };

  // Group items by meal type
  const getGroupedByMeal = (items: ShoppingItem[]) => {
    return items.reduce((acc, item) => {
      const mealType = item.mealType || 'other';
      if (!acc[mealType]) {
        acc[mealType] = [];
      }
      acc[mealType].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  };
  
  // Group items by category
  const getGroupedByCategory = (items: ShoppingItem[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  };
  
  // State for grouping type
  const [groupBy, setGroupBy] = useState<'meal' | 'category'>('meal');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white relative shadow-sm">
        <div className="flex items-center justify-between px-4 py-5">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/meal-plan")}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">Shopping List</h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <span className="text-sm font-medium">
                Weekly Shopping List
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0"
                onClick={goToNextDay}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="invisible" // For balanced spacing
          >
            <Calendar className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="pending">To Buy</TabsTrigger>
            <TabsTrigger value="purchased">Purchased</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0CC5BA]"></div>
                <p className="mt-4 text-gray-500">Loading shopping list...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>{(error as Error).message || "Failed to load shopping list"}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/shopping-list", selectedDateString] })}
                >
                  Try Again
                </Button>
              </div>
            </Card>
          ) : !shoppingListData || !shoppingListData.items || shoppingListData.items.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No items in your shopping list for this day.</p>
                <p className="text-sm mt-2">Try selecting a different date or add meals to your meal plan.</p>
                
                {hasMealPlanForDate && mealPlanId && (
                  <Button
                    className="mt-4 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white"
                    onClick={() => generateShoppingListMutation.mutate(mealPlanId)}
                    disabled={generateShoppingListMutation.isPending}
                  >
                    {generateShoppingListMutation.isPending ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                        Generating...
                      </>
                    ) : (
                      <>Generate Shopping List</>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              <TabsContent value="all" className="mt-0">
                <Card className="p-4">
                  <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Group by:</h3>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={groupBy === 'meal' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setGroupBy('meal')}
                        className={groupBy === 'meal' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                      >
                        Meal Type
                      </Button>
                      <Button 
                        variant={groupBy === 'category' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setGroupBy('category')}
                        className={groupBy === 'category' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                      >
                        Category
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                    {Object.entries(
                      groupBy === 'meal' 
                        ? getGroupedByMeal(shoppingListData.items) 
                        : getGroupedByCategory(shoppingListData.items)
                    ).map(([group, items]) => (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <h4 className="text-lg font-medium text-gray-700 capitalize flex items-center">
                            {group === 'breakfast' && <span className="mr-2">🍳</span>}
                            {group === 'lunch' && <span className="mr-2">🥗</span>}
                            {group === 'dinner' && <span className="mr-2">🍽️</span>}
                            {group === 'snack' && <span className="mr-2">🍿</span>}
                            {group === 'produce' && <span className="mr-2">🥬</span>}
                            {group === 'protein' && <span className="mr-2">🥩</span>}
                            {group === 'dairy' && <span className="mr-2">🧀</span>}
                            {group === 'grains' && <span className="mr-2">🌾</span>}
                            {group === 'pantry' && <span className="mr-2">🥫</span>}
                            {group === 'other' && <span className="mr-2">📦</span>}
                            {group}
                          </h4>
                        </div>
                        <div className="space-y-2 p-3">
                          {items.map((item) => {
                            // Find a unique recipe for this item to show image
                            const hasRecipeDetails = item.recipeName && item.recipeImage;
                            
                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100"
                              >
                                <div className="flex items-start gap-3 w-full">
                                  {/* Checkbox for purchase status */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`mt-1 ${
                                      item.isPurchased
                                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                                        : "hover:bg-gray-100"
                                    }`}
                                    onClick={() => togglePurchaseMutation.mutate(item.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  
                                  {/* Ingredient image */}
                                  <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md">
                                    <img 
                                      src={`https://source.unsplash.com/100x100/?food,${encodeURIComponent(item.ingredient.split(' ').slice(-1)[0])}`}
                                      alt={item.ingredient}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  
                                  {/* Ingredient details */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <span
                                        className={`${
                                          item.isPurchased ? "line-through text-gray-400" : "font-medium text-gray-800"
                                        }`}
                                      >
                                        {item.ingredient}
                                      </span>
                                      <span className="text-sm text-gray-500 ml-2">
                                        {item.quantity} {item.unit}
                                      </span>
                                    </div>
                                    
                                    {/* Show recipe name if grouping by category */}
                                    {groupBy === 'category' && item.recipeName && (
                                      <span className="text-xs text-gray-500 block mt-1">
                                        For: {item.recipeName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="pending" className="mt-0">
                <Card className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Group by:</h3>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant={groupBy === 'meal' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setGroupBy('meal')}
                          className={groupBy === 'meal' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                        >
                          Meal Type
                        </Button>
                        <Button 
                          variant={groupBy === 'category' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setGroupBy('category')}
                          className={groupBy === 'category' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                        >
                          Category
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(
                      groupBy === 'meal' 
                        ? getGroupedByMeal(getFilteredItems(shoppingListData.items, "pending")) 
                        : getGroupedByCategory(getFilteredItems(shoppingListData.items, "pending"))
                    ).map(([group, items]) => (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <h4 className="text-lg font-medium text-gray-700 capitalize flex items-center">
                            {group === 'breakfast' && <span className="mr-2">🍳</span>}
                            {group === 'lunch' && <span className="mr-2">🥗</span>}
                            {group === 'dinner' && <span className="mr-2">🍽️</span>}
                            {group === 'snack' && <span className="mr-2">🍿</span>}
                            {group === 'produce' && <span className="mr-2">🥬</span>}
                            {group === 'protein' && <span className="mr-2">🥩</span>}
                            {group === 'dairy' && <span className="mr-2">🧀</span>}
                            {group === 'grains' && <span className="mr-2">🌾</span>}
                            {group === 'pantry' && <span className="mr-2">🥫</span>}
                            {group === 'other' && <span className="mr-2">📦</span>}
                            {group}
                          </h4>
                        </div>
                        <div className="space-y-2 p-3">
                          {items.map((item) => {
                            // Find a unique recipe for this item to show image
                            const hasRecipeDetails = item.recipeName && item.recipeImage;
                            
                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100"
                              >
                                <div className="flex items-start gap-3 w-full">
                                  {/* Checkbox for purchase status */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 hover:bg-gray-100"
                                    onClick={() => togglePurchaseMutation.mutate(item.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  
                                  {/* Ingredient image */}
                                  <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md">
                                    <img 
                                      src={`https://source.unsplash.com/100x100/?food,${encodeURIComponent(item.ingredient.split(' ').slice(-1)[0])}`}
                                      alt={item.ingredient}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  
                                  {/* Ingredient details */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium text-gray-800">
                                        {item.ingredient}
                                      </span>
                                      <span className="text-sm text-gray-500 ml-2">
                                        {item.quantity} {item.unit}
                                      </span>
                                    </div>
                                    
                                    {/* Show recipe name if grouping by category */}
                                    {groupBy === 'category' && item.recipeName && (
                                      <span className="text-xs text-gray-500 block mt-1">
                                        For: {item.recipeName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {getFilteredItems(shoppingListData.items, "pending").length === 0 && (
                      <div className="text-center text-gray-500 py-10">
                        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <p>All items purchased!</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="purchased" className="mt-0">
                <Card className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Group by:</h3>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant={groupBy === 'meal' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setGroupBy('meal')}
                          className={groupBy === 'meal' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                        >
                          Meal Type
                        </Button>
                        <Button 
                          variant={groupBy === 'category' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setGroupBy('category')}
                          className={groupBy === 'category' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                        >
                          Category
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(
                      groupBy === 'meal' 
                        ? getGroupedByMeal(getFilteredItems(shoppingListData.items, "purchased")) 
                        : getGroupedByCategory(getFilteredItems(shoppingListData.items, "purchased"))
                    ).map(([group, items]) => (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <h4 className="text-lg font-medium text-gray-700 capitalize flex items-center">
                            {group === 'breakfast' && <span className="mr-2">🍳</span>}
                            {group === 'lunch' && <span className="mr-2">🥗</span>}
                            {group === 'dinner' && <span className="mr-2">🍽️</span>}
                            {group === 'snack' && <span className="mr-2">🍿</span>}
                            {group === 'produce' && <span className="mr-2">🥬</span>}
                            {group === 'protein' && <span className="mr-2">🥩</span>}
                            {group === 'dairy' && <span className="mr-2">🧀</span>}
                            {group === 'grains' && <span className="mr-2">🌾</span>}
                            {group === 'pantry' && <span className="mr-2">🥫</span>}
                            {group === 'other' && <span className="mr-2">📦</span>}
                            {group}
                          </h4>
                        </div>
                        <div className="space-y-2 p-3">
                          {items.map((item) => {
                            // Find a unique recipe for this item to show image
                            const hasRecipeDetails = item.recipeName && item.recipeImage;
                            
                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100"
                              >
                                <div className="flex items-start gap-3 w-full">
                                  {/* Checkbox for purchase status */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 bg-green-100 text-green-600 hover:bg-green-200"
                                    onClick={() => togglePurchaseMutation.mutate(item.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  
                                  {/* Ingredient image */}
                                  <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md opacity-50">
                                    <img 
                                      src={`https://source.unsplash.com/100x100/?food,${encodeURIComponent(item.ingredient.split(' ').slice(-1)[0])}`}
                                      alt={item.ingredient}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  
                                  {/* Ingredient details */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <span className="line-through text-gray-400">
                                        {item.ingredient}
                                      </span>
                                      <span className="text-sm text-gray-500 ml-2">
                                        {item.quantity} {item.unit}
                                      </span>
                                    </div>
                                    
                                    {/* Show recipe name if grouping by category */}
                                    {groupBy === 'category' && item.recipeName && (
                                      <span className="text-xs text-gray-400 block mt-1 line-through">
                                        For: {item.recipeName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {getFilteredItems(shoppingListData.items, "purchased").length === 0 && (
                      <div className="text-center text-gray-500 py-10">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>No purchased items yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}