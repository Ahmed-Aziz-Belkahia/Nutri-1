import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from 'date-fns/locale';
import { useTranslation } from "react-i18next";
import { 
  ShoppingBag,
  Check,
  PlusCircle,
  Apple, 
  Sandwich, // Using Sandwich instead of Bread
  Milk,
  Coffee,
  Package,
  Utensils,
  ChevronRight,
  CalendarDays,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

type ShoppingItem = {
  id: number;
  name: string;        // This is the ingredient name in our database
  ingredient?: string; // For backward compatibility
  quantity: string;
  unit?: string;
  isChecked: boolean;  // In our database it's isChecked, not isPurchased
  isPurchased?: boolean; // For backward compatibility
  meal_type?: string;  // In database we use snake_case
  mealType?: string;   // For backward compatibility
  recipe_name?: string;
  recipeName?: string; // For backward compatibility
  recipe_image?: string;
  recipeImage?: string; // For backward compatibility
  category?: string;
  price?: number;
};

// Helper function to clean quantity format
const cleanQuantity = (quantity: string, unit?: string): string => {
  // Remove duplicate words and extra spaces
  const clean = quantity.trim();
  
  // Handle units appropriately
  if (unit && unit !== 'unit') {
    // Remove unit from quantity if it's already there to prevent duplication
    const unitRegex = new RegExp(`\\b${unit}\\b`, 'gi');
    const cleanedQuantity = clean.replace(unitRegex, '').trim();
    return `${cleanedQuantity} ${unit}`;
  }
  
  return clean;
};

const EmbeddedShoppingList = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const today = new Date();
  const formattedDate = format(today, "yyyy-MM-dd");
  
  // Format date for display based on language
  const displayDate = i18n.language === 'pl'
    ? format(today, "d MMMM yyyy", { locale: pl })
    : format(today, "MMMM d, yyyy");
  
  // Fetch shopping list data - use weekly view for better consolidation
  const { data: shoppingListData, isLoading } = useQuery<{ items: ShoppingItem[], groupedItems: Record<string, ShoppingItem[]> }>({
    queryKey: ["/api/shopping-list", formattedDate, "week"],
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list/${formattedDate}?type=week`);
      if (!response.ok) {
        throw new Error("Failed to fetch shopping list");
      }
      // Ensure we always have default structures even if API returns empty
      const data = await response.json();
      return {
        items: data.items || [],
        groupedItems: data.groupedItems || {}
      };
    },
  });
  
  // Function to toggle item checked status with optimistic updates
  const toggleItemChecked = async (item: ShoppingItem) => {
    // Get the current data
    const currentData = queryClient.getQueryData<{ 
      items: ShoppingItem[], 
      groupedItems: Record<string, ShoppingItem[]> 
    }>(["/api/shopping-list", formattedDate]);
    
    if (!currentData) return;
    
    // Create updated data with the item status toggled
    const updatedItems = currentData.items.map(i => {
      if (i.id === item.id) {
        // Toggle the checked status
        return {
          ...i,
          isChecked: !(i.isChecked || i.isPurchased),
          isPurchased: !(i.isChecked || i.isPurchased)
        };
      }
      return i;
    });
    
    // Create updated grouped items
    const updatedGroupedItems: Record<string, ShoppingItem[]> = {};
    Object.keys(currentData.groupedItems).forEach(category => {
      updatedGroupedItems[category] = currentData.groupedItems[category].map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            isChecked: !(i.isChecked || i.isPurchased),
            isPurchased: !(i.isChecked || i.isPurchased)
          };
        }
        return i;
      });
    });
    
    // Update the query cache immediately with optimistic data
    queryClient.setQueryData(["/api/shopping-list", formattedDate], {
      ...currentData,
      items: updatedItems,
      groupedItems: updatedGroupedItems
    });
    
    try {
      // Make the actual API call
      await fetch(`/api/shopping-list-items/${item.id}/toggle`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error toggling item:", error);
      
      // If there's an error, revert to the original data
      queryClient.setQueryData(["/api/shopping-list", formattedDate], currentData);
      
      // Then refetch to make sure we have the correct data
      queryClient.invalidateQueries({
        queryKey: ["/api/shopping-list", formattedDate],
      });
    }
  };
  
  // Get category icon based on category name
  const getCategoryIcon = (category: string) => {
    // Map categories to appropriate icons
    if (category.toLowerCase() === 'produce') return <Apple className="h-4 w-4" />;
    if (category.toLowerCase() === 'meat') return <Utensils className="h-4 w-4" />;
    if (category.toLowerCase() === 'dairy') return <Milk className="h-4 w-4" />;
    if (category.toLowerCase() === 'bakery') return <Sandwich className="h-4 w-4" />;
    if (category.toLowerCase() === 'beverages') return <Coffee className="h-4 w-4" />;
    if (category.toLowerCase() === 'condiments') return <Utensils className="h-4 w-4" />;
    if (category.toLowerCase() === 'spices') return <Utensils className="h-4 w-4" />;
    
    // Default icon for other categories
    return <Package className="h-4 w-4" />;
  };
  
  // Get meal type icon
  const getMealTypeIcon = (mealType: string) => {
    if (!mealType) return null;
    
    const lowerCaseType = mealType.toLowerCase();
    
    if (lowerCaseType.includes('breakfast')) {
      return <Coffee className="h-3 w-3" />;
    }
    
    if (lowerCaseType.includes('lunch')) {
      return <Utensils className="h-3 w-3" />;
    }
    
    if (lowerCaseType.includes('dinner')) {
      return <Utensils className="h-3 w-3" />;
    }
    
    return null;
  };
  
  // Calculate stats
  const totalItems = shoppingListData?.items.length || 0;
  const purchasedItems = shoppingListData?.items.filter(item => item.isChecked || item.isPurchased).length || 0;
  const completionPercentage = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;
  
  // Function to add a new item to the shopping list
  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!newItemName.trim()) {
        toast({
          title: "Please enter an item name",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/shopping-list-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: newItemQuantity || "1",
          date: formattedDate,
          category: "other" // Default category
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add item");
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear input
      setNewItemName("");
      setNewItemQuantity("1");
      
      // Show success message
      toast({
        title: "Item added successfully",
        description: `${newItemName} has been added to your shopping list.`,
      });
      
      // Refresh shopping list data
      queryClient.invalidateQueries({
        queryKey: ["/api/shopping-list", formattedDate],
      });
    },
    onError: (error) => {
      console.error("Error adding item:", error);
      toast({
        title: "Failed to add item",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItemMutation.mutate();
  };
  
  // Filter items based on active tab
  const filterItemsByTab = (items: ShoppingItem[]) => {
    if (activeTab === "all") return items;
    if (activeTab === "tobuy") return items.filter(item => !(item.isChecked || item.isPurchased));
    if (activeTab === "purchased") return items.filter(item => (item.isChecked || item.isPurchased));
    return items;
  };
  
  return (
    <div className="flex flex-col gap-4 pt-2 w-full">
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0CC5BA] border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading your shopping list...</p>
        </div>
      ) : shoppingListData?.items.length === 0 ? (
        <div className="text-center p-8 mt-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('shoppingList.emptyList', 'Your shopping list is empty')}</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            {t('shoppingList.emptyListDescription', 'Items from your meal plan will appear here automatically. Create a meal plan to get started!')}
          </p>
          <div className="mt-4">
            <a 
              href="/meal-planning-quiz" 
              className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-blue-500 hover:to-[#0CC5BA] text-white px-4 py-2 rounded-lg text-sm font-medium inline-block transition-all shadow-md hover:shadow-lg"
            >
              {t('shoppingList.createMealPlan', 'Create Meal Plan')}
            </a>
          </div>
        </div>
      ) : (
        <div className="w-full px-0">
          {/* Shopping List Tabs */}
          <div className="mb-4">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 bg-gray-100 rounded-xl p-1">
                <TabsTrigger 
                  value="all" 
                  className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {t('shoppingList.allItems', 'Wszystkie produkty')}
                </TabsTrigger>
                <TabsTrigger 
                  value="tobuy" 
                  className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {t('shoppingList.toBuy', 'Do kupienia')}
                </TabsTrigger>
                <TabsTrigger 
                  value="purchased" 
                  className="text-xs py-2 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {t('shoppingList.purchased', 'Zakupione')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                {renderShoppingList(shoppingListData?.groupedItems || {}, "all")}
              </TabsContent>
              
              <TabsContent value="tobuy" className="mt-4">
                {renderShoppingList(shoppingListData?.groupedItems || {}, "tobuy")}
              </TabsContent>
              
              <TabsContent value="purchased" className="mt-4">
                {renderShoppingList(shoppingListData?.groupedItems || {}, "purchased")}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      
      {/* Add item form - sticky at bottom with reduced gap */}
      <div className="sticky bottom-0 w-full bg-white border-t border-gray-100 p-3 shadow-lg mt-0">
        <form onSubmit={handleAddItem} className="flex gap-2 items-center w-full">
          <div className="flex gap-2 flex-1">
            <Input 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={t('shoppingList.addNewItem', 'Dodaj nowy produkt...')}
              className="flex-1 text-sm rounded-full border-gray-200 focus:border-[#0CC5BA] focus:ring-[#0CC5BA]/30 shadow-sm bg-white"
              autoComplete="off"
            />
            <Input 
              type="text"
              inputMode="numeric"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              placeholder={t('shoppingList.quantity', 'Qty.')}
              className="w-16 text-sm rounded-full border-gray-200 focus:border-[#0CC5BA] focus:ring-[#0CC5BA]/30 shadow-sm text-center bg-white"
              autoComplete="off"
            />
          </div>
          <Button 
            type="submit" 
            size="sm" 
            disabled={addItemMutation.isPending || !newItemName.trim()}
            className="bg-[#0CC5BA] hover:bg-[#0CBACC] disabled:bg-gray-200 rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-md">
            {addItemMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlusCircle className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
  
  // Helper function to render shopping list based on active tab
  function renderShoppingList(groupedItems: Record<string, ShoppingItem[]>, tabFilter: string) {
    const emptyTobuyMessage = (
      <div className="text-center py-10 px-4">
        <div className="bg-gradient-to-r from-green-400/10 to-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Check className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-1">{t('shoppingList.everythingPurchased', 'Everything purchased!')}</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
          {t('shoppingList.completedList', 'Great job! You\'ve completed your entire shopping list.')}
        </p>
      </div>
    );

    const emptyPurchasedMessage = (
      <div className="text-center py-10 px-4">
        <div className="bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CBACC]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <ShoppingBag className="h-10 w-10 text-[#0CC5BA]" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-1">{t('shoppingList.nothingPurchased', 'Nothing purchased yet')}</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
          {t('shoppingList.purchaseMessage', 'Items you check off will appear in this tab. Check items from your list as you shop!')}
        </p>
      </div>
    );

    // Get priority order for categories
    const priorityOrder: Record<string, number> = {
      'produce': 1,
      'meat': 2,
      'dairy': 3,
      'bakery': 4,
      'frozen': 5,
      'beverages': 6,
      'canned': 7,
      'drygoods': 8,
      'pantry': 9,
      'condiments': 10,
      'spices': 11,
      'other': 12,
    };

    // Check if we have any filtered items for the tab
    let hasFilteredItems = false;
    if (tabFilter === "tobuy") {
      hasFilteredItems = Object.values(groupedItems).some(
        items => items.some(item => !(item.isChecked || item.isPurchased))
      );
      if (!hasFilteredItems) return emptyTobuyMessage;
    } else if (tabFilter === "purchased") {
      hasFilteredItems = Object.values(groupedItems).some(
        items => items.some(item => (item.isChecked || item.isPurchased))
      );
      if (!hasFilteredItems) return emptyPurchasedMessage;
    }

    return (
      <div className="flex flex-col gap-3 pb-8 px-0">
        {/* Flatten all items from all categories into a single list */}
        {(() => {
          // Get all items across all categories
          const allItems = Object.values(groupedItems).flat();
          
          // Filter items based on tab selection
          let filteredItems = allItems;
          if (tabFilter === "tobuy") {
            filteredItems = allItems.filter(item => !(item.isChecked || item.isPurchased));
          } else if (tabFilter === "purchased") {
            filteredItems = allItems.filter(item => (item.isChecked || item.isPurchased));
          }
          
          // Sort items - to buy first, then purchased for "all" tab, then alphabetically
          const sortedItems = [...filteredItems].sort((a, b) => {
            const aChecked = a.isChecked || a.isPurchased;
            const bChecked = b.isChecked || b.isPurchased;
            
            // If we're in "all" tab, sort by checked status
            if (tabFilter === "all") {
              if (aChecked && !bChecked) return 1;
              if (!aChecked && bChecked) return -1;
            }
            
            // Then sort alphabetically
            const aName = (a.name || a.ingredient || '').toLowerCase();
            const bName = (b.name || b.ingredient || '').toLowerCase();
            return aName.localeCompare(bName);
          });
          
          // Return individual cards for each item
          return sortedItems.map(item => {
            const itemName = (item.name || item.ingredient || '').trim();
            const isChecked = item.isChecked || item.isPurchased;
            const formattedQuantity = cleanQuantity(item.quantity, item.unit);
            
            return (
              <div 
                key={item.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all duration-300 w-full
                  ${isChecked 
                    ? 'opacity-80 border-gray-200' 
                    : 'hover:shadow-md border-gray-200'
                  }`}
              >
                <div className="p-3.5 relative bg-white">
                  <div className="flex justify-between items-start flex-wrap">
                    {/* Left side with checkbox and content */}
                    <div className="flex flex-1 min-w-0 mr-3">
                      {/* Checkbox circle */}
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 cursor-pointer transition-all duration-200 shadow-sm
                          ${isChecked 
                            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' 
                            : 'bg-gray-50 border-2 border-gray-300 hover:border-[#0CC5BA] hover:scale-105'
                          }`}
                        onClick={() => toggleItemChecked(item)}
                      >
                        {isChecked && <Check className="h-4 w-4" />}
                      </div>
                      
                      {/* Item content */}
                      <div className="flex-1 min-w-0">
                        {/* Ingredient name */}
                        <h4 className={`text-base font-semibold capitalize break-words transition-all duration-200
                          ${isChecked 
                            ? 'line-through text-gray-400' 
                            : 'text-gray-800'
                          }`}
                        >
                          {itemName}
                        </h4>
                        
                        {/* Recipe name */}
                        {(item.recipe_name || item.recipeName) && (
                          <div className="mt-1.5">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs gap-1
                              ${isChecked 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-[#0CC5BA]/10 text-[#0CC5BA]'
                              }`}>
                              <Utensils className="h-3 w-3 mr-0.5" />
                              <span className="block overflow-hidden max-w-[160px] truncate">
                                {item.recipe_name || item.recipeName}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity badge */}
                    <div>
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap shadow-sm
                        ${isChecked 
                          ? 'bg-gray-100 text-gray-400' 
                          : 'bg-white border border-[#0CC5BA]/20 text-gray-700'
                        }`}
                      >
                        {formattedQuantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    );
  }
};

export default EmbeddedShoppingList;