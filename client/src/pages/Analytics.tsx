import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, type UserProfile as HookUserProfile } from "../hooks/use-user";
import Navigation from "../components/Navigation";
import HeightWeightInput from "@/components/HeightWeightInput";
import { ExternalLink, BookOpen } from 'lucide-react';
import { NUTRITION_SOURCES, CALCULATION_METHODS } from '@/lib/nutrition';
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

type User = { id: number; email: string; profile?: HookUserProfile };

export default function Analytics() {
  const { t } = useTranslation(['common']);
  const { user, updateProfile } = useUser();
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [isUpdatingHeight, setIsUpdatingHeight] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.profile?.weight || 70);
  const [newGoalWeight, setNewGoalWeight] = useState(user?.profile?.goals?.calories ? user.profile.goals.calories : 65);
  const [newHeight, setNewHeight] = useState(user?.profile?.height || 170);
  const [selectedPeriod, setSelectedPeriod] = useState<"90 Days" | "6 Months" | "1 Year" | "All time">("90 Days");
  const [selectedNutritionPeriod, setSelectedNutritionPeriod] = useState<"This week" | "Last week" | "2 wks. ago" | "3 wks. ago">("This week");
  const [showSources, setShowSources] = useState(false);

  // Pull-to-refresh functionality
  const handleRefresh = usePullToRefresh([
    '/api/user',
    '/api/user-profile'
  ]);

  const handleUpdateWeight = async () => {
    setIsUpdatingWeight(true);
    try {
  if (updateProfile) await updateProfile({ weight: newWeight, bodyFatPercentage: calculateBodyFat(newWeight, user?.profile?.height || 170) });
    } catch (error) {
      console.error('Failed to update weight:', error);
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  const handleUpdateHeight = async () => {
    setIsUpdatingHeight(true);
    try {
  if (updateProfile) await updateProfile({ height: newHeight, bodyFatPercentage: calculateBodyFat(user?.profile?.weight || 70, newHeight) });
    } catch (error) {
      console.error('Failed to update height:', error);
    } finally {
      setIsUpdatingHeight(false);
    }
  };

  const handleUpdateGoalWeight = async () => {
    setIsUpdatingGoal(true);
    try {
  if (updateProfile) await updateProfile({ goals: { calories: newGoalWeight } });
    } catch (error) {
      console.error('Failed to update goal weight:', error);
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  // Calculate BMI and body fat percentage
  const currentWeight = user?.profile?.weight || 70;
  const height = user?.profile?.height || 170; // height in cm
  const bmi = Math.round((currentWeight / Math.pow(height/100, 2)) * 10) / 10;

  // Calculate body fat percentage using BMI method
  const calculateBodyFat = (weight: number, heightCm: number) => {
    const bmi = weight / Math.pow(heightCm/100, 2);
    const age = 25; // Default age - could be added to profile later
    const isMale = true; // Could be added to profile later

    // Body fat calculation using BMI method
    let bodyFat;
    if (isMale) {
      bodyFat = (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      bodyFat = (1.20 * bmi) + (0.23 * age) - 5.4;
    }

    return Math.round(bodyFat * 10) / 10;
  };

  const bodyFatPercentage = user?.profile?.bodyFatPercentage || calculateBodyFat(currentWeight, height);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 p-4 space-y-6">
        {/* Height Input Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📏</span>
            <span className="text-lg">{t('common:analytics.height')} {height} {t('common:analytics.units.cm')}</span>
          </div>
          {isUpdatingHeight ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={newHeight}
                onChange={(e) => setNewHeight(Number(e.target.value))}
                className="w-full"
                min="100"
                max="250"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsUpdatingHeight(false)}>
                  {t('common:analytics.actions.cancel')}
                </Button>
                <Button className="flex-1" onClick={handleUpdateHeight}>
                  {t('common:analytics.actions.save')}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-2 hover:bg-gray-50"
              onClick={() => setIsUpdatingHeight(true)}
            >
              {t('common:analytics.actions.updateHeight')}
            </Button>
          )}
        </Card>

        {/* Body Fat Percentage Card */}
        <Card className="p-4">
          <h2 className="text-lg mb-4">{t('common:analytics.bodyFat.title')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-medium">{bodyFatPercentage}%</div>
                <div className="text-sm text-gray-500">{t('common:analytics.bodyFat.estimated')}</div>
                <div className="inline-flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm">{t('common:analytics.bodyFat.basedOnBMI')}</span>
                </div>
              </div>
            </div>

            <div className="relative h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full overflow-hidden">
              <div 
                className="absolute w-2 h-4 bg-black -top-1 rounded-full"
                style={{ left: `${(bodyFatPercentage / 40) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('common:analytics.bodyFat.categories.essential')}</span>
              <span>{t('common:analytics.bodyFat.categories.athletic')}</span>
              <span>{t('common:analytics.bodyFat.categories.fitness')}</span>
              <span>{t('common:analytics.bodyFat.categories.average')}</span>
              <span>{t('common:analytics.bodyFat.categories.obese')}</span>
            </div>
          </div>
        </Card>

        {/* Goal Weight Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-500 text-xl">🏆</span>
            <span className="text-lg">{t('common:analytics.calorieGoal')} {user?.profile?.goals?.calories ?? 2000} {t('common:analytics.units.kcal')}</span>
          </div>
          {isUpdatingGoal ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={newGoalWeight}
                onChange={(e) => setNewGoalWeight(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsUpdatingGoal(false)}>
                  {t('common:analytics.actions.cancel')}
                </Button>
                <Button className="flex-1" onClick={handleUpdateGoalWeight}>
                  {t('common:analytics.actions.save')}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-2 hover:bg-gray-50"
              onClick={() => setIsUpdatingGoal(true)}
            >
              {t('common:analytics.actions.update')}
            </Button>
          )}
        </Card>

        {/* Current Weight */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <span className="text-lg">{t('common:analytics.currentWeight')} {currentWeight} {t('common:analytics.units.kg')}</span>
          </div>
          <div className="text-sm text-gray-500 mb-3">
            {t('common:analytics.updateReminder')}
          </div>
          {isUpdatingWeight ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsUpdatingWeight(false)}>
                  {t('common:analytics.actions.cancel')}
                </Button>
                <Button className="flex-1 bg-black text-white hover:bg-black/90" onClick={handleUpdateWeight}>
                  {t('common:analytics.actions.save')}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full bg-black text-white hover:bg-black/90"
              onClick={() => setIsUpdatingWeight(true)}
            >
              {t('common:analytics.actions.updateWeight')}
            </Button>
          )}
        </Card>

        {/* BMI Section */}
        <Card className="p-4">
          <h2 className="text-lg mb-4">{t('common:analytics.bmi.title')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-medium">{bmi}</div>
                <div className="text-sm text-gray-500">{t('common:analytics.bmi.yourBMIis')}</div>
                <div className="inline-flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">{t('common:analytics.bmi.healthy')}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-500">
                ?
              </Button>
            </div>

            <div className="relative h-2 bg-gradient-to-r from-[#0177FB] via-[#4CD964] to-[#FF3B30] rounded-full overflow-hidden">
              <div 
                className="absolute w-2 h-4 bg-black -top-1 rounded-full"
                style={{ left: `${(bmi / 40) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('common:analytics.bmi.categories.underweight')}</span>
              <span className="text-green-500">{t('common:analytics.bmi.healthy')}</span>
              <span>{t('common:analytics.bmi.categories.overweight')}</span>
              <span className="text-right">{t('common:analytics.bmi.categories.obese')}</span>
            </div>
            
            {/* BMI Source Information */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">
                Formuła BMI: waga (kg) ÷ wzrost² (m²)
              </div>
              <a 
                href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <span>Źródło: WHO</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>
        
        {/* Medical Sources Section */}
        <Card className="p-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0"
            onClick={() => setShowSources(!showSources)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">Źródła medyczne i formuły</span>
            </div>
            <span className="text-sm text-gray-500">
              {showSources ? 'Ukryj' : 'Pokaż'}
            </span>
          </Button>
          
          {showSources && (
            <div className="mt-4 space-y-4">
              {/* Calculation Methods */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-700">Metody obliczeń:</h4>
                <div className="space-y-2">
                  {CALCULATION_METHODS.map((method, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="font-medium">{method.method}</div>
                      <div className="text-gray-600 text-xs mt-1 whitespace-pre-line">{method.formula}</div>
                      <div className="text-gray-500 text-xs mt-1">{method.source}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Medical Sources */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-700">Źródła medyczne:</h4>
                <div className="space-y-2">
                  {NUTRITION_SOURCES.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-blue-900">{source.title}</div>
                          <div className="text-xs text-blue-700 mt-1">{source.organization}</div>
                          <div className="text-xs text-blue-600 mt-1">{source.description}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-blue-600 mt-1 flex-shrink-0 ml-2" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                Ta aplikacja przedstawia informacje medyczne wyłącznie w celach edukacyjnych. 
                Zawsze skonsultuj się z lekarzem przed podejmowaniem decyzji dotyczących zdrowia.
              </div>
            </div>
          )}
        </Card>
        {/* Goal Progress */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg">{t('common:analytics.goalProgress.title')}</h2>
            <div className="flex items-center gap-1">
              <span className="text-sm">{0}%</span>
              <span className="text-sm text-gray-500">{t('common:analytics.goalProgress.goalAchieved')}</span>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            {["90 Days", "6 Months", "1 Year", "All time"].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                className={`flex-1 h-8 text-sm ${
                  selectedPeriod === period 
                    ? "bg-white shadow-sm text-black" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-transparent"
                }`}
                onClick={() => setSelectedPeriod(period as "90 Days" | "6 Months" | "1 Year" | "All time")}
              >
                {period === "90 Days" ? t('common:analytics.goalProgress.periods.90days') :
                 period === "6 Months" ? t('common:analytics.goalProgress.periods.6months') :
                 period === "1 Year" ? t('common:analytics.goalProgress.periods.1year') :
                 t('common:analytics.goalProgress.periods.allTime')}
              </Button>
            ))}
          </div>

          {/* Progress Graph */}
          <div className="h-48 bg-gray-50 rounded-lg" />
        </Card>
        {/* Nutrition Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">{t('common:analytics.nutrition.title')}</h2>

          {/* Time Period Selector */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            {["This week", "Last week", "2 wks. ago", "3 wks. ago"].map((period) => (
              <Button
                key={period}
                variant="ghost"
                className={`flex-1 h-8 text-sm ${
                  selectedNutritionPeriod === period
                    ? "bg-white shadow-sm text-black" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-transparent"
                }`}
                onClick={() => setSelectedNutritionPeriod(period as "This week" | "Last week" | "2 wks. ago" | "3 wks. ago")}
              >
                {period === "This week" ? t('common:analytics.nutrition.periods.thisWeek') :
                 period === "Last week" ? t('common:analytics.nutrition.periods.lastWeek') :
                 period === "2 wks. ago" ? t('common:analytics.nutrition.periods.2weeksAgo') :
                 t('common:analytics.nutrition.periods.3weeksAgo')}
              </Button>
            ))}
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-2xl font-medium">1463</div>
                  <div className="text-sm text-gray-500">{t('common:analytics.nutrition.totalCalories')}</div>
                </div>
                <div>
                  <div className="text-2xl font-medium">1463</div>
                  <div className="text-sm text-gray-500">{t('common:analytics.nutrition.dailyAvg')}</div>
                </div>
              </div>

              {/* Weekly Bar Chart */}
              <div className="relative h-48">
                <div className="absolute left-0 right-0 bottom-8">
                  <div className="flex items-end justify-between gap-2 h-40">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                      <div key={day} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-black rounded-sm transition-all duration-300" 
                          style={{ 
                            height: i === 2 ? '60%' : '0%',
                            opacity: i === 2 ? 1 : 0.1
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="flex justify-between">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="flex-1 text-center">
                        <span className="text-xs text-gray-500">{day[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
      <Navigation />
    </div>
  );
}