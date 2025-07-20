import { useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, ChevronDown } from "lucide-react";

interface HeightWeightInputProps {
  onHeightChange: (height: { ft?: number; in?: number; cm?: number }) => void;
  onWeightChange: (weight: number) => void;
}

export default function HeightWeightInput({ onHeightChange, onWeightChange }: HeightWeightInputProps) {
  const [isImperial, setIsImperial] = useState(true);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(8);
  const [heightCm, setHeightCm] = useState(173);
  const [weight, setWeight] = useState(150);
  const [isDragging, setIsDragging] = useState(false);

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    onWeightChange(newWeight);
  };

  return (
    <div className="space-y-8">
      {/* Unit Toggle */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0CC5BA]/5 to-purple-500/5 rounded-2xl backdrop-blur-sm">
        <span className={`text-sm font-medium transition-colors ${isImperial ? 'text-[#0CC5BA]' : 'text-gray-500'}`}>
          Imperial
        </span>
        <Switch
          checked={!isImperial}
          onCheckedChange={(checked) => setIsImperial(!checked)}
          className="mx-2 data-[state=checked]:bg-[#0CC5BA] hover:data-[state=checked]:bg-[#0CC5BA]/90"
        />
        <span className={`text-sm font-medium transition-colors ${!isImperial ? 'text-[#0CC5BA]' : 'text-gray-500'}`}>
          Metric
        </span>
      </div>

      {/* Height Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Height</Label>
        <div className="flex gap-3">
          {isImperial ? (
            <>
              <div className="flex-1">
                <motion.div 
                  className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex flex-col items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                      onClick={() => {
                        const newFt = Math.min(8, heightFt + 1);
                        setHeightFt(newFt);
                        onHeightChange({ ft: newFt, in: heightIn });
                      }}
                    >
                      <ChevronUp className="h-5 w-5 text-[#0CC5BA]" />
                    </Button>
                    <motion.div 
                      className="py-3 text-center"
                      initial={false}
                      animate={{ scale: [1.1, 1] }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-3xl font-medium bg-gradient-to-r from-[#0CC5BA] to-purple-500 bg-clip-text text-transparent">
                        {heightFt}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">ft</span>
                    </motion.div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                      onClick={() => {
                        const newFt = Math.max(4, heightFt - 1);
                        setHeightFt(newFt);
                        onHeightChange({ ft: newFt, in: heightIn });
                      }}
                    >
                      <ChevronDown className="h-5 w-5 text-[#0CC5BA]" />
                    </Button>
                  </div>
                </motion.div>
              </div>

              <div className="flex-1">
                <motion.div 
                  className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex flex-col items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                      onClick={() => {
                        const newIn = Math.min(11, heightIn + 1);
                        setHeightIn(newIn);
                        onHeightChange({ ft: heightFt, in: newIn });
                      }}
                    >
                      <ChevronUp className="h-5 w-5 text-[#0CC5BA]" />
                    </Button>
                    <motion.div 
                      className="py-3 text-center"
                      initial={false}
                      animate={{ scale: [1.1, 1] }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-3xl font-medium bg-gradient-to-r from-[#0CC5BA] to-purple-500 bg-clip-text text-transparent">
                        {heightIn}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">in</span>
                    </motion.div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                      onClick={() => {
                        const newIn = Math.max(0, heightIn - 1);
                        setHeightIn(newIn);
                        onHeightChange({ ft: heightFt, in: newIn });
                      }}
                    >
                      <ChevronDown className="h-5 w-5 text-[#0CC5BA]" />
                    </Button>
                  </div>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="flex-1">
              <motion.div 
                className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                    onClick={() => {
                      const newCm = Math.min(220, heightCm + 1);
                      setHeightCm(newCm);
                      onHeightChange({ cm: newCm });
                    }}
                  >
                    <ChevronUp className="h-5 w-5 text-[#0CC5BA]" />
                  </Button>
                  <motion.div 
                    className="py-3 text-center"
                    initial={false}
                    animate={{ scale: [1.1, 1] }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-3xl font-medium bg-gradient-to-r from-[#0CC5BA] to-purple-500 bg-clip-text text-transparent">
                      {heightCm}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">cm</span>
                  </motion.div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full h-10 hover:bg-[#0CC5BA]/5 active:bg-[#0CC5BA]/10"
                    onClick={() => {
                      const newCm = Math.max(100, heightCm - 1);
                      setHeightCm(newCm);
                      onHeightChange({ cm: newCm });
                    }}
                  >
                    <ChevronDown className="h-5 w-5 text-[#0CC5BA]" />
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Weight Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Weight</Label>
        <motion.div 
          className="bg-white border rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="space-y-8">
            <motion.div 
              className="flex justify-center"
              animate={{
                scale: isDragging ? 1.05 : 1,
                y: isDragging ? -2 : 0
              }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <div className="text-center">
                <span className="text-5xl font-medium tracking-tight bg-gradient-to-r from-[#0CC5BA] to-purple-500 bg-clip-text text-transparent">
                  {weight}
                </span>
                <span className="text-xl text-gray-500 ml-2">{isImperial ? "lb" : "kg"}</span>
              </div>
            </motion.div>

            <div className="px-2">
              <Slider
                value={[weight]}
                min={isImperial ? 80 : 36}
                max={isImperial ? 300 : 136}
                step={1}
                onValueChange={([value]) => handleWeightChange(value)}
                onValueCommit={() => setIsDragging(false)}
                className="w-full [&>[role=slider]]:h-6 [&>[role=slider]]:w-6 [&>[role=slider]]:bg-[#0CC5BA] [&>[role=slider]]:hover:bg-[#0CC5BA]/90 [&>[role=slider]]:focus:ring-[#0CC5BA]/20 [&_[data-disabled]]:opacity-50"
                onPointerDown={() => setIsDragging(true)}
                onPointerUp={() => setIsDragging(false)}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">{isImperial ? "80 lb" : "36 kg"}</span>
              <span className="font-medium text-gray-900">{isImperial ? "300 lb" : "136 kg"}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}