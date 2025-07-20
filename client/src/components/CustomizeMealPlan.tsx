import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Loader2, Utensils, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  recipe: {
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

interface MealPlan {
  id: number;
  date: string;
  totalCalories: number;
  status: string;
  meals: Meal[];
}

interface CustomizeMealPlanProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: MealPlan | null;
}

export default function CustomizeMealPlan({ isOpen, onClose, currentPlan }: CustomizeMealPlanProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(currentPlan ? parseISO(currentPlan.date) : new Date());
  const [isReplacing, setIsReplacing] = useState(false);

  const replaceMealPlanMutation = useMutation({
    mutationFn: async () => {
      // Request a new meal plan for the selected date
      const response = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetDate: format(selectedDate, "yyyy-MM-dd"),
          replaceExisting: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to replace meal plan: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your meal plan has been updated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/all"] });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to replace meal plan",
      });
    },
  });

  const handleReplaceMealPlan = () => {
    setIsReplacing(true);
    replaceMealPlanMutation.mutate();
  };

  const handleCreateNewPlan = () => {
    onClose();
    setLocation("/meal-planning-quiz");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Customize Meal Plan</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div>
            <h3 className="font-medium mb-2">Select Date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </div>

          {currentPlan && (
            <div>
              <h3 className="font-medium mb-2">Current Plan ({format(parseISO(currentPlan.date), "MMMM d, yyyy")})</h3>
              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-2">Total: {currentPlan.totalCalories} calories</p>
                <div className="space-y-2">
                  {currentPlan.meals.map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-[#0CC5BA]" />
                        <div>
                          <p className="text-sm font-medium">{meal.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{meal.mealType}</p>
                        </div>
                      </div>
                      <span className="text-xs">{meal.recipe.nutritionInfo.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline" 
              className="text-[#0CC5BA] border-[#0CC5BA]/20"
              onClick={handleCreateNewPlan}
            >
              New Preferences
            </Button>
            <Button
              className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90"
              onClick={handleReplaceMealPlan}
              disabled={replaceMealPlanMutation.isPending}
            >
              {replaceMealPlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Replace Plan
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}