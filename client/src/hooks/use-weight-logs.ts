import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface WeightLog {
  id: number;
  userId: number;
  weight: string;
  notes?: string;
  loggedAt: string;
}

interface WeightLogResponse {
  log: WeightLog;
  preferences: {
    weight: string;
    goalWeight: string;
  };
}

export function useWeightLogs() {
  const queryClient = useQueryClient();

  const { data: weightLogs = [], isLoading } = useQuery<WeightLog[]>({
    queryKey: ["/api/weight-logs"],
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window/tab regains focus
    staleTime: 0, // Always consider data stale
  });

  const addWeightLog = useMutation({
    mutationFn: async (data: { weight: number; note?: string }) => {
      // Convert note to notes for the API
      const apiData = {
        weight: data.weight,
        notes: data.note
      };
      console.log('Sending weight log data:', apiData);
      const res = await fetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to add weight log:', errorText);
        throw new Error(errorText);
      }

      const responseData = await res.json();
      console.log('Weight log response:', responseData);
      return responseData as WeightLogResponse;
    },
    onSuccess: async (data) => {
      console.log('Weight log added successfully:', data);
      // Update both the weight logs and user profile
      await queryClient.invalidateQueries({ queryKey: ["/api/weight-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      console.error('Error adding weight log:', error);
    }
  });

  return {
    weightLogs: weightLogs.map(log => ({
      ...log,
      weight: parseFloat(log.weight) // Convert string weight to number for UI
    })),
    isLoading,
    addWeightLog: addWeightLog.mutateAsync,
    isAddingWeight: addWeightLog.isPending,
  };
}