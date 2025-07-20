import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ShoppingBag, 
  Check, 
  Coffee, 
  Utensils, 
  Apple, 
  Milk, 
  Package, 
  PlusCircle,
  Sandwich,
  ChevronRight 
} from 'lucide-react';
import { FaCarrot, FaAppleAlt, FaCheese, FaEgg, FaBreadSlice, FaFish, FaLeaf, FaSeedling } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define types for shopping list item
interface ShoppingItem {
  id: number;
  userId?: number;
  name?: string;
  ingredient?: string;
  quantity: string | number;
  unit?: string;
  category?: string;
  isChecked?: boolean;
  isPurchased?: boolean;
  mealType?: string;
  meal_type?: string;
  recipe_name?: string;
  recipeName?: string;
}

const PremiumShoppingList = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const today = new Date();
  const formattedDate = format(today, "yyyy-MM-dd");
  
  // Format date for display with day of week
  const displayDate = format(today, "EEEE, d MMMM yyyy");
  
  // Animation variants for list items
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };
  
  // Fetch shopping list data
  const { data: shoppingListData, isLoading } = useQuery<{ items: ShoppingItem[], groupedItems: Record<string, ShoppingItem[]> }>({
    queryKey: ["/api/shopping-list", formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list/${formattedDate}`);
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
  
  // Helper function to clean up quantity and unit display
  const cleanQuantity = (quantity: string | number, unit?: string): string => {
    if (!quantity) return '';
    
    // Convert to string if it's a number
    let quantityStr = typeof quantity === 'number' ? quantity.toString() : quantity;
    
    // Clean up common formatting issues
    quantityStr = quantityStr.replace(/,/g, '.').trim();
    
    // Add unit if present
    if (unit && unit.trim()) {
      return `${quantityStr} ${unit.trim()}`;
    }
    
    return quantityStr;
  };

  // Get ingredient icon based on name
  const getIngredientIcon = (ingredient: string) => {
    const lowerCaseName = (ingredient || '').toLowerCase();
    
    if (lowerCaseName.includes('cheese') || lowerCaseName.includes('ser')) return <FaCheese className="h-4 w-4 text-amber-400" />;
    if (lowerCaseName.includes('apple') || lowerCaseName.includes('jabłko')) return <FaAppleAlt className="h-4 w-4 text-red-500" />;
    if (lowerCaseName.includes('carrot') || lowerCaseName.includes('marchew')) return <FaCarrot className="h-4 w-4 text-orange-500" />;
    if (lowerCaseName.includes('rice') || lowerCaseName.includes('ryż') || lowerCaseName.includes('ryzu')) return <FaSeedling className="h-4 w-4 text-amber-100" />;
    if (lowerCaseName.includes('bread') || lowerCaseName.includes('chleb')) return <FaBreadSlice className="h-4 w-4 text-amber-700" />;
    if (lowerCaseName.includes('milk') || lowerCaseName.includes('mleko')) return <Milk className="h-4 w-4 text-blue-50" />;
    if (lowerCaseName.includes('fish') || lowerCaseName.includes('ryba')) return <FaFish className="h-4 w-4 text-blue-400" />;
    if (lowerCaseName.includes('egg') || lowerCaseName.includes('jajko')) return <FaEgg className="h-4 w-4 text-amber-50" />;
    
    // Default icon
    return <Package className="h-4 w-4 text-gray-400" />;
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
  
  // Calculate stats
  const totalItems = shoppingListData?.items.length || 0;
  const purchasedItems = shoppingListData?.items.filter(item => item.isChecked || item.isPurchased).length || 0;
  const completionPercentage = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;
  
  return (
    <div className="flex flex-col gap-4 pb-20 pt-2 relative">
      {/* Clean header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-100 p-2 inline-block rounded-full mb-2"
            >
              <ShoppingBag className="h-6 w-6 text-gray-700" />
            </motion.div>
            <h2 className="text-2xl font-semibold text-gray-900">Shopping List</h2>
            <p className="text-gray-600 text-sm mt-1">Weekly Shopping List</p>
          </div>
          <div className="text-right">
            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-xs mb-1">Progress</p>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-gray-700 text-xs mt-1">{purchasedItems}/{totalItems} items</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading your shopping list...</p>
        </div>
      ) : shoppingListData?.items.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center p-8 mt-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-md border border-white/40"
        >
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="bg-gradient-to-r from-teal-400/10 to-blue-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"
          >
            <ShoppingBag className="h-12 w-12 text-teal-400/60" />
          </motion.div>
          <motion.h3 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-2xl font-medium text-gray-700"
          >
            Your shopping list is empty
          </motion.h3>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="text-sm text-gray-500 mt-3 max-w-xs mx-auto leading-relaxed"
          >
            Items from your meal plan will appear here automatically. Create a meal plan to get started!
          </motion.p>
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-6"
          >
            <a 
              href="/meal-plans" 
              className="bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-medium inline-block transition-all shadow-md hover:shadow-lg"
            >
              Create Meal Plan
            </a>
          </motion.div>
        </motion.div>
      ) : (
        <div className="px-2">
          {/* List items with animations */}
          <AnimatePresence>
            <div className="space-y-4">
              {Object.entries(shoppingListData?.groupedItems || {})
                .map(([category, items], categoryIndex) => {
                  // Skip empty categories
                  if (items.length === 0) return null;
                  
                  // Sort items - unchecked first, then checked
                  const sortedItems = [...items].sort((a, b) => {
                    const aChecked = a.isChecked || a.isPurchased;
                    const bChecked = b.isChecked || b.isPurchased;
                    
                    if (aChecked && !bChecked) return 1;
                    if (!aChecked && bChecked) return -1;
                    
                    // Then sort alphabetically
                    const aName = (a.name || a.ingredient || '').toLowerCase();
                    const bName = (b.name || b.ingredient || '').toLowerCase();
                    return aName.localeCompare(bName);
                  });
                  
                  return (
                    <motion.div 
                      key={category}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: categoryIndex * 0.1 }}
                    >
                      <div>
                        {sortedItems.map((item, index) => {
                          const itemName = (item.name || item.ingredient || '').trim();
                          const isChecked = item.isChecked || item.isPurchased;
                          
                          // Clean up quantity string
                          const formattedQuantity = cleanQuantity(item.quantity, item.unit);
                          
                          return (
                            <motion.div 
                              key={item.id}
                              custom={index}
                              initial="hidden"
                              animate="visible"
                              variants={itemVariants}
                              className={`flex items-center mb-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm
                                ${isChecked 
                                  ? 'opacity-80' 
                                  : 'opacity-100'
                                }`}
                            >
                              {/* Clean checkbox circle */}
                              <motion.div 
                                whileTap={{ scale: 0.9 }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 mr-4 flex-shrink-0
                                  ${isChecked 
                                    ? 'bg-green-500 text-white' 
                                    : 'border-2 border-gray-300 hover:border-gray-400 bg-white'
                                  }`}
                                onClick={() => toggleItemChecked(item)}
                              >
                                <AnimatePresence mode="wait">
                                  {isChecked && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Check className="h-3 w-3" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                              
                              {/* Content with icon */}
                              <div className="flex-1 min-w-0 flex justify-between items-center">
                                <div className="flex items-center min-w-0">
                                  <span className="mr-3 flex-shrink-0">
                                    {getIngredientIcon(itemName)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className={`text-base font-medium 
                                      ${isChecked 
                                        ? 'line-through text-gray-400' 
                                        : 'text-gray-800'
                                      }`}
                                    >
                                      {itemName}
                                    </h4>
                                    
                                    {/* Recipe info */}
                                    {(item.recipe_name || item.recipeName) && (
                                      <div className={`flex items-center mt-1 text-sm 
                                        ${isChecked ? 'text-gray-400' : 'text-gray-500'}`}
                                      >
                                        {(item.mealType || item.meal_type) && (
                                          <span className="mr-1 text-gray-400">
                                            {getMealTypeIcon(item.mealType || item.meal_type || '')}
                                          </span>
                                        )}
                                        <span className="truncate">
                                          {item.recipe_name || item.recipeName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Quantity badge */}
                                <span className={`ml-3 px-3 py-1 text-sm font-medium rounded-full transition-all duration-300 flex-shrink-0
                                  ${isChecked 
                                    ? 'bg-gray-100 text-gray-400' 
                                    : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {formattedQuantity}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                }).filter(Boolean)}
            </div>
          </AnimatePresence>
        </div>
      )}
      
      {/* Add item form - fixed at bottom with glassmorphism */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-md border-t border-gray-100 p-4 shadow-lg z-20"
      >
        <div className="flex gap-2 items-center max-w-md mx-auto">
          <Input 
            placeholder="Add new item..."
            className="flex-1 text-sm rounded-full border-gray-200 bg-white/80 backdrop-blur-sm focus:border-teal-400 focus:ring-teal-300/30 shadow-sm"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500 rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-md"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumShoppingList;