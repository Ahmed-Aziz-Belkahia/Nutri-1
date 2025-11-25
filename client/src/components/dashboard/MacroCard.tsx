import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UserProfile {
  caloriesGoal?: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
}

interface MacroCardProps {
  dailyTotals: DailyTotals;
  currentCardIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onDotClick: (index: number) => void;
  userProfile?: UserProfile;
}

export default function MacroCard({ 
  dailyTotals, 
  currentCardIndex, 
  onPrevious, 
  onNext, 
  onDotClick,
  userProfile
}: MacroCardProps) {
  const { t } = useTranslation();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Helper function to get background color based on percentage
  const getBackgroundColor = (percentage: number, baseColors: { light: string, medium: string, dark: string, saturated: string }) => {
    if (percentage === 0) return 'rgba(255, 255, 255, 0.6)';
    if (percentage <= 25) return baseColors.light;
    if (percentage <= 50) return baseColors.medium;
    if (percentage <= 75) return baseColors.dark;
    return baseColors.saturated;
  };

  // Helper function to get progress circle color
  const getProgressColor = (percentage: number, baseColors: { base: string, saturated: string }) => {
    if (percentage >= 75) return baseColors.saturated;
    return baseColors.base;
  };

  // Helper function to determine text color based on percentage
  const getTextColor = (percentage: number) => {
    return percentage >= 75 ? '#ffffff' : '#1f1f1e';
  };

  // Helper function to determine secondary text color
  const getSecondaryTextColor = (percentage: number) => {
    return percentage >= 75 ? '#ffffff' : '#888888';
  };

  // Calculate target macros from user profile
  // caloriesGoal is the WHO formula result from onboarding
  // proteinGoal, carbsGoal, fatGoal are percentages (e.g., 30 means 30%)
  const targetCalories = userProfile?.caloriesGoal || 2500;
  const targetProtein = userProfile?.proteinGoal && userProfile?.caloriesGoal
    ? Math.round((userProfile.proteinGoal / 100) * userProfile.caloriesGoal / 4) // 4 cal/g for protein
    : 150;
  const targetCarbs = userProfile?.carbsGoal && userProfile?.caloriesGoal
    ? Math.round((userProfile.carbsGoal / 100) * userProfile.caloriesGoal / 4) // 4 cal/g for carbs
    : 300;
  const targetFat = userProfile?.fatGoal && userProfile?.caloriesGoal
    ? Math.round((userProfile.fatGoal / 100) * userProfile.caloriesGoal / 9) // 9 cal/g for fat
    : 80;

  const macroData = [
    {
      id: 'calories',
      title: t('common:macroCard.eatenCalories'),
      current: Math.round(dailyTotals.calories),
      target: targetCalories,
      unit: t('common:nutrition.calShort'),
      backgroundColors: {
        light: 'rgba(212, 238, 255, 0.6)',
        medium: 'rgba(197, 232, 255, 0.6)',
        dark: 'rgba(118, 200, 255, 0.79)',
        saturated: 'rgba(26, 163, 255, 0.81)'
      },
      progressColors: {
        base: '#26A8FF',
        saturated: '#1AA3FF'
      },
      accentColor: '#26A8FF',
      percentage: Math.min(100, Math.round((dailyTotals.calories / targetCalories) * 100))
    },
    {
      id: 'protein',
      title: t('common:macroCard.eatenProtein'),
      current: Math.round(dailyTotals.protein),
      target: targetProtein,
      unit: t('common:nutrition.gramsShort'),
      backgroundColors: {
        light: 'rgba(255, 227, 192, 0.6)',
        medium: 'rgba(251, 190, 115, 0.6)',
        dark: 'rgba(255, 164, 52, 0.79)',
        saturated: 'rgba(255, 140, 0, 0.81)'
      },
      progressColors: {
        base: '#FFA434',
        saturated: '#FF8C00'
      },
      accentColor: 'darkorange',
      percentage: Math.min(100, Math.round((dailyTotals.protein / targetProtein) * 100))
    },
    {
      id: 'carbs',
      title: t('common:macroCard.eatenCarbs'),
      current: Math.round(dailyTotals.carbs),
      target: targetCarbs,
      unit: t('common:nutrition.gramsShort'),
      backgroundColors: {
        light: 'rgba(223, 255, 220, 0.6)',
        medium: 'rgba(150, 255, 142, 0.6)',
        dark: 'rgba(88, 235, 78, 0.79)',
        saturated: 'rgba(25, 188, 13, 0.81)'
      },
      progressColors: {
        base: '#5AEB4E',
        saturated: '#19BC0D'
      },
      accentColor: '#19BC0D',
      percentage: Math.min(100, Math.round((dailyTotals.carbs / targetCarbs) * 100))
    },
    {
      id: 'fat',
      title: t('common:macroCard.eatenFat'),
      current: Math.round(dailyTotals.fat),
      target: targetFat,
      unit: t('common:nutrition.gramsShort'),
      backgroundColors: {
        light: 'rgba(255, 244, 244, 0.6)',
        medium: 'rgba(255, 213, 213, 0.6)',
        dark: 'rgba(251, 96, 96, 0.79)',
        saturated: 'rgba(255, 39, 39, 0.81)'
      },
      progressColors: {
        base: '#FB6060',
        saturated: '#FF2727'
      },
      accentColor: 'red',
      percentage: Math.min(100, Math.round((dailyTotals.fat / targetFat) * 100))
    }
  ];

  const currentMacro = macroData[currentCardIndex];
  const remaining = currentMacro.target - currentMacro.current;
  const circumference = 2 * Math.PI * 38;
  const strokeDasharray = `${(currentMacro.percentage / 100) * circumference} ${circumference}`;

  // Dynamic colors based on percentage
  const backgroundColor = getBackgroundColor(currentMacro.percentage, currentMacro.backgroundColors);
  const progressColor = getProgressColor(currentMacro.percentage, currentMacro.progressColors);
  const textColor = getTextColor(currentMacro.percentage);
  const secondaryTextColor = getSecondaryTextColor(currentMacro.percentage);
  const dotColor = currentMacro.percentage >= 75 ? '#ffffff' : '#000000';

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrevious();
    }
  };

  return (
    <div 
      className="card" 
      style={{ 
        marginBottom: '20px',
        backgroundColor: backgroundColor,
        backdropFilter: 'blur(15.7px)',
        transition: 'background-color 0.3s ease'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1" style={{ color: textColor }}>
              {currentMacro.title}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold" style={{ color: currentMacro.accentColor }}>
                {currentMacro.current} {currentMacro.unit}
              </span>
              <span className="text-sm" style={{ color: secondaryTextColor }}>
                {t('common:macroCard.of', { target: currentMacro.target, unit: currentMacro.unit })}
              </span>
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full mt-2" style={{ backgroundColor: '#eeeeee' }}>
              <span className="text-xs font-medium" style={{ color: '#1f1f1e' }}>
                {remaining > 0 ? t('common:macroCard.remaining', { amount: remaining, unit: currentMacro.unit }) : t('common:macroCard.targetReached')}
              </span>
            </div>
          </div>

          <div className="progress-circle-container">
            <svg className="progress-circle-svg">
              <circle className="progress-circle-bg" cx="40" cy="40" r="34" />
              <circle 
                className="progress-circle-fg" 
                cx="40" 
                cy="40" 
                r="34" 
                strokeDasharray={strokeDasharray}
                style={{ stroke: progressColor }}
              />
            </svg>
            <div className="progress-circle-text" style={{ color: textColor }}>
              {currentMacro.percentage}%
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {macroData.map((macro, index) => (
          <button
            key={macro.id}
            className={`rounded-full transition-all duration-500 ease-in-out ${
              index === currentCardIndex ? 'w-6 h-2' : 'w-2 h-2'
            }`}
            style={{
              backgroundColor: index === currentCardIndex 
                ? currentMacro.accentColor
                : currentMacro.percentage >= 75 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => onDotClick(index)}
            aria-label={t('common:macroCard.view', { macro: macro.title })}
          />
        ))}
      </div>
    </div>
  );
}
