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
  Moon,
  Info,
  ShoppingCart,
  X,
  Layers,
  Filter,
  PlusCircle,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
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
  customImage?: string;
  price?: number;
  location?: string;
}

interface ShoppingListResponse {
  items: ShoppingItem[];
  groupedItems: Record<string, ShoppingItem[]>;
  date: string;
  mealPlanIds: number[];
  totalPrice?: number;
  location?: string;
}

interface Location {
  id: string;
  name: string;
  logo: string;
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
  if (ingredientLower.includes('chicken') || ingredientLower.includes('thigh')) return '🍗';
  if (ingredientLower.includes('turkey')) return '🦃';
  if (ingredientLower.includes('pork') || ingredientLower.includes('ham') || ingredientLower.includes('bacon') || ingredientLower.includes('chop')) return '🥓';
  if (ingredientLower.includes('beef') || ingredientLower.includes('steak')) return '🥩';
  if (ingredientLower.includes('fish') || ingredientLower.includes('cod') || ingredientLower.includes('salmon')) return '🐟';
  if (ingredientLower.includes('shrimp') || ingredientLower.includes('prawn')) return '🦐';
  if (ingredientLower.includes('cheese') || ingredientLower.includes('goat')) return '🧀';
  if (ingredientLower.includes('milk')) return '🥛';
  if (ingredientLower.includes('tofu')) return '🧊';
  
  // Grains/Carbs
  if (ingredientLower.includes('bread') || ingredientLower.includes('bun') || ingredientLower.includes('roll')) return '🍞';
  if (ingredientLower.includes('rice')) return '🍚';
  if (ingredientLower.includes('pasta') || ingredientLower.includes('noodle')) return '🍝';
  if (ingredientLower.includes('wrap') || ingredientLower.includes('tortilla')) return '🌮';
  if (ingredientLower.includes('bagel')) return '🥯';
  if (ingredientLower.includes('pretzel')) return '🥨';
  if (ingredientLower.includes('flour')) return '🌾';
  
  // Pantry/Condiments
  if (ingredientLower.includes('salt')) return '🧂';
  if (ingredientLower.includes('oil')) return '🫗';
  if (ingredientLower.includes('vinegar')) return '🧪';
  if (ingredientLower.includes('sauce') || ingredientLower.includes('ketchup') || ingredientLower.includes('mayonnaise')) return '🧴';
  if (ingredientLower.includes('honey') || ingredientLower.includes('maple') || ingredientLower.includes('syrup') || ingredientLower.includes('sugar')) return '🍯';
  if (ingredientLower.includes('spice') || ingredientLower.includes('herb') || ingredientLower.includes('mint') || ingredientLower.includes('basil') || ingredientLower.includes('oregano') || ingredientLower.includes('parsley')) return '🌿';
  if (ingredientLower.includes('peanut butter') || ingredientLower.includes('almond butter') || ingredientLower.includes('walnut')) return '🥜';
  if (ingredientLower.includes('pepper')) return '🌶️';
  
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

// Format ingredient name for better display
function formatIngredientName(ingredient: string): string {
  if (!ingredient) return '';
  
  // Remove quantities and measurements that might be at the beginning
  let formattedName = ingredient
    .replace(/^[\d\s\/]+/, '') // Remove numbers at the beginning
    .replace(/^(cup|tbsp|tsp|oz|g|kg|ml|l)s?\s+of\s+/i, '') // Remove measurement units
    .replace(/^(pinch|dash|handful|sprinkle)\s+of\s+/i, '')
    .trim();
  
  // Capitalize first letter of each word
  formattedName = formattedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formattedName;
}

// Get a real image for the ingredient (use food image APIs)
function getIngredientImageUrl(ingredient: string, customImage?: string): string {
  // If custom image is provided, use it
  if (customImage) {
    return customImage;
  }
  
  // Clean the ingredient name to get better search results
  const cleanedIngredient = ingredient
    .replace(/\d+/g, '') // Remove numbers
    .replace(/cup|tbsp|tsp|oz|g|kg|ml|l|pinch|to taste|chopped|sliced|diced/gi, '') // Remove units and preparations
    .trim()
    .split(',')[0] // Take first part before any comma
    .split(' ')[0]; // Use just the first word for better matches
  
  // Different image sources to try
  const imageApis = [
    `https://source.unsplash.com/featured/?food,${encodeURIComponent(cleanedIngredient)}`,
    `https://images.pexels.com/photos/close-up-of-${encodeURIComponent(cleanedIngredient)}-against-white-background/300`,
    `https://static.openfoodfacts.org/images/products/food/${encodeURIComponent(cleanedIngredient)}.jpg`
  ];
  
  // Randomly select one of the APIs for variety
  const randomIndex = Math.floor(Math.random() * imageApis.length);
  return imageApis[randomIndex];
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

// Get meal type emoji
function getMealTypeEmoji(mealType: string): string {
  const type = mealType.toLowerCase();
  if (type.includes('breakfast')) return '🍳';
  if (type.includes('lunch')) return '🥗';
  if (type.includes('dinner')) return '🍽️';
  if (type.includes('snack')) return '🍪';
  return '🥘';
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

// Get meal type background 
function getMealTypeBg(mealType: string): string {
  const type = mealType.toLowerCase();
  if (type.includes('breakfast')) return 'bg-yellow-50';
  if (type.includes('lunch')) return 'bg-blue-50';
  if (type.includes('dinner')) return 'bg-indigo-50';
  if (type.includes('snack')) return 'bg-orange-50';
  return 'bg-gray-50';
}

// Get meal type border
function getMealTypeBorder(mealType: string): string {
  const type = mealType.toLowerCase();
  if (type.includes('breakfast')) return 'border-yellow-200';
  if (type.includes('lunch')) return 'border-blue-200';
  if (type.includes('dinner')) return 'border-indigo-200';
  if (type.includes('snack')) return 'border-orange-200';
  return 'border-gray-200';
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

// Function to get realistic Polish prices in PLN for grocery items
function getPolishPrice(ingredient: string): number {
  // Prices in Polish Złoty (PLN)
  const lowerIngredient = ingredient.toLowerCase();
  
  // Fruits and vegetables
  if (lowerIngredient.includes('apple') || lowerIngredient.includes('jabłko')) return 1.50 + Math.random() * 2;
  if (lowerIngredient.includes('banana') || lowerIngredient.includes('banan')) return 3.99 + Math.random() * 1.5;
  if (lowerIngredient.includes('tomato') || lowerIngredient.includes('pomidor')) return 4.50 + Math.random() * 3; 
  if (lowerIngredient.includes('potato') || lowerIngredient.includes('ziemniak')) return 2.99 + Math.random() * 1;
  if (lowerIngredient.includes('onion') || lowerIngredient.includes('cebul')) return 2.49 + Math.random() * 1;
  if (lowerIngredient.includes('carrot') || lowerIngredient.includes('marchew')) return 3.29 + Math.random() * 1;
  if (lowerIngredient.includes('lettuce') || lowerIngredient.includes('sałat')) return 4.99 + Math.random() * 1.5;
  
  // Diary products
  if (lowerIngredient.includes('milk') || lowerIngredient.includes('mlek')) return 3.49 + Math.random() * 1.5;
  if (lowerIngredient.includes('cheese') || lowerIngredient.includes('ser')) return 9.99 + Math.random() * 10;
  if (lowerIngredient.includes('butter') || lowerIngredient.includes('masło')) return 7.99 + Math.random() * 3;
  if (lowerIngredient.includes('yogurt') || lowerIngredient.includes('jogurt')) return 2.29 + Math.random() * 2;
  
  // Meats
  if (lowerIngredient.includes('chicken') || lowerIngredient.includes('kurczak')) return 15.99 + Math.random() * 5;
  if (lowerIngredient.includes('beef') || lowerIngredient.includes('wołowina')) return 29.99 + Math.random() * 10;
  if (lowerIngredient.includes('pork') || lowerIngredient.includes('wieprzowina')) return 19.99 + Math.random() * 7;
  if (lowerIngredient.includes('sausage') || lowerIngredient.includes('kiełbasa')) return 12.99 + Math.random() * 8;
  
  // Grains
  if (lowerIngredient.includes('bread') || lowerIngredient.includes('chleb')) return 4.99 + Math.random() * 3;
  if (lowerIngredient.includes('rice') || lowerIngredient.includes('ryż')) return 5.49 + Math.random() * 3;
  if (lowerIngredient.includes('pasta') || lowerIngredient.includes('makaron')) return 4.99 + Math.random() * 4;
  if (lowerIngredient.includes('cereal') || lowerIngredient.includes('płatki')) return 9.99 + Math.random() * 5;
  
  // Beverages
  if (lowerIngredient.includes('juice') || lowerIngredient.includes('sok')) return 5.99 + Math.random() * 3;
  if (lowerIngredient.includes('water') || lowerIngredient.includes('woda')) return 2.49 + Math.random() * 1.5;
  if (lowerIngredient.includes('tea') || lowerIngredient.includes('herbata')) return 8.99 + Math.random() * 10;
  if (lowerIngredient.includes('coffee') || lowerIngredient.includes('kawa')) return 19.99 + Math.random() * 15;
  
  // Snacks and others
  if (lowerIngredient.includes('chocolate') || lowerIngredient.includes('czekolada')) return 6.99 + Math.random() * 6;
  if (lowerIngredient.includes('cookie') || lowerIngredient.includes('ciastko')) return 5.49 + Math.random() * 4;
  if (lowerIngredient.includes('oil') || lowerIngredient.includes('olej')) return 14.99 + Math.random() * 5;
  if (lowerIngredient.includes('sugar') || lowerIngredient.includes('cukier')) return 3.99 + Math.random() * 1;
  if (lowerIngredient.includes('flour') || lowerIngredient.includes('mąka')) return 3.79 + Math.random() * 2;
  
  // Default range for other items
  return 5.99 + Math.random() * 9;
}

export default function ImprovedShoppingList() {
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
  
  // State for item details modal
  const [detailItem, setDetailItem] = useState<ShoppingItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // State for multi-select functionality
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showBatchActionSheet, setShowBatchActionSheet] = useState(false);
  
  // State for meal recipe details
  const [selectedRecipe, setSelectedRecipe] = useState<{
    name: string;
    image?: string;
    ingredients: ShoppingItem[];
  } | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  
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
      setSelectedItems([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    },
  });
  
  // Batch toggle items purchase status
  const batchTogglePurchaseMutation = useMutation({
    mutationFn: async ({ ids, markAsPurchased }: { ids: number[], markAsPurchased: boolean }) => {
      // Since we don't have a batch endpoint, we'll call the toggle endpoint multiple times
      const promises = ids.map(id => 
        fetch(`/api/shopping-list-items/${id}/toggle`, {
          method: "POST",
        })
      );
      
      const results = await Promise.all(promises);
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount > 0) {
        throw new Error(`Failed to update ${failedCount} items`);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/shopping-list", selectedDateString],
      });
      setSelectedItems([]);
      setShowBatchActionSheet(false);
      toast({
        title: "Success",
        description: `${selectedItems.length} items updated successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update some items",
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
  
  // Handle item selection for batch actions
  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };
  
  // Handle batch mark as purchased
  const handleBatchMarkAsPurchased = () => {
    batchTogglePurchaseMutation.mutate({ 
      ids: selectedItems, 
      markAsPurchased: true 
    });
  };
  
  // Reset selection
  const resetSelection = () => {
    setSelectedItems([]);
    setShowBatchActionSheet(false);
  };
  
  // Show details for an ingredient
  const showIngredientDetails = (item: ShoppingItem) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };
  
  // Function to generate a new image for an ingredient
  const generateNewImage = (item: ShoppingItem) => {
    // Update the local state with a timestamp to force a new image
    if (!shoppingListData) return;
    
    const timestamp = Date.now();
    const updatedItems = shoppingListData.items.map(i => 
      i.id === item.id ? { ...i, customImage: `refresh_${timestamp}` } : i
    );
    
    // Update in the query cache
    queryClient.setQueryData(["/api/shopping-list", selectedDateString], {
      ...shoppingListData,
      items: updatedItems
    });
    
    toast({
      title: "Image Refreshed",
      description: `New image generated for ${item.ingredient}`,
    });
  };
  
  // Show recipe details
  const showRecipeDetails = (mealType: string) => {
    if (!shoppingListData) return;

    const itemsForMeal = shoppingListData.items.filter(
      item => item.mealType === mealType
    );
    
    if (itemsForMeal.length === 0) return;
    
    // Get the first item to get recipe info
    const recipeName = itemsForMeal[0].recipeName || mealType;
    const recipeImage = itemsForMeal[0].recipeImage;
    
    setSelectedRecipe({
      name: recipeName,
      image: recipeImage,
      ingredients: itemsForMeal
    });
    
    setShowRecipeModal(true);
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
  
  // State for location-based pricing
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  
  // Fetch available locations for price comparison
  const { data: locationsData } = useQuery<{ locations: Location[] }>({
    queryKey: ["/api/shopping-list/locations"],
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list/locations`);
      if (!response.ok) {
        throw new Error('Failed to fetch available locations');
      }
      return response.json();
    }
  });
  
  // Fetch prices for the current shopping list at the selected location
  const { 
    data: pricedShoppingList,
    isLoading: isPricingLoading
  } = useQuery<ShoppingListResponse>({
    queryKey: ["/api/shopping-list/prices", selectedDateString, selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) {
        throw new Error('No location selected');
      }
      const response = await fetch(`/api/shopping-list/${selectedDateString}/prices/${selectedLocation}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prices for location');
      }
      return response.json();
    },
    enabled: !!selectedLocation && !!shoppingListData?.items.length,
    staleTime: 60000 // Cache for 1 minute
  });
  
  // Combine the shopping list with prices if available
  const displayedShoppingList = selectedLocation && pricedShoppingList ? pricedShoppingList : shoppingListData;

  // Get selection status for an item
  const isSelected = (itemId: number) => selectedItems.includes(itemId);

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
          
          {selectedItems.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBatchActionSheet(true)}
              className="text-white hover:bg-white/20 relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-white text-blue-500 rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold">
                {selectedItems.length}
              </span>
            </Button>
          ) : (
            <div className="w-9 h-9"></div>
          )}
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Group by:</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={groupBy === 'meal' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setGroupBy('meal')}
                      className={groupBy === 'meal' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                    >
                      <Utensils className="w-4 h-4 mr-1" /> Meal
                    </Button>
                    <Button 
                      variant={groupBy === 'category' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setGroupBy('category')}
                      className={groupBy === 'category' ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white' : ''}
                    >
                      <Layers className="w-4 h-4 mr-1" /> Category
                    </Button>
                  </div>
                </div>
                
                {/* Location-based pricing selector */}
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-gray-800">Pricing:</h3>
                    
                    <div className="flex items-center gap-2">
                      {selectedLocation && locationsData?.locations.find(loc => loc.id === selectedLocation) && (
                        <div className="flex items-center bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                          <img 
                            src={locationsData?.locations.find(loc => loc.id === selectedLocation)?.logo} 
                            alt={locationsData?.locations.find(loc => loc.id === selectedLocation)?.name} 
                            className="h-5 w-5 object-contain mr-1"
                          />
                          <span className="text-sm text-blue-700 font-medium">
                            {locationsData?.locations.find(loc => loc.id === selectedLocation)?.name}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedLocation(null)}
                            className="h-5 w-5 ml-1 p-0 text-blue-500 hover:text-blue-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      <span className="text-sm font-semibold bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">
                        Total: {displayedShoppingList?.totalPrice ? displayedShoppingList.totalPrice.toFixed(2) : 
                          displayedShoppingList?.items.reduce((sum, item) => sum + (item.price || getPolishPrice(item.ingredient)), 0).toFixed(2)} zł
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Location selector dialog */}
              <Dialog open={showLocationSelector} onOpenChange={setShowLocationSelector}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Choose a store for pricing</DialogTitle>
                  </DialogHeader>
                  
                  {locationsData?.locations ? (
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {locationsData.locations.map(loc => (
                        <Button
                          key={loc.id}
                          variant="outline"
                          className="justify-start h-16 relative"
                          onClick={() => {
                            setSelectedLocation(loc.id);
                            setShowLocationSelector(false);
                          }}
                        >
                          <div className="flex items-center">
                            <img 
                              src={loc.logo} 
                              alt={loc.name} 
                              className="h-10 w-10 object-contain mr-3"
                            />
                            <span className="font-medium">{loc.name}</span>
                          </div>
                          
                          {loc.id === "wholeFoods" && (
                            <span className="absolute right-3 top-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              Premium
                            </span>
                          )}
                          
                          {loc.id === "costco" && (
                            <span className="absolute right-3 top-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Best Value
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0CC5BA] mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading available stores...</p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              <TabsContent value="all" className="mt-0">
                <div className="space-y-6">
                  {Object.entries(
                    groupBy === 'meal' 
                      ? getGroupedByMeal(displayedShoppingList?.items || []) 
                      : getGroupedByCategory(displayedShoppingList?.items || [])
                  ).map(([group, items]) => (
                    <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                        groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {groupBy === 'meal' && getMealTypeIcon(group)}
                            <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                              {group}
                            </h4>
                          </div>
                          
                          {/* View recipe button only for meal groups */}
                          {groupBy === 'meal' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => showRecipeDetails(group)}
                              className="text-gray-700 hover:text-gray-900"
                            >
                              <Info className="w-4 h-4 mr-1" /> Recipe
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            className={`p-3 flex items-center ${item.isPurchased ? 'bg-gray-50' : ''}`}
                          >
                            {/* Combined selection and purchase checkbox */}
                            <div className="mr-4">
                              <button
                                className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border ${
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
                            </div>
                            
                            {/* Item content - clickable for details */}
                            <div 
                              className="flex-1 flex items-center min-w-0 cursor-pointer"
                              onClick={() => showIngredientDetails(item)}
                            >
                              {/* Ingredient photo with emoji fallback */}
                              <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center shadow-sm relative">
                                <div className="absolute inset-0 bg-cover bg-center" style={{ 
                                  backgroundImage: `url(${getIngredientImageUrl(item.ingredient, item.customImage)})`,
                                  opacity: 0.8
                                }}></div>
                                <span className="text-3xl relative z-10 drop-shadow-md" role="img" aria-label={item.ingredient}>
                                  {getIngredientEmoji(item.ingredient)}
                                </span>
                                <button 
                                  className="absolute top-0 right-0 bg-white/80 rounded-bl-md p-1 shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateNewImage(item);
                                  }}
                                >
                                  <ImageIcon className="w-3 h-3 text-gray-600" />
                                </button>
                              </div>
                              
                              {/* Ingredient details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <span
                                      className={`${
                                        item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'
                                      } font-medium truncate`}
                                    >
                                      {item.ingredient}
                                    </span>
                                    
                                    {/* Price display - always shown */}
                                    {item.price && (
                                      <span className="ml-2 text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        {item.price.toFixed(2)} zł
                                      </span>
                                    )}
                                    {!item.price && (
                                      <span className="ml-2 text-sm font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                                        {getPolishPrice(item.ingredient).toFixed(2)} zł
                                      </span>
                                    )}
                                  </div>
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
                      ? getGroupedByMeal(getFilteredItems(displayedShoppingList?.items || [], "pending")) 
                      : getGroupedByCategory(getFilteredItems(displayedShoppingList?.items || [], "pending"))
                  ).map(([group, items]) => (
                    items.length > 0 && (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                          groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {groupBy === 'meal' && getMealTypeIcon(group)}
                              <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                                {group}
                              </h4>
                            </div>
                            
                            {/* View recipe button only for meal groups */}
                            {groupBy === 'meal' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => showRecipeDetails(group)}
                                className="text-gray-700 hover:text-gray-900"
                              >
                                <Info className="w-4 h-4 mr-1" /> Recipe
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                          {items.map(item => (
                            <div 
                              key={item.id} 
                              className="p-3 flex items-center"
                            >
                              {/* Combined selection and purchase checkbox */}
                              <div className="mr-4">
                                <button
                                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border border-gray-300 hover:border-[#0CC5BA]"
                                  onClick={() => togglePurchaseMutation.mutate(item.id)}
                                  aria-label="Mark as purchased"
                                ></button>
                              </div>
                              
                              {/* Item content - clickable for details */}
                              <div 
                                className="flex-1 flex items-center min-w-0 cursor-pointer"
                                onClick={() => showIngredientDetails(item)}
                              >
                                {/* Ingredient photo with emoji fallback */}
                                <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center shadow-sm relative">
                                  <div className="absolute inset-0 bg-cover bg-center" style={{ 
                                    backgroundImage: `url(${getIngredientImageUrl(item.ingredient, item.customImage)})`,
                                    opacity: 0.8
                                  }}></div>
                                  <span className="text-3xl relative z-10 drop-shadow-md" role="img" aria-label={item.ingredient}>
                                    {getIngredientEmoji(item.ingredient)}
                                  </span>
                                </div>
                                
                                {/* Ingredient details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                      <span className="text-gray-900 font-medium truncate">
                                        {formatIngredientName(item.ingredient)}
                                      </span>
                                      
                                      {/* Price display - always shown */}
                                      {item.price && (
                                        <span className="ml-2 text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                          {item.price.toFixed(2)} zł
                                        </span>
                                      )}
                                      {!item.price && (
                                        <span className="ml-2 text-sm font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                                          {getPolishPrice(item.ingredient).toFixed(2)} zł
                                        </span>
                                      )}
                                    </div>
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
                      ? getGroupedByMeal(getFilteredItems(displayedShoppingList?.items || [], "purchased")) 
                      : getGroupedByCategory(getFilteredItems(displayedShoppingList?.items || [], "purchased"))
                  ).map(([group, items]) => (
                    items.length > 0 && (
                      <div key={group} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`p-3 border-b border-gray-100 bg-gradient-to-r ${
                          groupBy === 'meal' ? getMealTypeColor(group) : getCategoryColor(group)
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {groupBy === 'meal' && getMealTypeIcon(group)}
                              <h4 className="text-lg font-medium text-gray-800 ml-2 capitalize">
                                {group}
                              </h4>
                            </div>
                            
                            {/* View recipe button only for meal groups */}
                            {groupBy === 'meal' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => showRecipeDetails(group)}
                                className="text-gray-700 hover:text-gray-900"
                              >
                                <Info className="w-4 h-4 mr-1" /> Recipe
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100 bg-gray-50">
                          {items.map(item => (
                            <div 
                              key={item.id} 
                              className="p-3 flex items-center"
                            >
                              {/* Combined selection and purchase checkbox */}
                              <div className="mr-4">
                                <button
                                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border bg-[#0CC5BA] border-[#0CC5BA]"
                                  onClick={() => togglePurchaseMutation.mutate(item.id)}
                                  aria-label="Mark as not purchased"
                                >
                                  <Check className="h-4 w-4 text-white" />
                                </button>
                              </div>
                              
                              {/* Item content - clickable for details */}
                              <div 
                                className="flex-1 flex items-center min-w-0 cursor-pointer opacity-70"
                                onClick={() => showIngredientDetails(item)}
                              >
                                {/* Ingredient photo with emoji fallback */}
                                <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-lg mr-3 bg-gradient-to-br from-gray-100 to-white flex items-center justify-center shadow-sm relative">
                                  <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ 
                                    backgroundImage: `url(${getIngredientImageUrl(item.ingredient, item.customImage)})`,
                                  }}></div>
                                  <span className="text-3xl relative z-10 opacity-70" role="img" aria-label={item.ingredient}>
                                    {getIngredientEmoji(item.ingredient)}
                                  </span>
                                </div>
                                
                                {/* Ingredient details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                      <span className="text-gray-500 line-through font-medium truncate">
                                        {formatIngredientName(item.ingredient)}
                                      </span>
                                      
                                      {/* Price display - always shown */}
                                      {item.price && (
                                        <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full opacity-70">
                                          {item.price.toFixed(2)} zł
                                        </span>
                                      )}
                                      {!item.price && (
                                        <span className="ml-2 text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full opacity-70">
                                          {getPolishPrice(item.ingredient).toFixed(2)} zł
                                        </span>
                                      )}
                                    </div>
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
      
      {/* Item Details Dialog */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{detailItem ? formatIngredientName(detailItem.ingredient) : ''}</DialogTitle>
            <DialogDescription>
              {detailItem?.mealType && (
                <div className={`text-sm rounded-full px-2 py-0.5 inline-flex items-center ${getMealTypeBg(detailItem.mealType)} ${getMealTypeBorder(detailItem.mealType)} mt-2`}>
                  {getMealTypeEmoji(detailItem.mealType)} {detailItem.mealType}
                </div>
              )}
              {detailItem?.recipeName && (
                <div className="mt-1 text-sm text-gray-500">For: {detailItem.recipeName}</div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Ingredient image */}
            <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-100 relative mx-auto">
              <div className="absolute inset-0 bg-cover bg-center" style={{ 
                backgroundImage: detailItem ? `url(${getIngredientImageUrl(detailItem.ingredient, detailItem.customImage)})` : ''
              }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              <div className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md">
                <span className="text-3xl" role="img" aria-label={detailItem?.ingredient}>
                  {detailItem ? getIngredientEmoji(detailItem.ingredient) : '🍽️'}
                </span>
              </div>
              <Button 
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 rounded-full w-8 h-8 p-0 flex items-center justify-center shadow-md"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (detailItem) {
                    generateNewImage(detailItem);
                  }
                }}
                title="Generate new image"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              
              {/* Price tag - always shown */}
              {detailItem && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full shadow-md font-semibold flex items-center">
                  {detailItem.price ? (
                    <span>{detailItem.price.toFixed(2)} zł</span>
                  ) : (
                    <span>{getPolishPrice(detailItem.ingredient).toFixed(2)} zł</span>
                  )}
                  {detailItem.location && (
                    <span className="ml-1 text-xs bg-white text-green-800 rounded-full px-2 py-0.5">
                      {locationsData?.locations.find(loc => loc.id === detailItem.location)?.name || detailItem.location}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Quantity</div>
                <div className="text-lg font-medium">{detailItem?.quantity} {detailItem?.unit}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Category</div>
                <div className="text-lg font-medium capitalize">{detailItem?.category}</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Button
                className={`w-full ${detailItem?.isPurchased ? 'bg-gray-200 text-gray-700' : 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white'}`}
                onClick={() => {
                  if (detailItem) {
                    togglePurchaseMutation.mutate(detailItem.id);
                    setShowDetailModal(false);
                  }
                }}
              >
                {detailItem?.isPurchased ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Purchased
                  </>
                ) : (
                  'Mark as Purchased'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Recipe Details Dialog */}
      <Dialog open={showRecipeModal} onOpenChange={setShowRecipeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{selectedRecipe?.name}</DialogTitle>
            <DialogDescription>
              {selectedRecipe && (
                <div className="text-sm text-gray-500 mt-1">
                  {selectedRecipe.ingredients.length} ingredients
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            {/* Recipe image */}
            {selectedRecipe?.image && (
              <div className="w-full h-36 rounded-lg overflow-hidden bg-gray-100 relative">
                <img 
                  src={selectedRecipe.image} 
                  alt={selectedRecipe.name} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            )}
            
            {/* Ingredients list */}
            <div className="overflow-auto max-h-48">
              <h3 className="font-medium mb-2">Ingredients:</h3>
              <div className="divide-y divide-gray-100">
                {selectedRecipe?.ingredients.map(item => (
                  <div key={item.id} className="py-2 flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center mr-2">
                      <span className="text-lg">{getIngredientEmoji(item.ingredient)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{formatIngredientName(item.ingredient)}</div>
                      <div className="text-xs text-gray-500">{item.quantity} {item.unit}</div>
                    </div>
                    {item.isPurchased ? (
                      <span className="text-xs text-white bg-green-500 px-2 py-0.5 rounded-full">Purchased</span>
                    ) : (
                      <span className="text-xs text-white bg-blue-500 px-2 py-0.5 rounded-full">To Buy</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecipeModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Batch Actions Sheet */}
      <Sheet open={showBatchActionSheet} onOpenChange={setShowBatchActionSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-xl pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>Selected Items ({selectedItems.length})</SheetTitle>
          </SheetHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={resetSelection}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" /> Clear selection
              </Button>
              
              <div className="space-x-2">
                <Button
                  onClick={handleBatchMarkAsPurchased}
                  disabled={batchTogglePurchaseMutation.isPending}
                  className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white"
                >
                  {batchTogglePurchaseMutation.isPending ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Mark {selectedItems.length} items as purchased
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Preview of selected items */}
            <div className="mt-2 max-h-48 overflow-auto">
              <div className="grid grid-cols-4 gap-2">
                {displayedShoppingList && selectedItems.map(id => {
                  const item = displayedShoppingList.items.find(i => i.id === id);
                  if (!item) return null;
                  
                  return (
                    <div 
                      key={id} 
                      className="bg-gray-50 p-2 rounded-lg flex flex-col items-center justify-center text-center relative"
                    >
                      <span className="text-xl">{getIngredientEmoji(item.ingredient)}</span>
                      <span className="text-xs font-medium truncate max-w-full">{formatIngredientName(item.ingredient)}</span>
                      
                      {/* Price badge */}
                      {item.price && (
                        <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
                          {item.price.toFixed(2)} zł
                        </span>
                      )}
                      {!item.price && (
                        <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
                          {getPolishPrice(item.ingredient).toFixed(2)} zł
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* We've removed the Image Uploader Dialog in favor of automatic image generation */}
    </div>
  );
}