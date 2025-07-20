import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useWeightLogs } from '@/hooks/use-weight-logs';
import { useToast } from "@/hooks/use-toast";

interface WeightLogWidgetProps {
  currentWeight: number;
  goalWeight: number;
  onWeightUpdate: (weight: number) => void;
}

export default function WeightLogWidget({ currentWeight, goalWeight, onWeightUpdate }: WeightLogWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [weight, setWeight] = useState(currentWeight);
  const { addWeightLog, isAddingWeight } = useWeightLogs();
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      console.log('Submitting weight:', weight);
      await addWeightLog({ weight: parseFloat(weight.toFixed(1)) });
      console.log('Weight updated successfully');
      onWeightUpdate(weight);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Weight updated successfully!",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to update weight:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update weight. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm text-gray-500">Current Weight</h4>
        <p className="text-3xl font-bold text-[#0CC5BA]">{currentWeight} kg</p>
      </div>

      <Button 
        variant="default" 
        className="w-full bg-[#0CC5BA] hover:bg-[#0CC5BA]/90 text-white font-medium"
        onClick={() => {
          setWeight(currentWeight);
          setIsDialogOpen(true);
        }}
      >
        Update Weight
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Weight</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setWeight(prev => parseFloat((prev + 0.1).toFixed(1)))}
                disabled={isAddingWeight}
              >
                <ChevronUp className="w-6 h-6" />
              </Button>
              <Input
                type="number"
                value={weight.toFixed(1)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setWeight(value);
                  }
                }}
                className="w-24 text-center text-xl font-medium"
                step="0.1"
                min="0"
                disabled={isAddingWeight}
              />
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setWeight(prev => parseFloat((Math.max(0, prev - 0.1)).toFixed(1)))}
                disabled={isAddingWeight || weight <= 0}
              >
                <ChevronDown className="w-6 h-6" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isAddingWeight}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isAddingWeight}
              className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90"
            >
              {isAddingWeight ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}