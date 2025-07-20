import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, isToday } from "date-fns";
import { 
  ArrowLeft, 
  Calendar,
  ShoppingBag,
  Check,
  ChevronRight,
  ChevronLeft,
  Coffee,
  Utensils,
  Sun,
  Moon
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
  if (ingredientLower.includes('beef') || ingredientLower.includes('steak') || ingredientLower.includes('tenderloin')) return '🥩';
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
  if (ingredientLower.includes('spice') || ingredientLower.includes('herb') || ingredientLower.includes('mint') || ingredientLower.includes('basil') || ingredientLower.includes('oregano') || ingredientLower.includes('parsley') || ingredientLower.includes('rosemary') || ingredientLower.includes('thyme')) return '🌿';
  if (ingredientLower.includes('peanut butter') || ingredientLower.includes('almond butter')) return '🥜';
  
  // Fruits
  if (ingredientLower.includes('berr')) return '🫐';
  if (ingredientLower.includes('strawberr')) return '🍓';
  if (ingredientLower.includes('grape')) return '🍇';
  if (ingredientLower.includes('watermelon')) return '🍉';
  if (ingredientLower.includes('melon')) return '🍈';
  if (ingredientLower.includes('pineapple')) return '🍍';
  if (ingredientLower.includes('peach')) return '🍑';
  if (ingredientLower.includes('mango')) return '🥭';
  if (ingredientLower.includes('coconut')) return '🥥';
  
  // Miscellaneous
  if (ingredientLower.includes('butter')) return '🧈';
  if (ingredientLower.includes('water')) return '💧';
  if (ingredientLower.includes('coffee')) return '☕';
  if (ingredientLower.includes('juice')) return '🧃';
  if (ingredientLower.includes('ice') || ingredientLower.includes('frozen')) return '🧊';
  
  // Default
  return '🍽️';
}

// Get icon for meal type
function getMealTypeIcon(mealType: string) {
  const type = mealType.toLowerCase();
  if (type.includes('breakfast')) return <Sun className="h-5 w-5 text-yellow-500" />;
  if (type.includes('lunch')) return <Utensils className="h-5 w-5 text-blue-500" />;
  if (type.includes('dinner')) return <Moon className="h-5 w-5 text-indigo-500" />;
  if (type.includes('snack')) return <Coffee className="h-5 w-5 text-orange-500" />;
  return <Utensils className="h-5 w-5 text-gray-500" />;
}

// Get color for meal type
function getMealTypeColor(mealType: string): string {
  const type = mealType.toLowerCase();
  if (type.includes('breakfast')) return 'from-yellow-200 to-orange-100';
  if (type.includes('lunch')) return 'from-blue-200 to-cyan-100';
  if (type.includes('dinner')) return 'from-indigo-200 to-purple-100';
  if (type.includes('snack')) return 'from-orange-200 to-amber-100';
  return 'from-gray-200 to-gray-100';
}

// Get category color
function getCategoryColor(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('produce') || cat.includes('vegetable') || cat.includes('fruit')) 
    return 'from-green-200 to-emerald-100';
  if (cat.includes('protein') || cat.includes('meat')) 
    return 'from-red-200 to-rose-100';
  if (cat.includes('dairy')) 
    return 'from-blue-200 to-sky-100';
  if (cat.includes('grain') || cat.includes('carb')) 
    return 'from-amber-200 to-yellow-100';
  if (cat.includes('pantry') || cat.includes('spice') || cat.includes('canned')) 
    return 'from-orange-200 to-amber-100';
  return 'from-gray-200 to-slate-100';
}

export default function EnhancedShoppingList() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
      <div className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 relative shadow-md">
        <div className="flex items-center justify-between px-4 py-5">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/meal-plan")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">Shopping List</h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <span className="text-sm font-medium text-white px-2 py-1 bg-white/20 rounded-full">
                Weekly Shopping List
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={goToNextDay}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="w-9 h-9"></div> {/* For balanced spacing */}
        </div>
      </div>
      
      <div className="p-4">
        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4 bg-white/80 backdrop-blur-sm shadow-sm">
            <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0CC5BA] data-[state=active]:to-blue-500 data-[state=active]:text-white">
              All Items
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0CC5BA] data-[state=active]:to-blue-500 data-[state=active]:text-white">
              To Buy
            </TabsTrigger>
            <TabsTrigger value="purchased" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0CC5BA] data-[state=active]:to-blue-500 data-[state=active]:text-white">
              Purchased
            </TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <Card className="p-8 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0CC5BA]"></div>
                <p className="mt-4 text-gray-500">Loading your shopping list...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="text-center text-gray-500">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">{(error as Error).message || "Failed to load shopping list"}</p>
                <Button 
                  className="mt-6 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/shopping-list", selectedDateString] })}
                >
                  Try Again
                </Button>
              </div>
            </Card>
          ) : !shoppingListData || !shoppingListData.items || shoppingListData.items.length === 0 ? (
            <Card className="p-8 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="text-center text-gray-500">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">No items in your shopping list for this day.</p>
                <p className="text-sm mt-2">Try selecting a different date or add meals to your meal plan.</p>
                
                {hasMealPlanForDate && mealPlanId && (
                  <Button
                    className="mt-6 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white shadow-md hover:shadow-lg transition-all"
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
              <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3">
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
              
              <TabsContent value="all" className="mt-0">
                <div className="space-y-6">
                  {Object.entries(
                    groupBy === 'meal' 
                      ? getGroupedByMeal(shoppingListData.items) 
                      : getGroupedByCategory(shoppingListData.items)
                  ).map(([group, items]) => (
                    <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                        groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                      }`}>
                        <div className="flex items-center">
                          {groupBy === 'meal' && getMealTypeIcon(group)}
                          <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                            {group}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            className={`p-4 flex items-center ${item.isPurchased ? 'bg-gray-50' : ''}`}
                          >
                            {/* Checkmark button */}
                            <button
                              className={`flex-shrink-0 mr-3 h-6 w-6 rounded-full flex items-center justify-center border ${
                                item.isPurchased 
                                  ? 'bg-[#0CC5BA] border-[#0CC5BA]' 
                                  : 'border-gray-300 hover:border-[#0CC5BA]'
                              }`}
                              onClick={() => togglePurchaseMutation.mutate(item.id)}
                              aria-label={item.isPurchased ? "Mark as not purchased" : "Mark as purchased"}
                            >
                              {item.isPurchased && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </button>
                            
                            <div className="flex-1 flex items-center min-w-0">
                              {/* Ingredient emoji */}
                              <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center shadow-sm">
                                <span className="text-3xl" role="img" aria-label={item.ingredient}>
                                  {getIngredientEmoji(item.ingredient)}
                                </span>
                              </div>
                              
                              {/* Ingredient details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <span
                                    className={`${
                                      item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'
                                    } font-medium truncate`}
                                  >
                                    {item.ingredient}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center text-sm text-gray-500">
                                  <span className="truncate">
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                                {item.recipeName && (
                                  <div className="mt-1 text-xs text-gray-400 truncate">
                                    For: {item.recipeName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="pending" className="mt-0">
                <div className="space-y-6">
                  {Object.entries(
                    groupBy === 'meal' 
                      ? getGroupedByMeal(getFilteredItems(shoppingListData.items, "pending")) 
                      : getGroupedByCategory(getFilteredItems(shoppingListData.items, "pending"))
                  ).map(([group, items]) => (
                    items.length > 0 && (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                          groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                        }`}>
                          <div className="flex items-center">
                            {groupBy === 'meal' && getMealTypeIcon(group)}
                            <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                              {group}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                          {items.map(item => (
                            <div 
                              key={item.id} 
                              className="p-4 flex items-center"
                            >
                              {/* Checkmark button */}
                              <button
                                className="flex-shrink-0 mr-3 h-6 w-6 rounded-full flex items-center justify-center border border-gray-300 hover:border-[#0CC5BA]"
                                onClick={() => togglePurchaseMutation.mutate(item.id)}
                                aria-label="Mark as purchased"
                              ></button>
                              
                              <div className="flex-1 flex items-center min-w-0">
                                {/* Ingredient emoji */}
                                <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center shadow-sm">
                                  <span className="text-3xl" role="img" aria-label={item.ingredient}>
                                    {getIngredientEmoji(item.ingredient)}
                                  </span>
                                </div>
                                
                                {/* Ingredient details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <span className="text-gray-900 font-medium truncate">
                                      {item.ingredient}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center text-sm text-gray-500">
                                    <span className="truncate">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  {item.recipeName && (
                                    <div className="mt-1 text-xs text-gray-400 truncate">
                                      For: {item.recipeName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="purchased" className="mt-0">
                <div className="space-y-6">
                  {Object.entries(
                    groupBy === 'meal' 
                      ? getGroupedByMeal(getFilteredItems(shoppingListData.items, "purchased")) 
                      : getGroupedByCategory(getFilteredItems(shoppingListData.items, "purchased"))
                  ).map(([group, items]) => (
                    items.length > 0 && (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                          groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                        }`}>
                          <div className="flex items-center">
                            {groupBy === 'meal' && getMealTypeIcon(group)}
                            <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                              {group}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100 bg-gray-50">
                          {items.map(item => (
                            <div 
                              key={item.id} 
                              className="p-4 flex items-center"
                            >
                              {/* Checkmark button */}
                              <button
                                className="flex-shrink-0 mr-3 h-6 w-6 rounded-full flex items-center justify-center border bg-[#0CC5BA] border-[#0CC5BA]"
                                onClick={() => togglePurchaseMutation.mutate(item.id)}
                                aria-label="Mark as not purchased"
                              >
                                <Check className="h-4 w-4 text-white" />
                              </button>
                              
                              <div className="flex-1 flex items-center min-w-0 opacity-70">
                                {/* Ingredient emoji */}
                                <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center shadow-sm">
                                  <span className="text-3xl" role="img" aria-label={item.ingredient}>
                                    {getIngredientEmoji(item.ingredient)}
                                  </span>
                                </div>
                                
                                {/* Ingredient details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <span className="text-gray-500 line-through font-medium truncate">
                                      {item.ingredient}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center text-sm text-gray-500">
                                    <span className="truncate">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  {item.recipeName && (
                                    <div className="mt-1 text-xs text-gray-400 truncate">
                                      For: {item.recipeName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}