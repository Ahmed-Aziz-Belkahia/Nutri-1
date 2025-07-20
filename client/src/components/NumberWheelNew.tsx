import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface NumberWheelProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
  gender?: "male" | "female";
  type?: "height" | "weight" | "age";
}

export function NumberWheelNew({ 
  value, 
  onChange, 
  min, 
  max, 
  unit = "cm",
  gender = "male",
  type = "height" 
}: NumberWheelProps) {
  // Ensure value is within bounds
  const boundedValue = Math.max(min, Math.min(max, value));
  
  // The current value the user has selected
  const [currentValue, setCurrentValue] = useState(boundedValue);
  
  // Input field value for direct typing
  const [inputValue, setInputValue] = useState(boundedValue.toString());
  
  // Ref for the track element for position calculations
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Track whether we're dragging the thumb
  const [isDragging, setIsDragging] = useState(false);

  // Sync with outside value changes
  useEffect(() => {
    if (boundedValue !== currentValue) {
      setCurrentValue(boundedValue);
      setInputValue(boundedValue.toString());
    }
  }, [boundedValue]);

  // Handle slider change (standard input range)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setCurrentValue(newValue);
    setInputValue(newValue.toString());
    onChange(newValue);
  };

  // Handle input field change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Only update numeric values
    if (/^\d+$/.test(val)) {
      const newValue = parseInt(val, 10);
      // Check if it's within bounds before updating
      if (newValue >= min && newValue <= max) {
        setCurrentValue(newValue);
        onChange(newValue);
      }
    }
  };

  // Handle input blur - validate final value
  const handleInputBlur = () => {
    let newValue = parseInt(inputValue, 10);
    
    // If value is not a number or out of bounds, reset to current
    if (isNaN(newValue) || newValue < min || newValue > max) {
      newValue = currentValue;
      setInputValue(currentValue.toString());
    }
    
    setCurrentValue(newValue);
    onChange(newValue);
  };
  
  // Handle mouse/touch down on track - calculate position and update value
  const handleTrackClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!trackRef.current) return;
    
    // Get click/touch position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = trackRef.current.getBoundingClientRect();
    const position = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, position / rect.width));
    
    // Calculate new value from percentage of track width
    const newValue = Math.round(min + percentage * (max - min));
    
    setCurrentValue(newValue);
    setInputValue(newValue.toString());
    onChange(newValue);
  };
  
  // Handle global mouse/touch move when dragging
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !trackRef.current) return;
    
    // Get drag position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = trackRef.current.getBoundingClientRect();
    const position = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, position / rect.width));
    
    // Calculate new value from percentage of track width
    const newValue = Math.round(min + percentage * (max - min));
    
    setCurrentValue(newValue);
    setInputValue(newValue.toString());
    onChange(newValue);
  };
  
  // Add and remove global event listeners for dragging
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Common presets based on type and gender
  const getPresets = () => {
    if (type === 'height') {
      // Height presets
      return [
        { label: "160cm", value: 160 },
        { label: "170cm", value: 170 },
        { label: "180cm", value: 180 },
        { label: "190cm", value: 190 }
      ];
    } else if (type === 'age' || unit === 'lat' || unit === 'years') {
      // Age presets (used in onboarding)
      return [
        { label: unit === 'lat' ? "16lat" : "16 years", value: 16 },
        { label: unit === 'lat' ? "25lat" : "25 years", value: 25 },
        { label: unit === 'lat' ? "35lat" : "35 years", value: 35 },
        { label: unit === 'lat' ? "45lat" : "45 years", value: 45 }
      ];
    } else if (type === 'weight') {
      // Weight presets based on gender
      if (gender === 'male') {
        return [
          { label: "60kg", value: 60 },
          { label: "70kg", value: 70 },
          { label: "80kg", value: 80 },
          { label: "90kg", value: 90 }
        ];
      } else {
        return [
          { label: "50kg", value: 50 },
          { label: "60kg", value: 60 },
          { label: "70kg", value: 70 },
          { label: "80kg", value: 80 }
        ];
      }
    }
    
    // Default presets if none of the specific conditions match
    return [
      { label: `${min}${unit}`, value: min },
      { label: `${Math.round(min + (max - min) * 0.33)}${unit}`, value: Math.round(min + (max - min) * 0.33) },
      { label: `${Math.round(min + (max - min) * 0.66)}${unit}`, value: Math.round(min + (max - min) * 0.66) },
      { label: `${max}${unit}`, value: max }
    ];
  };
  
  const presets = getPresets();

  // Calculate background gradient percentage based on value position
  const gradientPosition = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Modern UI card with glassmorphism effect */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20"
      >
        {/* Current value display */}
        <div className="text-center mb-4">
          <motion.div 
            key={currentValue}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block"
          >
            <span className="text-4xl font-bold text-[#3B82F6]">
              {currentValue}<span className="ml-1">{unit}</span>
            </span>
          </motion.div>
        </div>
        
        {/* Direct input field + unit */}
        <div className="flex items-center justify-center mb-6 relative">
          <div className="relative flex items-center w-full max-w-[180px]">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="w-full text-2xl font-semibold text-center py-2 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent focus:outline-none"
            />
            <div className="absolute right-3 text-gray-400 font-medium">
              {unit}
            </div>
          </div>
        </div>

        {/* Custom styled slider */}
        <div className="mb-6 px-3">
          {/* Track and thumb */}
          <div 
            ref={trackRef}
            className="relative h-[60px] flex items-center"
            onClick={handleTrackClick}
          >
            {/* Slider track background */}
            <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
            
            {/* Filled track */}
            <div 
              className="absolute h-2 rounded-full bg-gradient-to-r from-[#FFFFFF] via-[#3B82F6] to-[#8B5CF6]" 
              style={{ width: `${gradientPosition}%` }}
            ></div>
            
            {/* Value markers */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <div 
                key={percent}
                className="absolute h-4 w-1 bg-gray-300 rounded-full"
                style={{ left: `${percent}%` }}
              />
            ))}
            
            {/* Standard range input (invisible but functional) */}
            <input
              type="range"
              min={min}
              max={max}
              value={currentValue}
              onChange={handleSliderChange}
              className="absolute w-full h-12 opacity-0 cursor-pointer z-10"
            />
            
            {/* Custom thumb */}
            <div
              className="absolute w-[30px] h-[30px] -ml-[15px] rounded-full bg-white shadow-lg border-2 border-[#3B82F6] flex items-center justify-center z-20 cursor-grab active:cursor-grabbing"
              style={{ 
                left: `${gradientPosition}%`,
                boxShadow: '0 2px 12px rgba(59, 130, 246, 0.4)'
              }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="w-[8px] h-[8px] rounded-full bg-[#3B82F6]"></div>
            </div>
          </div>
          
          {/* Min/max labels */}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{unit === 'lat' ? '16lat' : `${min}${unit}`}</span>
            <span>{unit === 'lat' ? '100lat' : `${max}${unit}`}</span>
          </div>
        </div>
        
        {/* Common presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setCurrentValue(preset.value);
                setInputValue(preset.value.toString());
                onChange(preset.value);
              }}
              className={`py-2 px-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentValue === preset.value
                  ? 'bg-[#3B82F6] text-white shadow-md'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        
        {/* Fine-tune buttons */}
        <div className="flex justify-center mt-4 gap-3">
          <button
            onClick={() => {
              if (currentValue > min) {
                const newValue = currentValue - 1;
                setCurrentValue(newValue);
                setInputValue(newValue.toString());
                onChange(newValue);
              }
            }}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            disabled={currentValue <= min}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
            </svg>
          </button>
          
          <button
            onClick={() => {
              if (currentValue < max) {
                const newValue = currentValue + 1;
                setCurrentValue(newValue);
                setInputValue(newValue.toString());
                onChange(newValue);
              }
            }}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            disabled={currentValue >= max}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}