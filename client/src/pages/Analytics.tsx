import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "../hooks/use-user";
import Navigation from "../components/Navigation";
import HeightWeightInput from "@/components/HeightWeightInput";

interface UserProfile {
  weight?: number;
  goalWeight?: number;
  height?: number;
  initialWeight?: number;
  bodyFatPercentage?: number;
}

interface User {
  id: number;
  email: string;
  profile?: UserProfile;
}

export default function Analytics() {
  const { user, updateProfile } = useUser();
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [isUpdatingHeight, setIsUpdatingHeight] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.profile?.weight || 70);
  const [newGoalWeight, setNewGoalWeight] = useState(user?.profile?.goalWeight || 65);
  const [newHeight, setNewHeight] = useState(user?.profile?.height || 170);
  const [selectedPeriod, setSelectedPeriod] = useState<"90 Days" | "6 Months" | "1 Year" | "All time">("90 Days");
  const [selectedNutritionPeriod, setSelectedNutritionPeriod] = useState<"This week" | "Last week" | "2 wks. ago" | "3 wks. ago">("This week");

  const handleUpdateWeight = async () => {
    setIsUpdatingWeight(true);
    try {
      if (user && updateProfile) {
        await updateProfile({ 
          ...user,
          profile: {
            ...user.profile,
            weight: newWeight,
            bodyFatPercentage: calculateBodyFat(newWeight, user.profile?.height || 170)
          }
        });
      }
    } catch (error) {
      console.error('Failed to update weight:', error);
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  const handleUpdateHeight = async () => {
    setIsUpdatingHeight(true);
    try {
      if (user && updateProfile) {
        await updateProfile({
          ...user,
          profile: {
            ...user.profile,
            height: newHeight,
            bodyFatPercentage: calculateBodyFat(user.profile?.weight || 70, newHeight)
          }
        });
      }
    } catch (error) {
      console.error('Failed to update height:', error);
    } finally {
      setIsUpdatingHeight(false);
    }
  };

  const handleUpdateGoalWeight = async () => {
    setIsUpdatingGoal(true);
    try {
      if (user && updateProfile) {
        await updateProfile({
          ...user,
          profile: {
            ...user.profile,
            goalWeight: newGoalWeight
          }
        });
      }
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
            <span className="text-lg">Height {height} cm</span>
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
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateHeight}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-2 hover:bg-gray-50"
              onClick={() => setIsUpdatingHeight(true)}
            >
              Update Height
            </Button>
          )}
        </Card>

        {/* Body Fat Percentage Card */}
        <Card className="p-4">
          <h2 className="text-lg mb-4">Body Fat Percentage</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-medium">{bodyFatPercentage}%</div>
                <div className="text-sm text-gray-500">Estimated body fat</div>
                <div className="inline-flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Based on BMI calculation</span>
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
              <span>Essential Fat</span>
              <span>Athletic</span>
              <span>Fitness</span>
              <span>Average</span>
              <span>Obese</span>
            </div>
          </div>
        </Card>

        {/* Goal Weight Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-500 text-xl">🏆</span>
            <span className="text-lg">Goal Weight {user?.profile?.goalWeight} kg</span>
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
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateGoalWeight}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-2 hover:bg-gray-50"
              onClick={() => setIsUpdatingGoal(true)}
            >
              Update
            </Button>
          )}
        </Card>

        {/* Current Weight */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <span className="text-lg">Current Weight {currentWeight} kg</span>
          </div>
          <div className="text-sm text-gray-500 mb-3">
            Remember to update this at least once a week so we can adjust your plan
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
                  Cancel
                </Button>
                <Button className="flex-1 bg-black text-white hover:bg-black/90" onClick={handleUpdateWeight}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full bg-black text-white hover:bg-black/90"
              onClick={() => setIsUpdatingWeight(true)}
            >
              Update your weight
            </Button>
          )}
        </Card>

        {/* BMI Section */}
        <Card className="p-4">
          <h2 className="text-lg mb-4">Your BMI</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-medium">{bmi}</div>
                <div className="text-sm text-gray-500">Your BMI is</div>
                <div className="inline-flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">Healthy</span>
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
              <span>Underweight</span>
              <span className="text-green-500">Healthy</span>
              <span>Overweight</span>
              <span className="text-right">Obese</span>
            </div>
          </div>
        </Card>
        {/* Goal Progress */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg">Goal Progress</h2>
            <div className="flex items-center gap-1">
              <span className="text-sm">{Math.round(((currentWeight - (user?.profile?.initialWeight || currentWeight)) / (user?.profile?.goalWeight - (user?.profile?.initialWeight || currentWeight))) * 100)}%</span>
              <span className="text-sm text-gray-500">Goal achieved</span>
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
                {period}
              </Button>
            ))}
          </div>

          {/* Progress Graph */}
          <div className="h-48 bg-gray-50 rounded-lg" />
        </Card>
        {/* Nutrition Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Nutrition</h2>

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
                {period}
              </Button>
            ))}
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-2xl font-medium">1463</div>
                  <div className="text-sm text-gray-500">Total calories</div>
                </div>
                <div>
                  <div className="text-2xl font-medium">1463</div>
                  <div className="text-sm text-gray-500">Daily avg.</div>
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