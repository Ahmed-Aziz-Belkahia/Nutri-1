import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SelectFoodLog } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useUserProfile } from "@/hooks/use-user-profile";
import { format } from "date-fns";
import { sendAndroidNutritionState } from "@/lib/androidBridge";

interface FoodLogResponse {
  log: SelectFoodLog;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface FoodLogsResponse {
  logs: SelectFoodLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface FoodComponent {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  quantity?: number;
  details?: Record<string, any>;
}

interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string | null;
  components?: FoodComponent[];
  confidence?: number;
  isEstimate?: boolean;
  servingSize?: string;
  quantity?: number;
}

export function useFoodLog(selectedDate: Date = new Date()) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const { data: userProfile } = useUserProfile();

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const { data: foodLogData, isLoading: isLoadingLogs } = useQuery<FoodLogsResponse>({
    queryKey: ["/api/food-logs", dateString],
    queryFn: async () => {
      console.log('[Food Log Hook] Fetching logs for date:', dateString);
      const response = await fetch(`/api/food-logs?date=${dateString}`, {
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Food Log Hook] Error fetching logs:', response.status, errorText);
        throw new Error(`Failed to fetch food logs: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Food Log Hook] Received food logs:', {
        logsCount: data.logs?.length,
        totals: data.totals,
        firstLogComponents: data.logs[0]?.components
      });
      return data;
    },
    enabled: !!user,
    refetchOnMount: true, // Refetch to ensure we have latest data
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    staleTime: 10000, // Consider data fresh for 10 seconds (reduced from 60s)
    gcTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const addFoodMutation = useMutation<FoodLogResponse, Error, FoodAnalysis>({
    mutationFn: async (food) => {
      console.log('[Food Log Hook] Adding food with data:', {
        name: food.name,
        calories: food.calories,
        componentsCount: food.components?.length,
        isAnalyzing: (food as any).isAnalyzing,
        components: food.components
      });

      const payload = {
        ...food,
        date: selectedDate.toISOString(),
        isAnalyzing: (food as any).isAnalyzing, // Explicitly include the isAnalyzing flag
        components: food.components?.map((comp: FoodComponent) => ({
          ...comp,
          details: comp.details ? (typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details) : undefined
        }))
      };

      const res = await fetch("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Food Log Hook] Error adding food:', res.status, errorText);
        throw new Error(`Failed to add food log: ${errorText}`);
      }

      const data = await res.json();
      console.log('[Food Log Hook] Successfully added food:', {
        logId: data.log.id,
        components: data.log.components
      });
      return data;
    },
    onSuccess: async (data) => {
      console.log('[Food Log Hook] Mutation succeeded');

      toast({
        title: "Success",
        description: "Food log added successfully!",
      });

      // First update the cache with new log data
      const updatedCacheData = queryClient.setQueryData<FoodLogsResponse>(
        ["/api/food-logs", dateString],
        (oldData) => {
          console.log('[Food Log Hook] Cache BEFORE update:', {
            hadOldData: !!oldData,
            oldLogsCount: oldData?.logs?.length || 0,
            oldLogIds: oldData?.logs?.map(l => l.id) || []
          });
          
          const newLogsArray = oldData ? [data.log, ...oldData.logs] : [data.log];
          
          console.log('[Food Log Hook] Cache AFTER update:', {
            logsCount: newLogsArray.length,
            logIds: newLogsArray.map(l => l.id),
            totals: data.totals,
            newLogId: data.log.id,
            newLogComponents: data.log.components
          });

          return {
            logs: newLogsArray,
            totals: data.totals
          };
        }
      );

      // Then send real-time nutrition state to Android WebView app
      if (user) {
        try {
          console.log('[Food Log Hook] Sending nutrition state to Android');
          
          // Get streak count from user data
          const streakCount = user.currentStreak || 0;
          
          // Get the updated logs count from cache
          const logsCount = updatedCacheData?.logs.length || 1;
          
          // Create a daily logs object with the updated totals
          const dailyLogs = {
            logs: updatedCacheData?.logs || [data.log],
            totals: data.totals,
            mealCount: logsCount
          };
          
          // Send the nutrition state update to Android
          const result = sendAndroidNutritionState(
            user,
            userProfile,
            dailyLogs,
            streakCount
          );
          
          console.log('[Food Log Hook] Android nutrition state update result:', result);
        } catch (error) {
          console.error('[Food Log Hook] Error sending nutrition state to Android:', error);
          // Don't fail the overall operation if Android bridge fails
        }
      }
    },
    onError: (err) => {
      console.error('[Food Log Hook] Error adding food:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add food log. Please try again.",
      });
    }
  });

  const updateFoodMutation = useMutation<FoodLogResponse, Error, { id: number; food: FoodAnalysis }>({
    mutationFn: async ({ id, food }) => {
      console.log('[Food Log Hook] Updating food with ID:', id, 'Data:', {
        name: food.name,
        calories: food.calories,
        componentsCount: food.components?.length
      });

      const payload = {
        ...food,
        components: food.components?.map((comp: FoodComponent) => ({
          ...comp,
          details: comp.details ? (typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details) : undefined
        }))
      };

      const res = await fetch(`/api/food-logs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Food Log Hook] Error updating food:', res.status, errorText);
        throw new Error(`Failed to update food log: ${errorText}`);
      }

      const data = await res.json();
      console.log('[Food Log Hook] Successfully updated food:', {
        logId: data.log.id,
        components: data.log.components
      });
      return data;
    },
    onSuccess: (data) => {
      console.log('[Food Log Hook] Update mutation succeeded');

      // Update the cache with the updated log data
      queryClient.setQueryData<FoodLogsResponse>(
        ["/api/food-logs", dateString],
        (oldData) => {
          if (!oldData) return oldData;
          
          const updatedLogs = oldData.logs.map(log => 
            log.id === data.log.id ? data.log : log
          );
          
          console.log('[Food Log Hook] Updated cache after meal update:', {
            logsCount: updatedLogs.length,
            totals: data.totals,
            updatedLogComponents: data.log.components
          });

          return {
            logs: updatedLogs,
            totals: data.totals
          };
        }
      );
    },
    onError: (err) => {
      console.error('[Food Log Hook] Error updating food:', err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update food log. Please try again.",
      });
    }
  });

  // Simple water intake mutation
  const addWater = async (amount: number) => {
    const res = await fetch("/api/water-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to add water log");
    }
    // Optionally refetch food logs to reflect any totals if needed
    queryClient.invalidateQueries({ queryKey: ["/api/food-logs", dateString] });
    return res.json();
  };

  return {
    foodLogs: foodLogData?.logs || [],
    todayTotals: foodLogData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    isLoadingLogs,
    addFood: addFoodMutation.mutateAsync,
    logFood: addFoodMutation.mutateAsync, // Alias for addFood to match component expectations
    updateFood: (id: number, food: FoodAnalysis) => updateFoodMutation.mutateAsync({ id, food }),
  addWater,
  };
}