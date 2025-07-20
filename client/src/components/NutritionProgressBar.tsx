import { Progress } from "@/components/ui/progress";
import { useNutrition } from "../hooks/use-nutrition";
import { Skeleton } from "@/components/ui/skeleton";

interface NutritionProgressBarProps {
  nutrientType: 'calories' | 'protein' | 'carbs' | 'fat';
  label: string;
  unit?: string;
}

export default function NutritionProgressBar({
  nutrientType,
  label,
  unit = "g"
}: NutritionProgressBarProps) {
  const { data: nutrition, isLoading } = useNutrition();

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (!nutrition) {
    return null;
  }

  const { current, goal } = nutrition[nutrientType];
  const progress = Math.min((current / goal) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-xs text-gray-500">
          {current}/{goal} {unit}
        </span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}