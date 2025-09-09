import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Target, TrendingDown, TrendingUp } from 'lucide-react';

interface OverviewProps {
  currentWeight?: number;
  goalWeight?: number;
  startWeight?: number;
  bodyFatPercentage?: number;
}

export const ProgressOverview: React.FC<OverviewProps> = ({ currentWeight, goalWeight, startWeight, bodyFatPercentage }) => {
  if (!currentWeight && !goalWeight && !bodyFatPercentage) return null;

  const weightDelta = currentWeight && startWeight ? currentWeight - startWeight : undefined;
  const toGoal = currentWeight && goalWeight ? currentWeight - goalWeight : undefined;

  const deltaBadge = (value: number) => {
    const isLoss = value < 0;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isLoss ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>\n        {isLoss ? '' : '+'}{value.toFixed(1)} kg\n      </span>
    );
  };

  return (
    <Card className="p-4 rounded-2xl shadow-sm bg-white/70 backdrop-blur border border-gray-200/60">
      <div className="grid grid-cols-2 gap-4">
        {typeof currentWeight === 'number' && (
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Current
            </div>
            <div className="text-2xl font-bold text-gray-900">{currentWeight.toFixed(1)}<span className="text-sm font-semibold text-gray-500 ml-1">kg</span></div>
            {typeof weightDelta === 'number' && startWeight !== currentWeight && (
              <div className="mt-1">{deltaBadge(weightDelta)}</div>
            )}
          </div>
        )}
        {typeof goalWeight === 'number' && (
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Goal
            </div>
            <div className="text-2xl font-bold text-gray-900">{goalWeight.toFixed(1)}<span className="text-sm font-semibold text-gray-500 ml-1">kg</span></div>
            {typeof toGoal === 'number' && (
              <div className="mt-1 text-xs font-medium text-gray-600">{toGoal > 0 ? `${toGoal.toFixed(1)} kg to go` : 'Goal reached'}</div>
            )}
          </div>
        )}
        {typeof bodyFatPercentage === 'number' && (
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Body Fat
            </div>
            <div className="text-2xl font-bold text-gray-900">{bodyFatPercentage.toFixed(1)}<span className="text-sm font-semibold text-gray-500 ml-1">%</span></div>
          </div>
        )}
        {typeof startWeight === 'number' && (
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Start
            </div>
            <div className="text-2xl font-bold text-gray-900">{startWeight.toFixed(1)}<span className="text-sm font-semibold text-gray-500 ml-1">kg</span></div>
          </div>
        )}
      </div>
    </Card>
  );
};
