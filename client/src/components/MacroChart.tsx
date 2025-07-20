import { ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";

interface MacroChartProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieGoal: number;
}

export default function MacroChart({
  calories,
  protein,
  carbs,
  fat,
  calorieGoal,
}: MacroChartProps) {
  const macroData = [
    { name: "Protein", value: protein, color: "hsl(var(--chart-1))" },
    { name: "Carbs", value: carbs, color: "hsl(var(--chart-2))" },
    { name: "Fat", value: fat, color: "hsl(var(--chart-3))" },
  ];

  const calorieProgress = Math.min((calories / calorieGoal) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Calories</span>
          <span className="text-sm text-muted-foreground">
            {calories} / {calorieGoal} kcal
          </span>
        </div>
        <Progress value={calorieProgress} className="h-2" />
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={macroData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
            >
              {macroData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-medium">{protein}g</p>
          <p className="text-xs text-muted-foreground">Protein</p>
        </div>
        <div>
          <p className="text-sm font-medium">{carbs}g</p>
          <p className="text-xs text-muted-foreground">Carbs</p>
        </div>
        <div>
          <p className="text-sm font-medium">{fat}g</p>
          <p className="text-xs text-muted-foreground">Fat</p>
        </div>
      </div>
    </div>
  );
}
