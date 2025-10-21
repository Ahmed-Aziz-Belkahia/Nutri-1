import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

// Mock data - will be replaced with real API calls
const mockMeals = [
  { id: 1, name: "Big Mac meal", calories: 900, image: "/placeholder-food.jpg" },
  { id: 2, name: "Beef Steak", calories: 1500, image: "/placeholder-food.jpg" },
];

const mockMealPlan = [
  { id: 1, name: "Eggs", calories: 500, completed: false },
  { id: 2, name: "Beef Steak", calories: 1500, completed: true },
  { id: 3, name: "Fruit Salad", calories: 250, completed: false },
];

export default function DashboardNew() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Mock stats - will be fetched from API
  const caloriesConsumed = 2000;
  const caloriesTarget = 3200;
  const caloriesLeft = caloriesTarget - caloriesConsumed;
  const percentage = Math.round((caloriesConsumed / caloriesTarget) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d3f0ff] to-[#fefefe] pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-8 pb-6">
        <div className="h-[50px] w-[50px] rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.email} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-[#26a8ff] text-white text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[rgba(3,49,75,0.8)]">Welcome back</p>
          <p className="text-base font-bold text-[#26a8ff] truncate">{user?.email?.split('@')[0] || "User"}</p>
        </div>
        <button className="p-2">
          <Bell className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      {/* Week Days Selector */}
      <div className="mx-5 mb-6">
        <div className="backdrop-blur-xl bg-white/60 rounded-[34px] shadow-lg p-1 flex items-center justify-between">
          {[1, 2, 3, 4, 5, 6].map((day, index) => (
            <div key={day} className="flex items-center">
              {index > 0 && <div className="h-[18px] w-px bg-gray-300" />}
              <button
                className={`px-4 py-2 text-[15px] font-bold ${
                  day === 4 ? "text-[#26a8ff]" : "text-gray-600"
                }`}
              >
                {day}
              </button>
            </div>
          ))}
          <button className="bg-gray-200 rounded-full h-9 w-9 flex items-center justify-center text-gray-600">
            →
          </button>
        </div>
      </div>

      {/* Calories Card */}
      <div className="mx-5 mb-6">
        <Card className="backdrop-blur-[15.7px] bg-white/60 border-0 shadow-[14px_24px_101px_0px_rgba(0,0,0,0.08)] p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-[21px] font-medium text-[#1f1f1e] mb-2">Eaten Calories</h2>
              <p className="text-base text-[#888888] mb-3">
                <span className="text-[#26a8ff]">{caloriesConsumed} cal</span> of {caloriesTarget} cal
              </p>
              <div className="bg-[#eeeeee] rounded-full px-3 py-1.5 inline-block">
                <p className="text-xs text-[#1f1f1e]">{caloriesLeft} cal left</p>
              </div>
            </div>
            <div className="relative">
              <svg className="h-[90px] w-[90px] -rotate-90">
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  stroke="#e0e0e0"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  stroke="#26a8ff"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${percentage * 2.387} 238.7`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[21px] font-semibold text-[#1f1f1e]">{percentage}%</span>
              </div>
            </div>
          </div>
          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="h-2 w-2 rounded-full bg-black" />
            <div className="h-2 w-2 rounded-full bg-black/30" />
            <div className="h-2 w-2 rounded-full bg-black/30" />
            <div className="h-2 w-2 rounded-full bg-black/30" />
          </div>
        </Card>
      </div>

      {/* Meals Carousel */}
      <div className="mb-6 px-5">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {mockMeals.map((meal) => (
            <Card key={meal.id} className="backdrop-blur-[15px] bg-white/60 border-0 shadow-[14px_23px_97px_0px_rgba(0,0,0,0.08)] min-w-[216px] flex-shrink-0 overflow-hidden">
              <div className="h-[204px] overflow-hidden rounded-t-[20px]">
                <img 
                  src={meal.image} 
                  alt={meal.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-medium text-[#1f1f1e] mb-1">{meal.name}</h3>
                <p className="text-sm text-[#888888]">{meal.calories}kcal</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Meal Plan */}
      <div className="mx-5 mb-6">
        <Card className="backdrop-blur-[15px] bg-white/60 border-0 shadow-[14px_23px_97px_0px_rgba(0,0,0,0.08)] p-6">
          <h2 className="text-xl font-medium text-[#26a8ff] mb-6">Meal Plan</h2>
          <div className="space-y-6">
            {mockMealPlan.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-[#1f1e1f]">{item.name}</h3>
                  <p className="text-xs text-[#9e9e9e]">{item.calories}kcal</p>
                </div>
                <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${
                  item.completed 
                    ? "border-[#26a8ff] bg-[#26a8ff]" 
                    : "border-gray-300"
                }`}>
                  {item.completed && (
                    <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 pb-6 px-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-full shadow-lg p-1 flex items-center justify-around max-w-md mx-auto">
          <button className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2 bg-gray-200 rounded-full">
            <span className="text-[17px] text-[#0088ff]">🏠</span>
            <span className="text-[10px] font-semibold text-[#0088ff]">Home</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2">
            <span className="text-[17px] text-gray-600">📖</span>
            <span className="text-[10px] font-medium text-gray-600">Recipes</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2">
            <span className="text-[17px] text-gray-600">📚</span>
            <span className="text-[10px] font-medium text-gray-600">Library</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2">
            <span className="text-[17px] text-gray-600">➕</span>
            <span className="text-[10px] font-medium text-gray-600">ADD</span>
          </button>
        </div>
      </div>
    </div>
  );
}
