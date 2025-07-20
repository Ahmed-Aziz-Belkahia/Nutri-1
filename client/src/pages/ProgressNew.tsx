import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useProgressPhotos } from '@/hooks/use-progress-photos';
import { useTranslation } from 'react-i18next';
import { useBodyAnalysis } from '@/hooks/use-body-analysis';

import { useWeightLogs } from '@/hooks/use-weight-logs';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import WeightLogWidget from '@/components/WeightLogWidget';
import HeightLogWidget from '@/components/HeightLogWidget';
import BodyFatCheckWidget from '@/components/BodyFatCheckWidget';
import BodyFatPercentageWidget from '@/components/BodyFatPercentageWidget';
import ProgressPhotoUploader from '@/components/ProgressPhotoUploader';
import {
  Scale,
  Activity,
  Camera,
  Clock,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Ruler,
  Loader2,
  Plus,
  Info,
  Home,
  Percent,
  X
} from 'lucide-react';

// iOS-style custom icons
const MetricsIcon = () => (
  <div className="relative">
    <Scale className="w-6 h-6" />
    <motion.div 
      animate={{ y: [0, -2, 0] }} 
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm flex items-center justify-center"
    >
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
    </motion.div>
  </div>
);

const AnalysisIcon = () => (
  <div className="relative">
    <Activity className="w-6 h-6" />
    <motion.div 
      animate={{ scale: [1, 1.2, 1] }} 
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm flex items-center justify-center"
    >
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
    </motion.div>
  </div>
);

const PhotosIcon = () => (
  <div className="relative">
    <Camera className="w-6 h-6" />
    <motion.div 
      animate={{ opacity: [1, 0.5, 1] }} 
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm flex items-center justify-center"
    >
      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
    </motion.div>
  </div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ProgressNew() {
  const { toast } = useToast();
  const { user } = useUser();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const { analyzeBody, updateProfileWithBodyFat, isLoading: isAnalysisLoading } = useBodyAnalysis();

  const [currentSection, setCurrentSection] = useState(0);
  const [location, setLocation] = useLocation();
  const { weightLogs } = useWeightLogs();
  const { photos, updatePhotoType, isLoading: photosLoading } = useProgressPhotos();
  
  // Body fat analysis states
  const [showBodyFatDialog, setShowBodyFatDialog] = useState(false);
  const [bodyFatAnalysis, setBodyFatAnalysis] = useState<any>(null);
  const [isMarkingPhoto, setIsMarkingPhoto] = useState(false);
  
  // Check for section parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const sectionParam = params.get('section');
    if (sectionParam === 'photos') {
      setCurrentSection(2); // Photos section
    } else if (sectionParam === 'body') {
      setCurrentSection(1); // Body analysis section
    } else if (sectionParam === 'metrics') {
      setCurrentSection(0); // Metrics section
    }
  }, [location]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  
  // Handle clicks outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user information
  const username = user?.email ? user.email.split('@')[0] : 'User';
  const userInitial = username.charAt(0).toUpperCase();

  // Fetch the user's profile data
  const { data: userProfile, isLoading: profileLoading, refetch: refetchUserProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Get weight and height from user profile
  const currentWeight = userProfile?.currentWeight 
    ? parseFloat(userProfile.currentWeight.toString()) 
    : (user?.profile?.weight ? parseFloat(user.profile.weight.toString()) : 0);
    
  const height = userProfile?.height 
    ? parseFloat(userProfile.height.toString()) 
    : (user?.profile?.height ? parseFloat(user.profile.height.toString()) : 0);

  // Calculate BMI with real-time values
  const calculateBMI = (weight: number, height: number): string => {
    if (!weight || !height || weight <= 0 || height <= 0) return "0";
    const heightInMeters = height / 100;
    const bmiValue = weight / (heightInMeters * heightInMeters);
    // Guard against NaN or Infinity
    if (isNaN(bmiValue) || !isFinite(bmiValue)) return "0";
    return bmiValue.toFixed(1);
  };
  
  // Use state to ensure BMI updates when profile changes
  const [bmiValue, setBmiValue] = useState<string>("0");
  
  // Update BMI whenever user profile, weight or height changes
  useEffect(() => {
    if (userProfile) {
      const newBmi = calculateBMI(currentWeight, height);
      setBmiValue(newBmi);
    }
  }, [userProfile, currentWeight, height]);
  
  const bmi = bmiValue;

  const progressSections = [
    { 
      id: "metrics", 
      title: t('progress.bodyMetrics'),
      icon: <MetricsIcon />
    },
    { 
      id: "body", 
      title: t('progress.bodyAnalysis'),
      icon: <AnalysisIcon />
    },
    { 
      id: "photos", 
      title: t('progress.progressPhotos'),
      icon: <PhotosIcon />
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again.",
      });
    }
  };

  if (profileLoading || photosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#0CC5BA]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f9] to-[#eef4ff] relative overflow-hidden">
      {/* iOS-style full-screen photo dialog */}
      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
        <DialogContent className="sm:max-w-[90vw] h-[90vh] p-0 border-0 bg-white/95 shadow-xl backdrop-blur-lg" aria-describedby="photo-dialog-description">
          <DialogTitle className="sr-only">Progress Photo</DialogTitle>
          <div className="sr-only" id="photo-dialog-description">Progress photo full-screen view</div>
          <div className="relative flex flex-col items-center justify-center w-full h-full rounded-2xl">
            <div className="absolute top-0 inset-x-0 pt-3 px-4 flex justify-between items-center bg-gradient-to-b from-black/30 to-transparent z-10 h-16">
              <div className="text-lg font-medium text-white drop-shadow-sm">
                {selectedPhotoUrl && 
                  new Date(photos.find(p => p.photoUrl === selectedPhotoUrl)?.createdAt || '').toLocaleDateString()
                }
              </div>
              <DialogClose className="rounded-full p-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-200">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
            
            {selectedPhotoUrl && (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                src={selectedPhotoUrl}
                alt="Progress Photo"
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            )}
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full h-1.5 w-1/3 bg-white/90 shadow-inner"></div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Enhanced background pattern with grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }}></div>
      
      {/* Enhanced colorful abstract shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/10 to-blue-500/5 filter blur-3xl -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-500/10 to-teal-400/5 filter blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-emerald-500/10 to-cyan-400/5 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-pink-500/10 to-orange-400/5 filter blur-3xl" />
      
      {/* Main content container */}
      <div className="max-w-[600px] mx-auto relative z-10 pt-6 px-4">
        {/* Enhanced header with glass-morphism effect */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 w-full bg-white/70 backdrop-blur-lg z-10 border border-white/30 p-5 rounded-2xl mb-6 shadow-lg shadow-black/5"
        >
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent truncate"
              >
                NutriAI
              </motion.h1>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-sm sm:text-base text-gray-600 truncate font-medium">
                  {t('progress.subtitle')}
                </span>
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative group"
              ref={dropdownRef}
            >
              <div className="relative">
                <button
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0CC5BA] to-[#0C9CCC] flex items-center justify-center text-white text-xl font-semibold hover:shadow-lg hover:from-[#0BB5AA] hover:to-[#0B8CBC] transition-all duration-300 overflow-hidden shadow-md"
                  onClick={() => setLocation('/profile')}
                >
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </motion.header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pb-24 mx-auto"
        >
          {/* Enhanced modern card grid for progress sections */}
          <div className="w-full px-4 mb-8">
            <div className="grid grid-cols-3 gap-5 max-w-[520px] mx-auto">
              {progressSections.map((section, index) => (
                <motion.button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative rounded-2xl overflow-hidden h-[110px] shadow-lg transition-all duration-300 ${
                    index === currentSection 
                      ? 'ring-3 ring-offset-2 ring-[#0CC5BA]/80' 
                      : 'ring-0'
                  }`}
                >
                  {/* Enhanced background gradient */}
                  <div className={`absolute inset-0 ${
                    index === 0 
                      ? 'bg-gradient-to-br from-[#0CC5BA] via-[#20c9be] to-[#4CC9C0]' 
                      : index === 1 
                        ? 'bg-gradient-to-br from-[#4361ee] via-[#4055e5] to-[#3f37c9]'
                        : 'bg-gradient-to-br from-[#8338ec] via-[#7a2be2] to-[#7209b7]'
                  }`}></div>
                  
                  {/* Enhanced pattern overlay */}
                  <div className="absolute inset-0 opacity-10" 
                    style={{ 
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1.5\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1.5\'/%3E%3C/g%3E%3C/svg%3E")'
                    }}
                  ></div>
                  
                  {/* Add subtle animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-40"></div>
                  
                  {/* Animated dot pattern for selected state */}
                  {index === currentSection && (
                    <motion.div 
                      className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-white/10"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                      }}
                      transition={{ 
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <div className="relative h-full flex flex-col items-center justify-center text-white p-3">
                    <motion.div 
                      className="mb-2 bg-white/20 p-2.5 rounded-full backdrop-blur-sm shadow-xl"
                      animate={index === currentSection ? { 
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 0 0 rgba(255,255,255,0.3)",
                          "0 0 20px rgba(255,255,255,0.5)",
                          "0 0 0 rgba(255,255,255,0.3)"
                        ]
                      } : {}}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut"
                      }}
                    >
                      {section.icon}
                    </motion.div>
                    <span className="text-sm font-semibold text-white drop-shadow-md">
                      {section.title}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Enhanced Body Metrics Card */}
          {currentSection === 0 && (
            <Card className="overflow-hidden rounded-3xl border-0 shadow-xl mb-6 bg-gradient-to-b from-white to-teal-50/30">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-7">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-[#0CC5BA] text-white shadow-lg">
                    <Scale className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('progress.bodyMetrics')}</h3>
                    <p className="text-sm text-gray-600">{t('progress.trackMeasurements')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 mb-7">
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <Scale className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{t('progress.currentWeight')}</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 ml-1 flex items-baseline">
                      {currentWeight} <span className="text-sm ml-1 text-gray-500">kg</span>
                    </div>
                    <div className="mt-2 h-1 bg-teal-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-[#0CC5BA] rounded-full w-full transform-gpu animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-600" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.5451 12.0022C13.5451 13.6469 12.1816 14.9868 10.5074 14.9868C8.83321 14.9868 7.46973 13.6469 7.46973 12.0022C7.46973 10.3575 8.83321 9.01758 10.5074 9.01758C12.1816 9.01758 13.5451 10.3575 13.5451 12.0022Z" fill="currentColor"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M10.5074 5.37207C6.15726 5.37207 2.63672 8.84154 2.63672 13.1301V17.0913C2.63672 17.7471 3.17038 18.2752 3.83289 18.2752H4.54777C5.21029 18.2752 5.74394 17.7471 5.74394 17.0913V13.1301C5.74394 10.5381 7.88077 8.43232 10.5074 8.43232C13.134 8.43232 15.2708 10.5381 15.2708 13.1301V17.0913C15.2708 17.7471 15.8045 18.2752 16.467 18.2752H17.1818C17.8444 18.2752 18.378 17.7471 18.378 17.0913V13.1301C18.378 8.84154 14.8575 5.37207 10.5074 5.37207Z" fill="currentColor"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-500">{t('progress.goalWeight')}</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 ml-1 flex items-baseline">
                      {userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : "--"} 
                      <span className="text-sm ml-1 text-gray-500">kg</span>
                    </div>
                    <div className="mt-2 h-1 bg-cyan-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" 
                          style={{ width: `${currentWeight && userProfile?.goalWeight ? 
                            Math.min(100, (currentWeight / parseFloat(userProfile.goalWeight.toString())) * 100) : 0}%` }}>
                      </div>
                    </div>
                  </div>
                </div>
                
                <WeightLogWidget 
                  currentWeight={currentWeight} 
                  goalWeight={userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : 0}
                  onWeightUpdate={(newWeight) => {
                    // This will trigger a refetch through React Query
                    toast({
                      title: t('progress.toast.weightUpdatedTitle'),
                      description: t('progress.toast.weightUpdatedDesc', { value: newWeight }),
                    });
                  }}
                />

                <div className="mt-7 border-t border-teal-100/50 pt-7">
                  <div className="grid grid-cols-2 gap-5 mb-6">
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Ruler className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-500">{t('progress.height')}</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 ml-1 flex items-baseline">
                        {height} <span className="text-sm ml-1 text-gray-500">cm</span>
                      </div>
                      <div className="mt-2 h-1 bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full w-3/4"></div>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-500">{t('progress.bmi')}</span>
                        </div>
                        <div className="text-xs py-1 px-2 rounded-full bg-orange-100 text-orange-700 font-medium truncate max-w-[110px]">
                          {parseFloat(bmi) < 18.5 ? "Underweight" : 
                           parseFloat(bmi) < 25 ? "Normal" : 
                           parseFloat(bmi) < 30 ? "Overweight" : "Obese"}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 ml-1">{bmi}</div>
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" 
                            style={{ 
                              width: `${Math.min(100, Math.max(0, parseFloat(bmi) * 2.5))}%`,
                              background: parseFloat(bmi) < 18.5 ? "#3b82f6" : 
                                          parseFloat(bmi) < 25 ? "#10b981" : 
                                          parseFloat(bmi) < 30 ? "#f59e0b" : "#ef4444"
                            }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <HeightLogWidget 
                    currentHeight={height} 
                    onHeightUpdate={(newHeight) => {
                      // This will trigger a refetch through React Query
                      toast({
                        title: t('progress.toast.heightUpdatedTitle'),
                        description: t('progress.toast.heightUpdatedDesc', { value: newHeight }),
                      });
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* The BodyFatCheckWidget component already includes its own dialog */}
          
          {/* Enhanced Body Analysis Card */}
          {currentSection === 1 && (
            <Card className="overflow-hidden rounded-3xl border-0 shadow-xl mb-6 bg-gradient-to-b from-white to-blue-50/30">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('progress.bodyAnalysis')}</h3>
                    <p className="text-sm text-gray-600">{t('progress.bodyComposition')}</p>
                  </div>
                </div>

                {/* Body metrics with improved visualization */}
                <div className="grid grid-cols-2 gap-5 mb-7">
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Ruler className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">BMI</span>
                      </div>
                      <div className="text-xs py-1 px-2 rounded-full bg-blue-100 text-blue-700 font-medium truncate max-w-[110px]">
                        {parseFloat(bmi) < 18.5 ? "Underweight" : 
                         parseFloat(bmi) < 25 ? "Normal" : 
                         parseFloat(bmi) < 30 ? "Overweight" : "Obese"}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 ml-1">{bmi}</div>
                    {/* Simple BMI visualization */}
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" 
                           style={{ 
                             width: `${Math.min(100, Math.max(0, parseFloat(bmi) * 2.5))}%`,
                             background: parseFloat(bmi) < 18.5 ? "#3b82f6" : 
                                         parseFloat(bmi) < 25 ? "#10b981" : 
                                         parseFloat(bmi) < 30 ? "#f59e0b" : "#ef4444"
                           }}></div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Percent className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{t('progress.bodyFat')}</span>
                      </div>
                      <div className="text-xs py-1 px-2 rounded-full bg-purple-100 text-purple-700 font-medium truncate max-w-[110px]">
                        {userProfile?.bodyFatPercentage ? 
                          (parseFloat(userProfile.bodyFatPercentage.toString()) < 10 ? "Very Low" :
                           parseFloat(userProfile.bodyFatPercentage.toString()) < 15 ? "Athletic" :
                           parseFloat(userProfile.bodyFatPercentage.toString()) < 20 ? "Fitness" :
                           parseFloat(userProfile.bodyFatPercentage.toString()) < 25 ? "Average" : "Above Average")
                          : "--"}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {userProfile?.bodyFatPercentage ? parseFloat(userProfile.bodyFatPercentage.toString()).toFixed(1) : "--"}
                      <span className="text-lg ml-1 text-gray-500">%</span>
                    </div>
                    {/* Body fat percentage visualization */}
                    {userProfile?.bodyFatPercentage && (
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full" 
                             style={{ width: `${Math.min(100, Math.max(0, parseFloat(userProfile.bodyFatPercentage.toString()) * 2.5))}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Body type and status */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 mb-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{t('progress.bodyType')}</h4>
                      <p className="text-xs text-gray-500">{t('progress.bodyTypeDescription')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 px-2 py-4">
                    <div className={`flex flex-col items-center ${userProfile?.bodyType === 'Ectomorph' ? 'opacity-100 scale-110' : 'opacity-60'} transition-all duration-300`}>
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <svg viewBox="0 0 24 24" width="28" height="28" className="text-blue-600">
                          <path fill="currentColor" d="M12,3C11.45,3 11,3.45 11,4V5H10V6H11V20A2,2 0 0,0 13,22A2,2 0 0,0 15,20V6H16V5H15V4C15,3.45 14.55,3 14,3H12Z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">Ectomorph</span>
                    </div>
                    
                    <div className={`flex flex-col items-center ${userProfile?.bodyType === 'Mesomorph' ? 'opacity-100 scale-110' : 'opacity-60'} transition-all duration-300`}>
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <svg viewBox="0 0 24 24" width="32" height="32" className="text-green-600">
                          <path fill="currentColor" d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14V9H13V11H14V13H13V15H14V17H13V19H14A1,1 0 0,1 15,20A1,1 0 0,1 14,21H10A1,1 0 0,1 9,20A1,1 0 0,1 10,19H11V17H10V15H11V13H10V11H11V9H10V7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M12,3A1,1 0 0,0 11,4A1,1 0 0,0 12,5A1,1 0 0,0 13,4A1,1 0 0,0 12,3Z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">Mesomorph</span>
                    </div>
                    
                    <div className={`flex flex-col items-center ${userProfile?.bodyType === 'Endomorph' ? 'opacity-100 scale-110' : 'opacity-60'} transition-all duration-300`}>
                      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                        <svg viewBox="0 0 24 24" width="32" height="32" className="text-amber-600">
                          <path fill="currentColor" d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M15.5,8L17,10L19,11L16,12L15.5,14L14,12L11,11L12.5,9.5L15.5,8M8.5,8L10.5,9.5L12,11L9,12L8.5,14L6.5,12L4,11L6,10L8.5,8M12,14C13.1,14 14,14.9 14,16C14,17.1 13.1,18 12,18C10.9,18 10,17.1 10,16C10,14.9 10.9,14 12,14M8.5,18.5L10.5,20L12,21.5L9,22L8.5,24L6.5,22L4,21L6,20L8.5,18.5M15.5,18.5L17,20L19,21L16,22L15.5,24L14,22L11,21.5L12.5,20L15.5,18.5Z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700">Endomorph</span>
                    </div>
                  </div>
                  
                  <div className="text-center mt-2">
                    <span className="text-sm font-medium text-gray-600">Current: </span>
                    <span className="text-sm font-bold text-gray-900">{userProfile?.bodyType || "Not analyzed yet"}</span>
                  </div>
                </div>
                
                {/* Enhanced body analysis button */}
                <div className="mb-4">
                  <BodyFatCheckWidget
                    currentWeight={currentWeight}
                    height={height}
                    onBodyFatUpdate={(bodyFat) => {
                      console.log('Body fat percentage updated:', bodyFat);
                      // Explicitly refetch user profile data to update the UI
                      refetchUserProfile();
                    }}
                  />
                  
                  {!photos || photos.length === 0 ? (
                    <div className="mt-3 p-3 text-sm text-center text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-center mb-1">
                        <Info className="w-4 h-4 mr-1 text-amber-500" />
                        <span className="font-medium">{t('progress.noPhotosTitle')}</span>
                      </div>
                      <p className="text-xs">{t('progress.noPhotosForAnalysis')}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          )}

          {/* Enhanced Progress Photos */}
          {currentSection === 2 && (
            <>
              <Card className="overflow-hidden rounded-3xl border-2 border-purple-100/30 shadow-2xl shadow-purple-500/10 mb-6 bg-gradient-to-b from-white via-purple-50/20 to-teal-50/20 relative">
                {/* Subtle animated background elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-200/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-7">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{t('progress.progressPhotos')}</h3>
                      <p className="text-sm text-gray-600">{t('progress.visualTracking')}</p>
                    </div>
                  </div>

                  {photos && photos.length > 0 ? (
                    <div className="mb-7">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-gray-700 flex items-center">
                          <Camera className="w-4 h-4 mr-2 text-purple-500" />
                          {t('progress.yourPhotos')}
                          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            {photos.length}
                          </span>
                        </h4>
                        <div className="text-xs font-medium text-gray-500">
                          {t('progress.tapToEnlarge')}
                        </div>
                      </div>
                      
                      {/* Photo grid with improved styling */}
                      <div className="grid grid-cols-2 gap-5 mb-6">
                        {photos.map((photo, index) => (
                          <motion.div
                            key={photo.id}
                            variants={itemVariants}
                            whileHover={{ 
                              scale: 1.03, 
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
                            }}
                            whileTap={{ scale: 0.97 }}
                            className="aspect-square relative overflow-hidden rounded-xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 group"
                            onClick={() => setSelectedPhotoUrl(photo.photoUrl)}
                          >
                            <img 
                              src={photo.photoUrl} 
                              alt={`Progress photo ${index + 1}`} 
                              className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
                            />
                            
                            {/* Enhanced photo overlay with metadata */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            {/* Type badge */}
                            <div className={`absolute top-3 right-3 px-2 py-1 backdrop-blur-sm text-xs font-medium rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                              photo.type === 'latest' 
                                ? 'bg-green-100/90 text-green-700' 
                                : photo.type === 'progress-now' 
                                  ? 'bg-blue-100/90 text-blue-700'
                                  : 'bg-gray-100/90 text-gray-700'
                            }`}>
                              {photo.type === 'latest' 
                                ? 'Latest' 
                                : photo.type === 'progress-now' 
                                  ? 'Analysis'
                                  : 'Archive'}
                            </div>
                            
                            {/* Bottom info */}
                            <div className="absolute bottom-0 inset-x-0 p-3">
                              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 shadow-lg">
                                <div className="text-xs font-medium text-white">
                                  {new Date(photo.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden">
                      {/* Enhanced empty state with animated background */}
                      <div className="flex flex-col items-center justify-center py-12 px-6 bg-gradient-to-br from-purple-50/80 via-white to-teal-50/80 backdrop-blur-sm rounded-3xl mb-7 border-2 border-purple-100/50 shadow-xl relative">
                        {/* Animated background elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/30 to-teal-200/30 rounded-full blur-xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-200/20 to-purple-200/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                        
                        {/* Main icon with enhanced styling */}
                        <div className="relative mb-6">
                          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-purple-500/20 transform rotate-3">
                            <Camera className="w-12 h-12 text-white" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-purple-400 flex items-center justify-center shadow-lg">
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        
                        {/* Enhanced text content */}
                        <div className="text-center space-y-3 relative z-10">
                          <h4 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
                            No Photos Yet
                          </h4>
                          <p className="text-gray-600 text-base max-w-sm leading-relaxed">
                            Take your first progress photo to start tracking your journey
                          </p>
                          
                          {/* Motivational badges */}
                          <div className="flex flex-wrap justify-center gap-2 mt-4">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Track Progress</span>
                            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">Stay Motivated</span>
                            <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">See Changes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced photo uploader with better styling */}
                  <div className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-3xl border-2 border-gray-100/50 shadow-xl p-6 relative overflow-hidden">
                    {/* Subtle background pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100/30 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-100/30 to-transparent rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-teal-500 text-white shadow-lg shadow-purple-500/20">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            Add New Photo
                          </h4>
                          <p className="text-sm text-gray-500 font-medium">
                            Capture your progress with a photo
                          </p>
                        </div>
                      </div>
                      
                      <ProgressPhotoUploader 
                        onPhotoAdded={() => {
                          toast({
                            title: "Photo Added!",
                            description: "Your progress photo has been saved successfully",
                          });
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </motion.main>
      </div>
    </div>
  );
}

function CustomLink(props: { href: string, className: string, children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { className, children, href } = props;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation(href);
  };
  
  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}