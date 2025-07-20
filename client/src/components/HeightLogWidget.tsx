import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeightLogWidgetProps {
  currentHeight: number;
  onHeightUpdate: (height: number) => void;
}

export default function HeightLogWidget({ currentHeight, onHeightUpdate }: HeightLogWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [height, setHeight] = useState(currentHeight);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      setIsUpdating(true);
      console.log('Submitting height:', height);
      
      // Update height through API
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          height: height
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update height');
      }
      
      console.log('Height updated successfully');
      onHeightUpdate(height);
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Height updated successfully!",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to update height:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update height. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm text-gray-500">Current Height</h4>
        <p className="text-3xl font-bold text-blue-500">{currentHeight} cm</p>
      </div>

      <Button 
        variant="default" 
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
        onClick={() => {
          setHeight(currentHeight);
          setIsDialogOpen(true);
        }}
      >
        Update Height
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Height</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setHeight(prev => Math.min(250, Math.round(prev + 1)))}
                disabled={isUpdating}
              >
                <ChevronUp className="w-6 h-6" />
              </Button>
              <Input
                type="number"
                value={height}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setHeight(value);
                  }
                }}
                className="w-24 text-center text-xl font-medium"
                step="1"
                min="0"
                max="250"
                disabled={isUpdating}
              />
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setHeight(prev => Math.max(0, Math.round(prev - 1)))}
                disabled={isUpdating || height <= 0}
              >
                <ChevronDown className="w-6 h-6" />
              </Button>
            </div>
            <div className="text-sm text-gray-500">Height in centimeters</div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}