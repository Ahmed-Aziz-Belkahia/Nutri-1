import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus } from "lucide-react";
import { useFoodLog } from "../hooks/use-food-log";
import { useState } from "react";

interface WaterTrackerProps {
  waterAmount: number;
  targetAmount: number;
}

export default function WaterTracker({
  waterAmount,
  targetAmount,
}: WaterTrackerProps) {
  const { addWater } = useFoodLog();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddWater = async (amount: number) => {
    setIsLoading(true);
    try {
      await addWater(amount);
    } catch (error) {
      console.error("Failed to add water:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = Math.min((waterAmount / targetAmount) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Water Intake</span>
        <span className="text-sm text-muted-foreground">
          {waterAmount} / {targetAmount} ml
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleAddWater(250)}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-2xl font-bold">{waterAmount}</p>
          <p className="text-sm text-muted-foreground">milliliters</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleAddWater(-250)}
          disabled={isLoading || waterAmount <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
