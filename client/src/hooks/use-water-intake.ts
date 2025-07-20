import { useState } from 'react';

const WATER_STEP = 250; // ml
const MAX_WATER = 2000; // ml

export function useWaterIntake() {
  const [waterAmount, setWaterAmount] = useState(0);

  const increment = () => {
    setWaterAmount(prev => Math.min(prev + WATER_STEP, MAX_WATER));
  };

  const decrement = () => {
    setWaterAmount(prev => Math.max(prev - WATER_STEP, 0));
  };

  const percentage = (waterAmount / MAX_WATER) * 100;

  return {
    waterAmount,
    percentage,
    increment,
    decrement,
    maxWater: MAX_WATER,
  };
}
