import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import FoodDetailView from "@/components/FoodDetailView";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

interface FoodResponse {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  date: string;
}

export default function FoodDetail() {
  const [location] = useLocation();
  const foodId = location.split("/").pop();

  const { data: food, isLoading, error } = useQuery<FoodResponse>({
    queryKey: [`/api/food-logs/${foodId}`],
    enabled: !!foodId,
  });

  // Pull-to-refresh functionality
  const handleRefresh = usePullToRefresh([`/api/food-logs/${foodId}`]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !food) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>Failed to load food details</p>
      </div>
    );
  }

  return <FoodDetailView food={food} />;
}