import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface NutritionGoal {
  current: number;
  target: number;
  name: string;
  unit: string;
  icon: string;
}

interface NutritionGoalsCardProps {
  goals: NutritionGoal[];
}

export default function NutritionGoalsCard({ goals }: NutritionGoalsCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎯</span>
        <h2 className="font-medium">Nutrition Goals</h2>
      </div>

      <div className="space-y-4">
        {goals.map((goal, index) => {
          const percentage = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          const isOverTarget = goal.current > goal.target;

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goal.icon}</span>
                  <span className="text-sm text-gray-600">{goal.name}</span>
                </div>
                <div className="flex items-baseline gap-1 min-w-[100px] justify-end">
                  <span className={`text-base font-medium tabular-nums ${isOverTarget ? 'text-red-500' : 'text-gray-900'}`}>
                    {goal.current.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    / {goal.target.toLocaleString()} {goal.unit}
                  </span>
                </div>
              </div>
              <Progress 
                value={percentage} 
                className={cn(
                  "h-2",
                  isOverTarget ? "bg-red-100 [&>[data-progress]]:bg-red-500" : ""
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}