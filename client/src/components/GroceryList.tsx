import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GroceryItem {
  id: number;
  ingredient: string;
  quantity: number;
  unit: string;
  category: string;
  isPurchased: boolean;
}

interface GroceryListProps {
  mealPlanId: number;
  className?: string;
}

export function GroceryList({ mealPlanId, className = "" }: GroceryListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch grocery list
  const { data: groceryItems, isLoading } = useQuery<GroceryItem[]>({
    queryKey: ["/api/meal-plans", mealPlanId, "grocery-list"],
    queryFn: async () => {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/grocery-list`);
      if (!response.ok) {
        throw new Error("Failed to fetch grocery list");
      }
      return response.json();
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
        queryKey: ["/api/meal-plans", mealPlanId, "grocery-list"],
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

  if (isLoading) {
    return <div>Loading grocery list...</div>;
  }

  if (!groceryItems || groceryItems.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No items in your grocery list.</p>
        </div>
      </Card>
    );
  }

  // Group items by category
  const groupedItems = groceryItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-xl font-semibold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-4">
        Grocery List
      </h3>

      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-lg font-medium text-gray-700 mb-2 capitalize">
              {category}
            </h4>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${
                        item.isPurchased
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => togglePurchaseMutation.mutate(item.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <span
                      className={`${
                        item.isPurchased ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {item.ingredient}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
