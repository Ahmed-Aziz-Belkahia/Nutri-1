import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFoodLog } from "../hooks/use-food-log";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FoodData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image: string | null;
  confidence?: number;
  isEstimate?: boolean;
  servingSize?: string;
  quantity?: number;
}

export default function FoodLogForm() {
  const { addFood } = useFoodLog();
  const { toast } = useToast();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FoodData>({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    image: null,
    quantity: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !user) return;
    setIsLoading(true);

    try {
      // Extract quantity from name if present
      const quantityMatch = formData.name.match(/^(\d+)\s+/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      const baseName = formData.name.replace(/^\d+\s+/, '').replace(/s$/, '');

      console.log("[Food Log] Adding food:", {
        ...formData,
        quantity,
        baseCalories: formData.calories,
      });

      // Always submit the base values (per single item)
      const response = await addFood({
        name: quantity > 1 ? `${quantity} ${baseName}s` : baseName,
        calories: formData.calories, // Base calories for one item
        protein: formData.protein,   // Base protein for one item
        carbs: formData.carbs,       // Base carbs for one item
        fat: formData.fat,           // Base fat for one item
        image: formData.image,
        quantity: quantity
      });

      // Reset form after successful submission
      setFormData({
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        image: null,
        quantity: 1
      });

      toast({
        title: "Success",
        description: "Your meal has been added to today's log.",
      });
    } catch (error) {
      console.error('Failed to add food:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log food. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    // If name starts with a number, assume it's quantity and update the form
    if (name === 'name' && value.match(/^\d+\s/)) {
      const quantity = parseInt(value.match(/^\d+/)![0]);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        quantity: quantity
      }));
    } else {
      // For other fields, store the base value (per single item)
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value,
      }));
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please log in to add meals to your food log.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formData.isEstimate && (
        <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These are estimated values. Feel free to adjust them for accuracy.
            {formData.confidence && formData.confidence < 0.8 && (
              <span className="block mt-1 text-sm">
                Low confidence detection ({Math.round(formData.confidence * 100)}%)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Food Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        {formData.servingSize && (
          <p className="text-sm text-gray-500 mt-1">
            Serving size: {formData.servingSize}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="calories">Calories (per item)</Label>
          <Input
            id="calories"
            name="calories"
            type="number"
            value={formData.calories || ''}
            onChange={handleChange}
            required
            min="0"
            step="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="protein">Protein (g) (per item)</Label>
          <Input
            id="protein"
            name="protein"
            type="number"
            value={formData.protein || ''}
            onChange={handleChange}
            required
            min="0"
            step="0.1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="carbs">Carbs (g) (per item)</Label>
          <Input
            id="carbs"
            name="carbs"
            type="number"
            value={formData.carbs || ''}
            onChange={handleChange}
            required
            min="0"
            step="0.1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fat">Fat (g) (per item)</Label>
          <Input
            id="fat"
            name="fat"
            type="number"
            value={formData.fat || ''}
            onChange={handleChange}
            required
            min="0"
            step="0.1"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Adding...
          </>
        ) : (
          "Add Food"
        )}
      </Button>
    </form>
  );
}