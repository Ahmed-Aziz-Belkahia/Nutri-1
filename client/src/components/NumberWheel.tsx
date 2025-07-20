import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NumberWheelProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
}

export function NumberWheel({ value, onChange, min, max, unit = "cm" }: NumberWheelProps) {
  // Ensure the value is within the allowed range
  const normalizedValue = Math.max(min, Math.min(max, value));
  
  // Create a local state to track the displayed value
  const [displayedValue, setDisplayedValue] = useState<number>(normalizedValue);
  const [inputValue, setInputValue] = useState<string>(normalizedValue.toString());

  // Update local state when prop changes
  useEffect(() => {
    setDisplayedValue(normalizedValue);
    setInputValue(normalizedValue.toString());
  }, [normalizedValue]);

  // Handler for increment/decrement buttons
  const adjustValue = (adjustment: number) => {
    const newValue = Math.max(min, Math.min(max, displayedValue + adjustment));
    setDisplayedValue(newValue);
    setInputValue(newValue.toString());
    onChange(newValue);
  };

  // Handle direct input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);
    
    // Only update the actual value and call onChange if it's a valid number
    const numericValue = parseFloat(newInputValue);
    if (!isNaN(numericValue)) {
      const boundedValue = Math.max(min, Math.min(max, numericValue));
      setDisplayedValue(boundedValue);
    }
  };

  // Handle blur to validate and normalize the input
  const handleInputBlur = () => {
    const numericValue = parseFloat(inputValue);
    
    if (isNaN(numericValue)) {
      // Revert to the last valid value if input is not a number
      setInputValue(displayedValue.toString());
    } else {
      // Ensure the value is within bounds
      const boundedValue = Math.max(min, Math.min(max, numericValue));
      setDisplayedValue(boundedValue);
      setInputValue(boundedValue.toString());
      onChange(boundedValue);
    }
  };

  // Handle keyboard input submission
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="w-full max-w-[240px] mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Main number display */}
          <motion.div 
            className="text-center"
            animate={{ scale: [0.98, 1], opacity: [0.9, 1] }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-[#0CC5BA] via-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              {displayedValue}{unit}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {unit === 'kg' ? 'Current Weight' : 'Current Height'}
            </div>
          </motion.div>
          
          {/* Control buttons */}
          <div className="flex items-center gap-2">
            {/* Decrement button */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 border-gray-200 hover:bg-gray-50"
              onClick={() => adjustValue(-1)}
              disabled={displayedValue <= min}
            >
              <ChevronDown className="h-6 w-6 text-gray-600" />
            </Button>
            
            {/* Input field */}
            <div className="flex-1 relative">
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="h-12 text-center text-xl font-medium"
                aria-label={unit === 'kg' ? 'Weight value' : 'Height value'}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {unit}
              </div>
            </div>
            
            {/* Increment button */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 border-gray-200 hover:bg-gray-50"
              onClick={() => adjustValue(1)}
              disabled={displayedValue >= max}
            >
              <ChevronUp className="h-6 w-6 text-gray-600" />
            </Button>
          </div>
          
          {/* Quick value buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {unit === 'kg' ? 
              // Weight presets
              [60, 70, 80, 90].map(preset => (
                <Button 
                  key={preset}
                  variant={displayedValue === preset ? "default" : "outline"}
                  size="sm"
                  className={`px-3 py-1 h-8 ${
                    displayedValue === preset 
                      ? 'bg-[#0CC5BA] hover:bg-[#0CC5BA]/90' 
                      : 'border-gray-200 text-gray-700'
                  }`}
                  onClick={() => {
                    setDisplayedValue(preset);
                    setInputValue(preset.toString());
                    onChange(preset);
                  }}
                >
                  {preset}kg
                </Button>
              ))
              :
              // Height presets
              [160, 170, 180, 190].map(preset => (
                <Button 
                  key={preset}
                  variant={displayedValue === preset ? "default" : "outline"}
                  size="sm"
                  className={`px-3 py-1 h-8 ${
                    displayedValue === preset 
                      ? 'bg-[#0CC5BA] hover:bg-[#0CC5BA]/90' 
                      : 'border-gray-200 text-gray-700'
                  }`}
                  onClick={() => {
                    setDisplayedValue(preset);
                    setInputValue(preset.toString());
                    onChange(preset);
                  }}
                >
                  {preset}cm
                </Button>
              ))
            }
          </div>
        </div>
        
        {/* Range indicator */}
        <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-200">
          Valid range: {min}{unit} - {max}{unit}
        </div>
      </div>
    </div>
  );
}