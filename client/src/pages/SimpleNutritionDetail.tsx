import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFoodLog } from "../hooks/use-food-log";
import { useUserProfile } from "../hooks/use-user-profile";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

// Helper function to format numbers
const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toFixed(0);
};

export default function SimpleNutritionDetail() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  const getInitialDate = () => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const dateParam = params.get('date');
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) {
        // Invalid date, use today
      }
    }
    return new Date();
  };

  const [selectedDate] = useState<Date>(getInitialDate());
  const { foodLogs, isLoadingLogs } = useFoodLog(selectedDate);
  const { data: profile } = useUserProfile();

  if (isLoadingLogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0CC5BA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate totals from food logs
  const todayTotals = {
    calories: foodLogs.reduce((sum, log) => sum + (typeof log.calories === 'string' ? parseFloat(log.calories) : log.calories), 0),
    protein: foodLogs.reduce((sum, log) => sum + (typeof log.protein === 'string' ? parseFloat(log.protein) : log.protein), 0),
    carbs: foodLogs.reduce((sum, log) => sum + (typeof log.carbs === 'string' ? parseFloat(log.carbs) : log.carbs), 0),
    fat: foodLogs.reduce((sum, log) => sum + (typeof log.fat === 'string' ? parseFloat(log.fat) : log.fat), 0)
  };

  // Get goals from profile
  const calorieGoal = profile?.calorieGoal || 2000;
  const proteinGoal = profile?.proteinGoal || 150;
  const carbsGoal = profile?.carbsGoal || 200;
  const fatGoal = profile?.fatGoal || 67;

  // Generate insights based on data
  const insights = [];
  
  // Protein goal insight
  if (todayTotals.protein >= proteinGoal) {
    insights.push({
      message: "Good job! Protein goal reached.",
      type: "success",
      icon: <CheckCircle className="h-5 w-5" />
    });
  }
  
  // Fat warning insight
  if (todayTotals.fat >= fatGoal * 0.85) {
    insights.push({
      message: "Fat is getting close to limit.",
      type: "warning",
      icon: <AlertTriangle className="h-5 w-5" />
    });
  }
  
  // Calorie info insight
  const calorieDeficit = calorieGoal - todayTotals.calories;
  if (calorieDeficit > 200) {
    insights.push({
      message: `You're ${calorieDeficit} calories under budget.`,
      type: "info",
      icon: <Info className="h-5 w-5" />
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 mb-2">
        <div className="max-w-[500px] mx-auto flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/dashboard')}
            className="mr-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-[#0CC5BA]">
            Detailed Nutrition
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[500px] mx-auto p-4 pb-24">
        {/* Tab Navigation */}
        <div className="flex items-center bg-white rounded-xl p-1 mb-6 shadow-sm">
          {['overview', 'meals', 'micronutrients', 'timing'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-[#0CC5BA] text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Calorie counter with lightning icon */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 flex items-center justify-center bg-[#e6f7f6] rounded-full mr-3">
            <svg className="w-6 h-6 text-[#0CC5BA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold">
              {formatNumber(todayTotals.calories)}
            </div>
            <div className="text-sm text-gray-500">
              of {formatNumber(calorieGoal)} goal
            </div>
          </div>
          <div className="ml-auto">
            <div className="relative w-16 h-16">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#E6F7F6"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#0CC5BA"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 56}`}
                  strokeDashoffset={`${Math.PI * 56 * (1 - (todayTotals.calories / calorieGoal))}`}
                  transform="rotate(-90 32 32)"
                />
                <text
                  x="32" 
                  y="36"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="#0CC5BA"
                >
                  {Math.min(Math.round((todayTotals.calories / calorieGoal) * 100), 100)}%
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Macros section */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Carbs */}
          <div>
            <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
              <div 
                className="h-full rounded-full bg-[#0CC5BA]"
                style={{ width: `${Math.min((todayTotals.carbs / carbsGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-lg font-medium text-center">
              {formatNumber(todayTotals.carbs)}g
            </div>
            <div className="text-xs text-gray-500 text-center">
              {t('common:enhancedDashboard.macros.carbs')}
            </div>
            <div className="text-xs text-gray-400 text-center">
              {t('common:detailedNutrition.goal')}: {formatNumber(carbsGoal)}g
            </div>
          </div>

          {/* Protein */}
          <div>
            <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
              <div 
                className="h-full rounded-full bg-[#0CC5BA]"
                style={{ width: `${Math.min((todayTotals.protein / proteinGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-lg font-medium text-center">
              {formatNumber(todayTotals.protein)}g
            </div>
            <div className="text-xs text-gray-500 text-center">
              {t('common:enhancedDashboard.macros.protein')}
            </div>
            <div className="text-xs text-gray-400 text-center">
              {t('common:detailedNutrition.goal')}: {formatNumber(proteinGoal)}g
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="w-full h-1.5 bg-[#E6F7F6] rounded-full mb-1">
              <div 
                className="h-full rounded-full bg-[#0CC5BA]"
                style={{ width: `${Math.min((todayTotals.fat / fatGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-lg font-medium text-center">
              {formatNumber(todayTotals.fat)}g
            </div>
            <div className="text-xs text-gray-500 text-center">
              {t('common:enhancedDashboard.macros.fat')}
            </div>
            <div className="text-xs text-gray-400 text-center">
              Goal: {formatNumber(fatGoal)}g
            </div>
          </div>
        </div>

        {/* Daily Insights Card */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('common:detailedNutrition.dailyInsights.title')}</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`flex justify-between items-center p-3 rounded-xl ${
                  insight.type === 'success' ? 'bg-green-50' : 
                  insight.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                }`}
              >
                <div className={`font-medium ${
                  insight.type === 'success' ? 'text-green-700' : 
                  insight.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {insight.message}
                </div>
                <div className={`${
                  insight.type === 'success' ? 'text-green-700' : 
                  insight.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {insight.type === 'success' ? '✓' : 
                   insight.type === 'warning' ? '!' : 'i'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Calorie Trends */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('common:detailedNutrition.weeklyCalorieTrends')}</h3>
          <div className="h-40">
            <div className="flex h-full items-end justify-between">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const height = [70, 90, 60, 75, 85, 80, 65][i];
                const isToday = i === new Date().getDay() - 1; // Adjust for 0-indexed days
                return (
                  <div key={day} className="flex flex-col items-center flex-1">
                    <div 
                      className={`w-full mx-1 rounded-t-lg ${
                        isToday ? 'bg-[#0CC5BA]' : 'bg-gray-200'
                      }`} 
                      style={{ height: `${height}%` }}
                    />
                    <div className={`text-xs mt-2 ${isToday ? 'font-bold text-[#0CC5BA]' : 'text-gray-500'}`}>
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Switch to Detailed View Button */}
        <div className="mt-8 mb-4 flex justify-center">
          <Button 
            className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90 text-white rounded-full px-6 py-2"
            onClick={() => setLocation("/detailed-nutrition?date=" + format(selectedDate, 'yyyy-MM-dd'))}
          >
            Switch to Detailed View
          </Button>
        </div>
      </div>
    </div>
  );
}