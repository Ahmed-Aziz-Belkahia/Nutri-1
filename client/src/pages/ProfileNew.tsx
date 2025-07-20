import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Camera, Star, Clock, Shield, Bell, HelpCircle, Loader2, Activity, Target, Scale, Ruler, ChevronRight, Edit2, Save, X, LogOut, Award, TrendingUp, Utensils, Dumbbell, Zap, Calendar, FileText, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import type { UserProfile } from "@/types/User";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecentMeal {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
}

export default function Profile() {
  const { user, isLoading: isLoadingUser, refetch: refetchUser, logout, updateProfile } = useUser();
  const { data: profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserProfile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Function to translate activity levels to Polish
  const getActivityLevelInPolish = (activityLevel: string) => {
    const translations = {
      'sedentary': 'Siedzący tryb życia',
      'light': 'Lekka aktywność',
      'moderate': 'Umiarkowana aktywność',
      'active': 'Wysoka aktywność',
      'very_active': 'Bardzo aktywny',
      'Very Active': 'Bardzo aktywny',
      'Sedentary': 'Siedzący tryb życia',
      'Light': 'Lekka aktywność',
      'Moderate': 'Umiarkowana aktywność',
      'Active': 'Wysoka aktywność'
    };
    return translations[activityLevel as keyof typeof translations] || activityLevel;
  };

  const getActivityLevelDescription = (activityLevel: string) => {
    const descriptions = {
      'sedentary': 'Brak ćwiczeń',
      'light': '1-3 dni w tygodniu',
      'moderate': '3-5 dni w tygodniu',
      'active': '6-7 dni w tygodniu',
      'very_active': '2x dziennie',
      'Very Active': '2x dziennie',
      'Sedentary': 'Brak ćwiczeń',
      'Light': '1-3 dni w tygodniu',
      'Moderate': '3-5 dni w tygodniu',
      'Active': '6-7 dni w tygodniu'
    };
    return descriptions[activityLevel as keyof typeof descriptions] || '';
  };
  
  // Goal & Activity dialog state
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [weightGoal, setWeightGoal] = useState<string>(profile?.weightGoal || 'maintain');
  const [goalWeight, setGoalWeight] = useState<string>(profile?.goalWeight?.toString() || '70');
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activityLevel || 'Moderate');
  
  // Nutritional goals dialog state
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [calories, setCalories] = useState<string>((profile?.caloriesGoal || 2000).toString());
  const [protein, setProtein] = useState<string>(profile?.proteinGoal?.toString() || '150');
  const [carbs, setCarbs] = useState<string>(profile?.carbsGoal?.toString() || '250');
  const [fat, setFat] = useState<string>(profile?.fatGoal?.toString() || '70');
  
  // Update state values when profile changes
  useEffect(() => {
    if (profile) {
      // Update goal & activity values
      setWeightGoal(profile.weightGoal || 'maintain');
      setGoalWeight(profile.goalWeight?.toString() || '70');
      setActivityLevel(profile.activityLevel || 'Moderate');
      
      // Update nutritional values - convert percentages to grams
      const calorieGoal = profile.caloriesGoal || 2000;
      setCalories(calorieGoal.toString());
      
      // Convert percentages to grams (4 cal/g for protein and carbs, 9 cal/g for fat)
      const proteinGrams = Math.round((calorieGoal * (profile.proteinGoal || 30)) / 100 / 4);
      const carbsGrams = Math.round((calorieGoal * (profile.carbsGoal || 40)) / 100 / 4);
      const fatGrams = Math.round((calorieGoal * (profile.fatGoal || 30)) / 100 / 9);
      
      setProtein(proteinGrams.toString());
      setCarbs(carbsGrams.toString());
      setFat(fatGrams.toString());
    }
  }, [profile]);

  const { data: recentMeals = [] } = useQuery<RecentMeal[]>({
    queryKey: ['/api/meals/recent'],
    queryFn: async () => {
      const response = await fetch('/api/meals/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch recent meals');
      }
      return response.json();
    },
    enabled: !!user
  });

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const response = await axios.post('/api/user/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.imageUrl) {
        await refetchUser();
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingUser || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          <Loader2 className="h-8 w-8 text-[#0CC5BA]" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 p-8 rounded-3xl border border-gray-100 shadow-xl"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
            Please Sign In
          </h2>
          <p className="text-gray-600">You need to be logged in to view your profile</p>
          <Button
            onClick={() => setLocation("/auth")}
            className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90 shadow-lg shadow-[#0CC5BA]/20"
          >
            Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-[#0CC5BA]/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header with enhanced animations */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20"
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-[#0CC5BA]/10 hover:text-[#0CC5BA] transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-gray-700" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent ml-2">
            Profile
          </h1>
        </div>
      </motion.header>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      <main className="max-w-2xl mx-auto px-4 py-6 relative z-20">
        {/* Enhanced profile header with decorative elements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-20 w-40 h-40 bg-[#0CC5BA]/5 rounded-full blur-xl" />
          <div className="absolute -left-20 top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-xl" />
          
          <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile image container with enhanced effects */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-3xl rotate-6 opacity-40 blur-lg animate-pulse" />
                <motion.div
                  className="relative w-28 h-28 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-3xl p-[2px] shadow-lg group cursor-pointer backdrop-blur-xl"
                  whileHover={{ rotate: 0, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ rotate: -6 }}
                  onClick={handleImageClick}
                >
                  <div className="w-full h-full bg-white/95 rounded-3xl flex items-center justify-center overflow-hidden backdrop-blur-xl">
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10">
                        <span className="text-5xl">👤</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>

              {/* User details with enhanced typography */}
              <div className="flex flex-col text-center md:text-left flex-1">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent"
                >
                  {user?.email?.split('@')[0] || 'User'}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 mb-4"
                >
                  {user?.email}
                </motion.p>

                {/* Level indicator */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center md:justify-start gap-2 mb-3"
                >
                  <div className="flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[#0CC5BA]/10 to-blue-500/10 border border-[#0CC5BA]/20">
                    <Award className="w-4 h-4 text-[#0CC5BA] mr-1" />
                    <span className="text-xs font-medium">Level {user?.level || 1}</span>
                  </div>
                  <div className="flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <Zap className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-xs font-medium">{user?.experiencePoints || 0} XP</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* User stats summary with enhanced visual design */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 grid grid-cols-3 gap-2 bg-white/50 backdrop-blur-lg p-4 rounded-2xl border border-white/20 shadow-sm"
            >
              <div className="text-center group">
                <div className="w-8 h-8 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center mx-auto mb-1 group-hover:bg-[#0CC5BA]/20 transition-colors">
                  <Ruler className="w-4 h-4 text-[#0CC5BA]" />
                </div>
                <div className="font-medium text-gray-900">{profile?.height || 0}</div>
                <div className="text-xs text-gray-500">Height (cm)</div>
              </div>
              <div className="text-center border-x border-gray-100 group">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-1 group-hover:bg-blue-500/20 transition-colors">
                  <Scale className="w-4 h-4 text-blue-500" />
                </div>
                <div className="font-medium text-gray-900">{profile?.currentWeight || 0}</div>
                <div className="text-xs text-gray-500">Weight (kg)</div>
              </div>
              <div className="text-center group">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-1 group-hover:bg-purple-500/20 transition-colors">
                  <Dumbbell className="w-4 h-4 text-purple-500" />
                </div>
                <div className="font-medium text-gray-900">{profile?.proteinGoal || 0}g</div>
                <div className="text-xs text-gray-500">Protein Goal</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced main content with tabs */}
        <Tabs defaultValue="nutrition" className="mb-8 relative z-30">
          <TabsList className="grid grid-cols-3 mb-6 bg-white/60 backdrop-blur-lg p-1 rounded-xl border border-white/30">
            <TabsTrigger value="metrics" className="data-[state=active]:bg-[#0CC5BA]/10 data-[state=active]:text-[#0CC5BA] rounded-lg">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>Metrics</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Goals</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500 rounded-lg">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                <span>Nutrition</span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          {/* Metrics Tab */}
          <TabsContent value="metrics" className="mt-0">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                  Body Metrics
                </h3>
                <Button size="icon" variant="outline" className="rounded-full h-8 w-8 border-[#0CC5BA]/30 hover:bg-[#0CC5BA]/10 hover:border-[#0CC5BA]">
                  <Edit2 className="h-4 w-4 text-[#0CC5BA]" />
                </Button>
              </div>
              
              <Card className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <div className="p-5 group hover:bg-[#0CC5BA]/5 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center group-hover:bg-[#0CC5BA]/20 transition-colors duration-300">
                          <Ruler className="w-5 h-5 text-[#0CC5BA]" />
                        </div>
                        <span className="font-medium text-gray-700">Height</span>
                      </div>
                      <div className="pl-14">
                        <div className="text-3xl font-bold text-gray-900">
                          {profile?.height ? `${profile.height}` : '0'}
                          <span className="text-sm font-normal text-gray-500 ml-1">cm</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 group hover:bg-blue-500/5 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-300">
                          <Scale className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-700">Current Weight</span>
                      </div>
                      <div className="pl-14">
                        <div className="text-3xl font-bold text-gray-900">
                          {profile?.currentWeight ? `${profile.currentWeight}` : '0'}
                          <span className="text-sm font-normal text-gray-500 ml-1">kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="mt-0">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                  Goals & Activity
                </h3>
                <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="outline" className="rounded-full h-8 w-8 border-[#0CC5BA]/30 hover:bg-[#0CC5BA]/10 hover:border-[#0CC5BA]">
                      <Edit2 className="h-4 w-4 text-[#0CC5BA]" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] w-[90vw] dialog-top-positioned">
                    <DialogHeader>
                      <DialogTitle>Edit Goals & Activity</DialogTitle>
                      <DialogDescription>
                        Update your weight goals and activity level to get personalized recommendations.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label htmlFor="weightGoal">Weight Goal</Label>
                        <Select value={weightGoal} onValueChange={setWeightGoal}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your weight goal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="loss">Weight Loss</SelectItem>
                            <SelectItem value="maintain">Maintain Weight</SelectItem>
                            <SelectItem value="gain">Weight Gain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="goalWeight">Goal Weight (kg)</Label>
                        <Input 
                          id="goalWeight"
                          type="number"
                          min="1"
                          value={goalWeight}
                          onChange={(e) => setGoalWeight(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="activityLevel">Poziom aktywności</Label>
                        <Select value={activityLevel} onValueChange={setActivityLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz poziom aktywności" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sedentary">Siedzący tryb życia (brak ćwiczeń)</SelectItem>
                            <SelectItem value="Light">Lekka aktywność (1-3 dni w tygodniu)</SelectItem>
                            <SelectItem value="Moderate">Umiarkowana aktywność (3-5 dni w tygodniu)</SelectItem>
                            <SelectItem value="Active">Wysoka aktywność (6-7 dni w tygodniu)</SelectItem>
                            <SelectItem value="Very Active">Bardzo aktywny (2x dziennie)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:opacity-90"
                        onClick={async () => {
                          try {
                            // Direct API call to ensure weight goals and activity level are updated
                            try {
                              const response = await fetch('/api/user/profile', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  goalWeight: parseFloat(goalWeight),
                                  weightGoal: weightGoal,
                                  activityLevel: activityLevel
                                }),
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to update goals and activity');
                              }
                            } catch (error) {
                              console.error('Error updating goals and activity:', error);
                              throw error;
                            }
                            
                            await refetchProfile();
                            
                            toast({
                              title: "Goals updated",
                              description: "Your goals and activity level have been updated."
                            });
                            
                            setGoalsDialogOpen(false);
                          } catch (error) {
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Failed to update goals. Please try again."
                            });
                          }
                        }}
                      >
                        Save changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <div className="p-5 group hover:bg-[#0CC5BA]/5 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center group-hover:bg-[#0CC5BA]/20 transition-colors duration-300">
                          <Target className="w-5 h-5 text-[#0CC5BA]" />
                        </div>
                        <span className="font-medium text-gray-700">Weight Goal</span>
                      </div>
                      <div className="pl-14">
                        {profile?.weightGoal ? (
                          <div>
                            <div className="text-xl font-bold capitalize text-gray-900">
                              {profile.weightGoal} weight
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Target: {profile.goalWeight} kg
                            </div>
                          </div>
                        ) : (
                          <div className="text-lg text-gray-500">Not set</div>
                        )}
                      </div>
                    </div>
                    <div className="p-5 group hover:bg-blue-500/5 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-300">
                          <Activity className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-700">Poziom aktywności</span>
                      </div>
                      <div className="pl-14">
                        <div className="text-xl font-bold text-gray-900">
                          {profile?.activityLevel ? getActivityLevelInPolish(profile.activityLevel) : 'Nie ustawiono'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {profile?.activityLevel ? getActivityLevelDescription(profile.activityLevel) : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="mt-0">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                  Nutritional Goals
                </h3>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setNutritionDialogOpen(true)}
                  className="rounded-full h-12 w-12 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500 shadow-sm"
                >
                  <Edit2 className="h-4 w-4 text-purple-500" />
                </Button>


              </div>
              
              <Card className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl overflow-hidden mb-5 relative z-10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <Star className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Daily Calorie Goal</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                        {profile?.caloriesGoal || 0} 
                        <span className="text-base font-normal text-gray-500 ml-1">kcal</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 mt-6">
                    <div className="bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 rounded-xl p-3 text-center">
                      <div className="text-sm text-gray-500 mb-2">Protein</div>
                      <div className="text-lg font-bold text-gray-900">
                        {profile?.proteinGoal && profile?.caloriesGoal ? 
                          Math.round((profile.proteinGoal / 100) * profile.caloriesGoal / 4) : 0}
                        <span className="text-xs font-normal ml-1">g</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl p-3 text-center">
                      <div className="text-sm text-gray-500 mb-2">Carbs</div>
                      <div className="text-lg font-bold text-gray-900">
                        {profile?.carbsGoal && profile?.caloriesGoal ? 
                          Math.round((profile.carbsGoal / 100) * profile.caloriesGoal / 4) : 0}
                        <span className="text-xs font-normal ml-1">g</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl p-3 text-center">
                      <div className="text-sm text-gray-500 mb-2">Fat</div>
                      <div className="text-lg font-bold text-gray-900">
                        {profile?.fatGoal && profile?.caloriesGoal ? 
                          Math.round((profile.fatGoal / 100) * profile.caloriesGoal / 9) : 0}
                        <span className="text-xs font-normal ml-1">g</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Macro ratio bar */}
                  <div className="mt-8">
                    <div className="text-sm text-gray-500 mb-2">Macronutrient Ratio</div>
                    <div className="h-4 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#0CC5BA]"
                        style={{ 
                          width: `${profile?.proteinGoal && profile?.carbsGoal && profile?.fatGoal ? 
                            (Number(profile.proteinGoal) * 100) / (Number(profile.proteinGoal) + Number(profile.carbsGoal) + Number(profile.fatGoal)) : 33}%` 
                        }}
                      ></div>
                      <div
                        className="bg-blue-500"
                        style={{ 
                          width: `${profile?.proteinGoal && profile?.carbsGoal && profile?.fatGoal ? 
                            (Number(profile.carbsGoal) * 100) / (Number(profile.proteinGoal) + Number(profile.carbsGoal) + Number(profile.fatGoal)) : 33}%` 
                        }}
                      ></div>
                      <div
                        className="bg-purple-500"
                        style={{ 
                          width: `${profile?.proteinGoal && profile?.carbsGoal && profile?.fatGoal ? 
                            (Number(profile.fatGoal) * 100) / (Number(profile.proteinGoal) + Number(profile.carbsGoal) + Number(profile.fatGoal)) : 34}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex text-xs justify-between mt-1">
                      <span className="text-[#0CC5BA]">Protein</span>
                      <span className="text-blue-500">Carbs</span>
                      <span className="text-purple-500">Fat</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>
        </Tabs>

        {recentMeals && recentMeals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-6">
              Recent Meals
            </h3>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
                {recentMeals.map((meal, index) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex-shrink-0 w-64"
                  >
                    <Link href={`/meal/${meal.id}`}>
                      <Card className="overflow-hidden group cursor-pointer bg-white/70 backdrop-blur-md border border-white/30 shadow-sm hover:shadow-lg rounded-xl hover:border-[#0CC5BA]/20 transition-all duration-300">
                        <div className="p-4 flex items-center gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#0CC5BA]/20 to-blue-500/20 flex-shrink-0 shadow-sm">
                            {meal.imageUrl ? (
                              <img
                                src={meal.imageUrl}
                                alt={meal.name}
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10">
                                <Clock className="w-8 h-8 text-[#0CC5BA] group-hover:scale-110 transition-transform duration-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate group-hover:text-[#0CC5BA] transition-colors">
                              {meal.name}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {meal.description || 'No description'}
                            </p>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center group-hover:bg-[#0CC5BA]/20 transition-colors">
                            <ChevronRight className="w-4 h-4 text-[#0CC5BA] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Logout Button - With padding to ensure it's not covered by bottom nav */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-24 mt-12" // Added extra bottom margin to avoid being covered by bottom nav
        >
          <Card className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl overflow-hidden mb-6">
            <div className="p-5 space-y-5">
              {/* Privacy Policy */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-900">Privacy Policy</div>
                    <div className="text-sm text-gray-500">View our privacy policy</div>
                  </div>
                </div>
                <Link href="/privacy">
                  <Button
                    variant="ghost"
                    className="text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    View
                  </Button>
                </Link>
              </div>
              
              {/* Log Out */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-900">Account</div>
                    <div className="text-sm text-gray-500">Sign out from your account</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={async () => {
                    try {
                      await logout();
                      // Explicitly navigate to auth page after logout
                      window.location.href = '/auth';
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to log out",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Log out
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Nutrition Goals Modal - positioned at top level */}
      {nutritionDialogOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-xl shadow-2xl border-2 w-full max-w-[420px] max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                Edit Nutritional Goals
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setNutritionDialogOpen(false)}
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="calories" className="flex items-center gap-2 text-base">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <Star className="h-3 w-3 text-purple-500" />
                  </div>
                  Daily Calorie Goal
                </Label>
                <Input 
                  id="calories"
                  type="number"
                  min="500"
                  max="5000"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="h-12 text-base shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter calories"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 1500-2500 kcal for most adults</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="protein" className="flex items-center gap-2 text-base">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                    <Activity className="h-3 w-3 text-red-500" />
                  </div>
                  Daily Protein (g)
                </Label>
                <Input 
                  id="protein"
                  type="number"
                  min="0"
                  max="500"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="h-12 text-base shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter protein in grams"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 50-100g for most adults</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="carbs" className="flex items-center gap-2 text-base">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-orange-500" />
                  </div>
                  Daily Carbs (g)
                </Label>
                <Input 
                  id="carbs"
                  type="number"
                  min="0"
                  max="800"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="h-12 text-base shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter carbs in grams"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 225-325g for most adults</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fat" className="flex items-center gap-2 text-base">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <Heart className="h-3 w-3 text-green-500" />
                  </div>
                  Daily Fat (g)
                </Label>
                <Input 
                  id="fat"
                  type="number"
                  min="0"
                  max="300"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="h-12 text-base shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter fat in grams"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 44-78g for most adults</p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end p-6 border-t">
              <Button 
                type="submit"
                onClick={async () => {
                  try {
                    const nutritionData = {
                      caloriesGoal: parseInt(calories),
                      proteinGoal: parseInt(protein),
                      carbsGoal: parseInt(carbs),
                      fatGoal: parseInt(fat)
                    };
                    
                    const response = await fetch('/api/user/profile', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(nutritionData),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to update nutritional goals');
                    }
                    
                    await refetchProfile();
                    
                    toast({
                      title: "Success",
                      description: "Nutritional goals updated successfully!"
                    });
                    
                    setNutritionDialogOpen(false);
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Failed to update nutritional goals. Please try again."
                    });
                  }
                }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 text-white font-medium h-12 px-8 shadow-md shadow-purple-500/20"
              >
                <Save className="mr-2 h-5 w-5" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}