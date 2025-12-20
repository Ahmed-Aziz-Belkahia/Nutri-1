import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Camera, Target, Scale, Ruler, Edit2, Save, X, LogOut, Award, Utensils, Zap, Calendar, FileText, Trash2, Activity, Star, Loader2, Heart, Globe, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BaseLayout from "@/components/layouts/BaseLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { calculateDailyCalories, calculateMacros } from "@/lib/nutrition";

export default function Profile() {
  const { t } = useTranslation(['common']);
  const { user, isLoading: isLoadingUser, refetch: refetchUser, logout } = useUser();
  const { data: profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserProfile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Translate activity levels
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
  
  // Dialog states
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [weightGoal, setWeightGoal] = useState<string>(profile?.weightGoal || 'maintain');
  const [goalWeight, setGoalWeight] = useState<string>(profile?.goalWeight?.toString() || '70');
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activityLevel || 'Moderate');
  
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [height, setHeight] = useState<string>(profile?.height?.toString() || '170');
  const [currentWeight, setCurrentWeight] = useState<string>(profile?.currentWeight?.toString() || '70');
  const [age, setAge] = useState<string>(profile?.age?.toString() || '25');
  
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [calories, setCalories] = useState<string>((profile?.caloriesGoal || 2000).toString());
  const [protein, setProtein] = useState<string>(profile?.proteinGoal?.toString() || '150');
  const [carbs, setCarbs] = useState<string>(profile?.carbsGoal?.toString() || '250');
  const [fat, setFat] = useState<string>(profile?.fatGoal?.toString() || '70');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Auto-redirect after deletion
  useEffect(() => {
    if (showDeleteSuccess) {
      const t = setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [showDeleteSuccess]);
  
  // Update state when profile changes
  useEffect(() => {
    if (profile) {
      setWeightGoal(profile.weightGoal || 'maintain');
      setGoalWeight(profile.goalWeight?.toString() || '70');
      setActivityLevel(profile.activityLevel || 'Moderate');
      setHeight(profile.height?.toString() || '170');
      setCurrentWeight(profile.currentWeight?.toString() || '70');
      setAge(profile.age?.toString() || '25');
      
      const calorieGoal = profile.caloriesGoal || 2000;
      setCalories(calorieGoal.toString());
      
      const proteinGrams = Math.round((calorieGoal * (profile.proteinGoal || 30)) / 100 / 4);
      const carbsGrams = Math.round((calorieGoal * (profile.carbsGoal || 40)) / 100 / 4);
      const fatGrams = Math.round((calorieGoal * (profile.fatGoal || 30)) / 100 / 9);
      
      setProtein(proteinGrams.toString());
      setCarbs(carbsGrams.toString());
      setFat(fatGrams.toString());
    }
  }, [profile]);

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
          title: t('common:profileNew.toast.success'),
          description: t('common:profileNew.toast.profileUpdated'),
        });
      }
    } catch (error) {
      toast({
        title: t('common:profileNew.toast.error'),
        description: t('common:profileNew.toast.updateFailed'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      setShowDeleteSuccess(true);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('common:profileNew.toast.error'),
        description: t('common:profileNew.toast.deleteFailed'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingUser || isLoadingProfile) {
    return (
      <BaseLayout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
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
            <Loader2 className="h-8 w-8 text-[var(--color-primary)]" />
          </motion.div>
        </div>
      </BaseLayout>
    );
  }

  if (!user) {
    return (
      <BaseLayout showHeader={false}>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 p-8 rounded-xl glass-card"
          >
            <h2 className="text-2xl font-bold gradient-text">
              {t('common:profileNew.pleaseSignIn')}
            </h2>
            <p className="text-gray-600">{t('common:profileNew.needLogin')}</p>
            <Button
              onClick={() => setLocation("/auth")}
              className="bg-gradient-to-r from-[var(--color-primary)] to-blue-500 text-white hover:opacity-90"
            >
              {t('common:profileNew.signIn')}
            </Button>
          </motion.div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-4"
      >
        <div className="glass-card mb-6 p-6">
            <div className="flex items-center gap-4">
              {/* Profile Image */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative cursor-pointer"
                onClick={handleImageClick}
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-[var(--color-primary)]/20 to-blue-500/20 flex items-center justify-center group">
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">👤</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
                
                <div className="flex gap-2">
                  <div className="flex items-center px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                    <Award className="w-4 h-4 text-[var(--color-primary)] mr-1" />
                    <span className="text-xs font-medium">{t('common:profileNew.level')} {user?.level || 1}</span>
                  </div>
                  <div className="flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <Zap className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-xs font-medium">{user?.experiencePoints || 0} XP</span>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-2">
                <Ruler className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div className="text-lg font-bold text-gray-900">{profile?.height || 0}</div>
              <div className="text-xs text-gray-500">{t('common:profileNew.cm')}</div>
          </div>
          
          <div className="glass-card p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Scale className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">{profile?.currentWeight || 0}</div>
              <div className="text-xs text-gray-500">{t('common:profileNew.kg')}</div>
          </div>
          
          <div className="glass-card p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">{profile?.caloriesGoal || 0}</div>
              <div className="text-xs text-gray-500">{t('common:profileNew.kcal')}</div>
          </div>
        </div>
      </motion.div>

      {/* Body Metrics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold gradient-text">{t('common:profileNew.sections.bodyMetrics')}</h3>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={() => setMetricsDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>
        </div>
        
        <div className="glass-card">
          <div className="p-0 divide-y divide-gray-100">
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Ruler className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('common:profileNew.metrics.height')}</div>
                <div className="text-xl font-bold text-gray-900">{profile?.height || 0} {t('common:profileNew.cm')}</div>
              </div>
            </div>
            
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Scale className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('common:profileNew.metrics.currentWeight')}</div>
                <div className="text-xl font-bold text-gray-900">{profile?.currentWeight || 0} {t('common:profileNew.kg')}</div>
              </div>
            </div>
            
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('common:profileNew.metrics.age')}</div>
                <div className="text-xl font-bold text-gray-900">{profile?.age || 0} {t('common:profileNew.years')}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Goals & Activity Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold gradient-text">{t('common:profileNew.sections.goalsActivity')}</h3>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={() => setGoalsDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>
        </div>
        
        <div className="glass-card">
          <div className="p-0 divide-y divide-gray-100">
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">Weight Goal</div>
                <div className="text-lg font-bold capitalize text-gray-900">
                  {profile?.weightGoal ? `${profile.weightGoal} weight` : 'Not set'}
                </div>
                {profile?.goalWeight && (
                  <div className="text-sm text-gray-500">Target: {profile.goalWeight} kg</div>
                )}
              </div>
            </div>
            
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('common:profileNew.goals.activityLevel')}</div>
                <div className="text-lg font-bold text-gray-900">
                  {profile?.activityLevel ? getActivityLevelInPolish(profile.activityLevel) : 'Not set'}
                </div>
                {profile?.activityLevel && (
                  <div className="text-sm text-gray-500">{getActivityLevelDescription(profile.activityLevel)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Nutrition Goals Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold gradient-text">{t('common:profileNew.sections.nutritionGoals')}</h3>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={() => setNutritionDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>
        </div>
        
        <div className="glass-card">
          <div className="p-6">
            {/* Daily Calorie Goal */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Daily Calorie Goal</div>
                <div className="text-2xl font-bold gradient-text">
                  {profile?.caloriesGoal || 0} <span className="text-sm">kcal</span>
                </div>
              </div>
            </div>
            
            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[var(--color-primary)]/5 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Protein</div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {profile?.proteinGoal && profile?.caloriesGoal ? 
                    Math.round((profile.proteinGoal / 100) * profile.caloriesGoal / 4) : 0}g
                </div>
              </div>
              <div className="bg-blue-500/5 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Carbs</div>
                <div className="text-lg font-bold text-blue-500">
                  {profile?.carbsGoal && profile?.caloriesGoal ? 
                    Math.round((profile.carbsGoal / 100) * profile.caloriesGoal / 4) : 0}g
                </div>
              </div>
              <div className="bg-purple-500/5 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Fat</div>
                <div className="text-lg font-bold text-purple-500">
                  {profile?.fatGoal && profile?.caloriesGoal ? 
                    Math.round((profile.fatGoal / 100) * profile.caloriesGoal / 9) : 0}g
                </div>
              </div>
            </div>
            
            {/* Macro Ratio Bar */}
            <div>
              <div className="text-sm text-gray-500 mb-2">Macronutrient Ratio</div>
              <div className="h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-[var(--color-primary)]"
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
              <div className="flex text-xs justify-between mt-2">
                <span className="text-[var(--color-primary)]">{t('common:profileNew.macros.protein')}</span>
                <span className="text-blue-500">{t('common:profileNew.macros.carbs')}</span>
                <span className="text-purple-500">{t('common:profileNew.macros.fat')}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Language & Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold gradient-text">{t('common:profileNew.sections.languagePreferences')}</h3>
        </div>
        
        <div className="glass-card">
          <div className="p-6">
            <LanguageSwitcher variant="menu" />
          </div>
        </div>
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <div className="glass-card">
          <div className="p-0 divide-y divide-gray-100">
            <Link href="/privacy">
              <div className="p-4 flex items-center gap-3 active:bg-gray-50">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{t('common:profileNew.account.privacyPolicy')}</div>
                  <div className="text-sm text-gray-500">{t('common:profileNew.account.viewPrivacy')}</div>
                </div>
              </div>
            </Link>
            
            <div 
              className="p-4 flex items-center gap-3 active:bg-red-50 cursor-pointer"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{t('common:profileNew.account.deleteAccount')}</div>
                <div className="text-sm text-gray-500">{t('common:profileNew.account.deletePermanent')}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Nutrition Goals Modal */}
      {nutritionDialogOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-xl shadow-2xl border-2 w-full max-w-[420px] max-h-[80vh] overflow-y-auto">
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            className="fixed inset-0 z-[99998] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />

            <motion.div 
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16 }}
              className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-pink-500 to-[var(--color-primary)]" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                </div>
                <p className="text-gray-600 mb-6">This action is permanent. All your data will be removed.</p>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    className="h-11 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-11 bg-red-600 hover:bg-red-700 text-white"
                    onClick={async () => {
                      await handleDeleteAccount();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Success Modal */}
      <AnimatePresence>
        {showDeleteSuccess && (
          <motion.div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-white to-[var(--color-primary)]/30 backdrop-blur-xl" />

            <motion.div 
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 16 }}
              className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-pink-500 to-[var(--color-primary)]" />

              <div className="p-8 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-red-50 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-lg bg-red-200 animate-ping opacity-30" />
                    <Trash2 className="relative h-8 w-8 text-red-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Account deleted</h3>
                <p className="text-gray-600 mt-2">
                  Your account and all associated data were permanently removed.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3">
                  <Button
                    className="h-11 bg-gradient-to-r from-[var(--color-primary)] to-blue-500 text-white hover:opacity-90"
                    onClick={() => { window.location.href = '/'; }}
                  >
                    Go Home
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 text-gray-600 hover:text-gray-800"
                    onClick={() => { setShowDeleteSuccess(false); window.location.href = '/'; }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 text-xs text-gray-400">You'll be redirected home.</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals & Activity Modal - Modern Clean Design */}
      <AnimatePresence>
        {goalsDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1002]"
              onClick={() => setGoalsDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[1003]"
            >
              <div className="w-full md:max-w-lg md:mx-4">
                <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
                  {/* Handle bar for mobile */}
                  <div className="md:hidden flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                  </div>
                  
                  {/* Header */}
                  <div className="px-6 pt-4 pb-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Goals & Activity</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Personalize your nutrition plan</p>
                      </div>
                      <button
                        onClick={() => setGoalsDialogOpen(false)}
                        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Weight Goal Selection */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">What's your goal?</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'loss', label: 'Lose', icon: '📉', color: 'from-red-500 to-orange-400' },
                          { value: 'maintain', label: 'Maintain', icon: '⚖️', color: 'from-blue-500 to-cyan-400' },
                          { value: 'gain', label: 'Gain', icon: '📈', color: 'from-green-500 to-emerald-400' },
                        ].map((goal) => (
                          <button
                            key={goal.value}
                            type="button"
                            onClick={() => setWeightGoal(goal.value)}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                              weightGoal === goal.value
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="text-2xl mb-1">{goal.icon}</div>
                            <div className={`text-sm font-medium ${weightGoal === goal.value ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                              {goal.label}
                            </div>
                            {weightGoal === goal.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Target Weight */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">Target weight</label>
                      <div className="relative">
                        <Input 
                          type="number"
                          min="1"
                          value={goalWeight}
                          onChange={(e) => setGoalWeight(e.target.value)}
                          className="h-14 pl-4 pr-14 text-lg font-medium rounded-xl border-gray-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] transition-all"
                          placeholder="70"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
                      </div>
                    </div>
                    
                    {/* Activity Level */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">Activity level</label>
                      <div className="space-y-2">
                        {[
                          { value: 'Sedentary', label: 'Sedentary', desc: 'Little or no exercise', emoji: '🧘' },
                          { value: 'Light', label: 'Light', desc: '1-3 days per week', emoji: '🚶' },
                          { value: 'Moderate', label: 'Moderate', desc: '3-5 days per week', emoji: '🏃' },
                          { value: 'Active', label: 'Active', desc: '6-7 days per week', emoji: '💪' },
                          { value: 'Very Active', label: 'Very Active', desc: 'Intense training 2x daily', emoji: '🏋️' },
                        ].map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setActivityLevel(level.value)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                              activityLevel === level.value
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <span className="text-xl">{level.emoji}</span>
                            <div className="flex-1">
                              <div className={`font-medium ${activityLevel === level.value ? 'text-[var(--color-primary)]' : 'text-gray-800'}`}>
                                {level.label}
                              </div>
                              <div className="text-xs text-gray-500">{level.desc}</div>
                            </div>
                            {activityLevel === level.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                    <button
                      onClick={async () => {
                        try {
                          // Map weightGoal to goalType format
                          let goalType: 'maintain' | 'lose' | 'gain' = 'maintain';
                          if (weightGoal === 'loss') goalType = 'lose';
                          else if (weightGoal === 'gain') goalType = 'gain';
                          
                          // Map activity level to lowercase format for calculation
                          const activityLevelLower = activityLevel.toLowerCase().replace(' ', '_');
                          
                          // Get current profile data for calculations
                          const age = profile?.age || 25;
                          const weight = profile?.currentWeight || 70;
                          const height = profile?.height || 170;
                          const gender = profile?.gender || 'male';
                          
                          // Recalculate calories and macros
                          const newCalories = calculateDailyCalories(
                            age,
                            weight,
                            height,
                            activityLevelLower,
                            goalType,
                            gender === 'male'
                          );
                          const newMacros = calculateMacros(newCalories, goalType);
                          
                          const response = await fetch('/api/user/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              goalWeight: parseFloat(goalWeight),
                              weightGoal: weightGoal,
                              activityLevel: activityLevel,
                              caloriesGoal: newCalories,
                              proteinGoal: Math.round((newMacros.protein * 4 / newCalories) * 100),
                              carbsGoal: Math.round((newMacros.carbs * 4 / newCalories) * 100),
                              fatGoal: Math.round((newMacros.fat * 9 / newCalories) * 100),
                            }),
                          });
                          if (!response.ok) throw new Error('Failed to update goals and activity');
                          await refetchProfile();
                          toast({ title: "Goals updated", description: "Your goals, activity level, and nutrition have been recalculated." });
                          setGoalsDialogOpen(false);
                        } catch (error) {
                          toast({ variant: "destructive", title: "Error", description: "Failed to update goals. Please try again." });
                        }
                      }}
                      className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] transition-all text-base shadow-lg shadow-[var(--color-primary)]/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Metrics Modal */}
      <AnimatePresence>
        {metricsDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1002]"
              onClick={() => !metricsLoading && setMetricsDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 flex items-center justify-center z-[1003] px-4"
            >
              <div className="w-full max-w-sm">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-blue-500 px-6 py-6 text-white">
                    <button
                      onClick={() => !metricsLoading && setMetricsDialogOpen(false)}
                      disabled={metricsLoading}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      >
                        <Ruler className="w-7 h-7 text-white" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold text-center">Edit Body Metrics</h3>
                    <p className="text-white/80 text-center text-sm mt-1">Update your physical measurements</p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="px-5 py-5 space-y-4">
                    {/* Height */}
                    <div className="space-y-1.5">
                      <Label htmlFor="height" className="text-gray-600 text-sm font-medium flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-[var(--color-primary)]" />
                        Height (cm)
                      </Label>
                      <Input 
                        id="height"
                        type="number"
                        min="50"
                        max="300"
                        inputMode="numeric"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        disabled={metricsLoading}
                        className="h-12 rounded-xl bg-gray-50/80 border-gray-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:bg-white transition-colors text-base font-medium"
                        placeholder="e.g., 175"
                      />
                    </div>
                    
                    {/* Weight */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currentWeight" className="text-gray-600 text-sm font-medium flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-500" />
                        Current Weight (kg)
                      </Label>
                      <Input 
                        id="currentWeight"
                        type="number"
                        min="20"
                        max="500"
                        step="0.1"
                        inputMode="decimal"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        disabled={metricsLoading}
                        className="h-12 rounded-xl bg-gray-50/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500 focus:bg-white transition-colors text-base font-medium"
                        placeholder="e.g., 70"
                      />
                    </div>
                    
                    {/* Age */}
                    <div className="space-y-1.5">
                      <Label htmlFor="age" className="text-gray-600 text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        Age (years)
                      </Label>
                      <Input 
                        id="age"
                        type="number"
                        min="1"
                        max="120"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        disabled={metricsLoading}
                        className="h-12 rounded-xl bg-gray-50/80 border-gray-200 focus:border-purple-500 focus:ring-purple-500 focus:bg-white transition-colors text-base font-medium"
                        placeholder="e.g., 25"
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="px-5 pb-5 pt-2">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setMetricsDialogOpen(false)}
                        disabled={metricsLoading}
                        className="flex-1 px-4 py-3.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all text-base disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          // Validate inputs
                          const heightNum = parseFloat(height);
                          const weightNum = parseFloat(currentWeight);
                          const ageNum = parseInt(age);
                          
                          if (isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
                            toast({ variant: "destructive", title: "Invalid height", description: "Please enter a valid height between 50-300 cm." });
                            return;
                          }
                          if (isNaN(weightNum) || weightNum < 20 || weightNum > 500) {
                            toast({ variant: "destructive", title: "Invalid weight", description: "Please enter a valid weight between 20-500 kg." });
                            return;
                          }
                          if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
                            toast({ variant: "destructive", title: "Invalid age", description: "Please enter a valid age between 1-120 years." });
                            return;
                          }
                          
                          setMetricsLoading(true);
                          try {
                            const response = await fetch('/api/user/profile', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                height: heightNum,
                                currentWeight: weightNum,
                                age: ageNum
                              }),
                            });
                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.message || 'Failed to update metrics');
                            }
                            await refetchProfile();
                            toast({ title: "✓ Metrics updated", description: "Your body metrics have been saved successfully." });
                            setMetricsDialogOpen(false);
                          } catch (error) {
                            console.error('Error updating metrics:', error);
                            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to update metrics. Please try again." });
                          } finally {
                            setMetricsLoading(false);
                          }
                        }}
                        disabled={metricsLoading}
                        className="flex-1 px-4 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-blue-500 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[var(--color-primary)]/25 text-base disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {metricsLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </BaseLayout>
  );
}



