import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useProgressPhotos } from '@/hooks/use-progress-photos';

import { useWeightLogs } from '@/hooks/use-weight-logs';
import { useAuth } from '@/hooks/use-auth';
import WeightLogWidget from '@/components/WeightLogWidget';
import HeightLogWidget from '@/components/HeightLogWidget';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import BaseLayout from '@/components/layouts/BaseLayout';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberWheel } from '@/components/NumberWheel';
import PullToRefresh from '@/components/PullToRefresh';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Camera,
  Upload,
  User,
  Settings,
  LogOut,
  Clock,
  Heart,
  Star,
  Trash2,
  Scale,
  Ruler,
  Activity,
  BarChart3,
  Trophy,
  X,
  Check,
  Download,
  Share,
  Image,
  Loader2
} from 'lucide-react';
import { Link } from 'wouter';



function CameraCapture({ onClose, onPhotoCapture }: { onClose: () => void; onPhotoCapture: (photoUrl: string) => Promise<void> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCaptureReady, setIsCaptureReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCaptureReady(true);
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    };
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCaptureReady || isProcessing) {
      console.log('Cannot capture photo - prerequisite check failed:', {
        hasVideoRef: !!videoRef.current,
        hasCanvasRef: !!canvasRef.current,
        isCaptureReady,
        isProcessing
      });
      return;
    }
    
    try {
      console.log('Starting photo capture process');
      setIsProcessing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        throw new Error('Canvas context unavailable');
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('Video frame drawn to canvas');
      
      // Convert canvas to data URL
      const photoUrl = canvas.toDataURL('image/jpeg', 0.9); // Added quality parameter
      console.log('Generated photo URL length:', photoUrl.length);
      
      if (photoUrl.length < 100) {
        console.error('Generated photo URL is too short, probably invalid');
        throw new Error('Invalid photo data generated');
      }
      
      // Pass photo to handler
      console.log('Sending photo to onPhotoCapture handler');
      await onPhotoCapture(photoUrl);
      console.log('Photo capture process completed successfully');
    } catch (err) {
      console.error("Error capturing photo: ", err);
    } finally {
      setIsProcessing(false);
    }
  }, [isCaptureReady, isProcessing, onPhotoCapture]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="relative max-w-md w-full mx-auto p-4">
        <Button
          variant="ghost"
          className="absolute top-4 right-4 bg-black/40 text-white hover:bg-black/60 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="relative aspect-[3/4] overflow-hidden bg-black rounded-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 pb-8 flex justify-center">
            <Button
              className="w-16 h-16 rounded-full bg_white shadow-lg border-2 border-gray-200"
              disabled={!isCaptureReady || isProcessing}
              onClick={capturePhoto}
            >
              {isProcessing ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0CC5BA]" />
              )}
            </Button>
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { weightLogs, addWeightLog } = useWeightLogs();

  const { photos, addPhoto, deletePhoto, isLoading: photosLoading, hasUploadedToday, todayPhoto, replacePhoto, isAddingPhoto, isReplacingPhoto } = useProgressPhotos();
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const isUploadingPhoto = isAddingPhoto || isReplacingPhoto;
  
  // Pull to refresh setup
  const handleRefresh = usePullToRefresh([
    ['/api/progress-photos'],
    ['/api/weight-logs'],
    ['/api/user/profile']
  ]);
  
  // Debug logs to track the state
  useEffect(() => {
    console.log('Progress page state:', {
      hasUploadedToday,
      todayPhoto,
      photosCount: photos?.length || 0,
      isUploadingPhoto
    });
  }, [hasUploadedToday, todayPhoto, photos, isUploadingPhoto]);
  
  useEffect(() => {
    console.log('Progress photos from hook:', photos);
  }, [photos]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Gamification elements removed

  // Fetch the user's nutrition preferences
  const { data: userProfile } = useQuery({
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

  // Get weight and height from nutrition preferences (primary source)
  // Check console logs to debug data
  console.log('User profile from API:', userProfile);
  console.log('User object from context:', user);
  
  // More robust parsing with fallbacks and debug info
  let currentWeight = 0;
  if (userProfile?.currentWeight != null) {
    console.log('Using weight from userProfile:', userProfile.currentWeight);
    currentWeight = typeof userProfile.currentWeight === 'number'
      ? userProfile.currentWeight
      : parseFloat(String(userProfile.currentWeight));
  } else if (user?.profile?.weight != null) {
    console.log('Using weight from user.profile:', user?.profile?.weight);
    currentWeight = typeof user?.profile?.weight === 'number'
      ? (user?.profile?.weight as number)
      : parseFloat(String(user?.profile?.weight));
  }
  console.log('Final current weight:', currentWeight);
    
  // More robust height parsing
  let height = 0;
  if (userProfile?.height != null) {
    console.log('Using height from userProfile:', userProfile.height);
    height = typeof userProfile.height === 'number'
      ? userProfile.height
      : parseFloat(String(userProfile.height));
  } else if (user?.profile?.height != null) {
    console.log('Using height from user.profile:', user?.profile?.height);
    height = typeof user?.profile?.height === 'number'
      ? (user?.profile?.height as number)
      : parseFloat(String(user?.profile?.height));
  }
  console.log('Final height:', height);

  // Calculate BMI: weight (kg) / (height (m))^2
  const calculateBMI = (weight: number, height: number): string => {
    console.log('Calculating BMI with weight:', weight, 'and height:', height);
    if (!weight || !height || weight <= 0 || height <= 0) {
      console.log('Invalid weight or height values for BMI calculation');
      return "0";
    }
    
    // Convert height from cm to meters
    const heightInMeters = height / 100;
    console.log('Height in meters:', heightInMeters);
    
    const bmiValue = weight / (heightInMeters * heightInMeters);
    console.log('Calculated BMI:', bmiValue);
    
    // Guard against NaN or Infinity
    if (isNaN(bmiValue) || !isFinite(bmiValue)) {
      console.log('BMI calculation resulted in invalid value');
      return "0";
    }
    
    return bmiValue.toFixed(1);
  };

  // Initialize BMI value with state to allow updates
  const [bmiValue, setBmi] = useState<string>("0");
  
  // Update BMI when weight or height changes
  useEffect(() => {
    const newBmi = calculateBMI(currentWeight, height);
    console.log('Setting BMI value to:', newBmi);
    setBmi(newBmi);
  }, [currentWeight, height]);
  
  // Use the state variable for display
  const bmi = bmiValue;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const userInitial = user?.email ? user.email[0].toUpperCase() : "U";

  const progressSections = [
    {
      id: "metrics",
      title: "Weight & Metrics",
      description: "Track your body measurements",
      icon: <Scale className="w-8 h-8" />,
      gradient: "from-[#0CC5BA] to-blue-500",
    },
    {
      id: "body-composition",
      title: "Body Composition",
      description: "Analyze your body fat percentage",
      icon: <Activity className="w-8 h-8" />,
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      id: "photos",
      title: "Progress Photos",
      description: "Visual tracking of your journey",
      icon: <Camera className="w-8 h-8" />,
      gradient: "from-purple-500 to-pink-500",
    }
  ];

  // Photo handling functions

  const handleCameraOpen = () => {
    setIsCameraOpen(true);
  };

  const handlePhotoCapture = async (photoUrl: string) => {
    try {
      console.log('Starting photo capture process, photoUrl length:', photoUrl.length);
      console.log('PhotoUrl starts with:', photoUrl.substring(0, 30) + '...');
      console.log('Has uploaded today:', hasUploadedToday);
      console.log('Today photo:', todayPhoto);
      
      setCapturedImage(photoUrl);
      
      // Check if the photoUrl is valid (starts with data:image/)
      if (!photoUrl.startsWith('data:image/')) {
        console.error('Invalid photoUrl format, missing data:image/ prefix');
        throw new Error('Invalid photo format');
      }
      
      console.log('Photo format valid, sending to server...');
      
      // If user already uploaded today, replace the existing photo
      if (hasUploadedToday && todayPhoto) {
        console.log('Replacing existing photo with ID:', todayPhoto.id);
        const uploadResult = await replacePhoto({ 
          photoId: todayPhoto.id,
          photoUrl: photoUrl,
          type: "latest",
          caption: "Progress photo"
        });
        
        console.log('Photo successfully replaced on server, result:', uploadResult);
        
        toast({
          title: "Photo updated",
          description: "Your progress photo has been replaced successfully",
        });
      } else {
        // Otherwise, add a new photo
        console.log('Adding new photo');
        const uploadResult = await addPhoto({ 
          photoUrl: photoUrl,
          type: "latest",
          caption: "Progress photo"
        });
        
        console.log('Photo successfully saved to server, result:', uploadResult);
        
        toast({
          title: "Photo saved",
          description: "Your progress photo has been uploaded successfully",
        });
      }
      
      console.log('Photo operation completed, React Query will refresh automatically');
    } catch (error) {
      console.error('Error in handlePhotoCapture:', error);
      toast({
        title: "Error",
        description: "Failed to save photo",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    console.log('File selected for upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      console.log('File converted to base64, length:', base64String.length);
      
      try {
        // Check if the base64String is valid (starts with data:image/)
        if (!base64String.startsWith('data:image/')) {
          console.error('Invalid file format, missing data:image/ prefix');
          throw new Error('Invalid photo format');
        }
        
        console.log('File format valid, sending to server...');
        console.log('Has uploaded today:', hasUploadedToday);
        console.log('Today photo:', todayPhoto);
        
        // If user already uploaded today, replace the existing photo
        if (hasUploadedToday && todayPhoto) {
          console.log('Replacing existing photo with ID:', todayPhoto.id);
          await replacePhoto({
            photoId: todayPhoto.id,
            photoUrl: base64String,
            type: "latest",
            caption: "Uploaded photo"
          });
          
          console.log('Photo successfully replaced on server via upload');
          
          toast({
            title: "Photo updated",
            description: "Your progress photo has been replaced successfully",
          });
        } else {
          // Otherwise, add a new photo
          console.log('Adding new photo');
          await addPhoto({
            photoUrl: base64String,
            type: "latest",
            caption: "Uploaded photo"
          });
          
          console.log('Photo successfully saved to server via upload');
          
          toast({
            title: "Photo saved",
            description: "Your progress photo has been uploaded successfully",
          });
        }
      } catch (error) {
        console.error('Error in handlePhotoUpload:', error);
        toast({
          title: "Error",
          description: "Failed to save photo",
          variant: "destructive",
        });
      } finally {
        // Clear the file input to allow uploading the same file again if needed
        e.target.value = '';
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handlePhotoClick = (url: string) => {
    setSelectedPhotoUrl(url);
  };
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeletePhotoClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeletePhoto = async () => {
    if (!selectedPhotoUrl) return;
    
    try {
      console.log('Deleting photo:', selectedPhotoUrl);
      setIsDeletingPhoto(true);
      
      await deletePhoto(selectedPhotoUrl);
      
      toast({
        title: "Photo deleted",
        description: "Your progress photo has been deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedPhotoUrl(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPhoto(false);
    }
  };



  return (
    <BaseLayout onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Carousel navigation */}
        <div className="flex justify-between items-center mb-6 px-2">
          {progressSections.map((section, index) => (
              <div 
              key={section.id}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => setCurrentSection(index)}
            >
              <div 
                className={`w-12 h-12 flex items-center justify-center rounded-full 
                  shadow-md border ${index === currentSection ? 'border-white/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'border-white/20 bg-white/20 text-gray-700 backdrop-blur-xl'}`}
              >
                <span className="text-lg font-medium">{index + 1}</span>
              </div>
              <div className={`text-xs text-center ${index === currentSection ? 'font-medium text-emerald-600' : 'text-gray-600'}`}>
                {section.title.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
        
        {/* Progress indicator */}
        <div className="relative h-1 bg-white/30 backdrop-blur rounded-full mb-6 border border-white/20">
          <div 
            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentSection + 1) / progressSections.length) * 100}%` }}
          ></div>
        </div>
        
        {/* Current section content */}
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${progressSections[currentSection].gradient} text-white shadow-md`}>
              {progressSections[currentSection].icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{progressSections[currentSection].title}</h2>
              <p className="text-sm text-gray-500">{progressSections[currentSection].description}</p>
            </div>
          </div>
          
          {/* Section 1: Weight & Metrics */}
          {currentSection === 0 && (
            <div className="space-y-4">
              <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-white/20">
                    <Scale className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent">{t('common:progress.weightMetrics.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common:progress.weightMetrics.subtitle')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white/30 backdrop-blur rounded-xl border border-white/30">
                    <div className="text-sm text-gray-500">{t('common:progress.weightMetrics.current')}</div>
                    <div className="text-2xl font-bold">{currentWeight} {t('common:progress.weightMetrics.kg')}</div>
                  </div>
                  <div className="p-4 bg-white/30 backdrop-blur rounded-xl border border-white/30">
                    <div className="text-sm text-gray-500">{t('common:progress.weightMetrics.goal')}</div>
                    <div className="text-2xl font-bold">{userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : "--"} {t('common:progress.weightMetrics.kg')}</div>
                  </div>
                </div>
                
                <WeightLogWidget 
                  currentWeight={currentWeight}
                  goalWeight={userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : 0}
                  onWeightUpdate={(weight: number) => {
                    // Update local state to reflect the change
                    if (user && user.profile) {
                      user.profile.weight = weight;
                    }
                    
                    // Update BMI calculation with new weight
                    setBmi(calculateBMI(weight, height));
                  }}
                />
              </Card>
              
              <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-white/20">
                    <Activity className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent">{t('common:progress.bodyMetrics.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common:progress.bodyMetrics.subtitle')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white/30 backdrop-blur rounded-xl border border-white/30">
                    <div className="text-sm text-gray-500">{t('common:progress.bodyMetrics.bmi')}</div>
                    <div className="text-2xl font-bold">{bmi}</div>
                  </div>
                  <div className="p-4 bg-white/30 backdrop-blur rounded-xl border border-white/30">
                    <div className="text-sm text-gray-500">{t('common:progress.bodyMetrics.height')}</div>
                    <div className="text-2xl font-bold">{height} {t('common:progress.bodyMetrics.cm')}</div>
                  </div>
                </div>
                
                <HeightLogWidget
                  currentHeight={height}
                  onHeightUpdate={(updatedHeight: number) => {
                    // Update local state to reflect the change
                    if (user && user.profile) {
                      user.profile.height = updatedHeight;
                    }
                    
                    // Calculate new BMI with updated height
                    setBmi(calculateBMI(currentWeight, updatedHeight));
                  }}
                />
              </Card>
              

            </div>
          )}

          {/* Section 2: Body Composition */}
          {currentSection === 1 && (
            <div className="space-y-4">
              <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-white/20">
                    <Activity className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent">{t('common:progress.bodyComposition.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common:progress.bodyComposition.subtitle')}</p>
                  </div>
                </div>
                
                <div className="space-y-6 mt-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-500">{t('common:progress.bodyComposition.bmi')}</span>
                      <span className="text-sm font-medium">{bmi}</span>
                    </div>
                    <div className="h-2 w-full bg-white/30 border border-white/20 backdrop-blur rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(parseFloat(bmi) * 4, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/30 backdrop-blur p-4 rounded-xl border border-white/30">
                      <div className="text-gray-500 text-sm">{t('common:progress.bodyComposition.weight')}</div>
                      <div className="font-bold text-xl">{currentWeight} {t('common:progress.weightMetrics.kg')}</div>
                    </div>
                    <div className="bg-white/30 backdrop-blur p-4 rounded-xl border border-white/30">
                      <div className="text-gray-500 text-sm">{t('common:progress.bodyComposition.height')}</div>
                      <div className="font-bold text-xl">{height} {t('common:progress.bodyMetrics.cm')}</div>
                    </div>
                  </div>
                  
                  {/* BMI Source Information */}
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="text-xs text-gray-400 mb-1">
                      Formuła BMI: waga (kg) ÷ wzrost² (m²)
                    </div>
                    <a 
                      href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <span>Źródło: WHO</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                </div>
              </Card>
              

            </div>
          )}

          {/* Section 3: Progress Photos */}
          {currentSection === 2 && (
            <div className="space-y-4">
              <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-white/20">
                    <Camera className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent">{t('common:progress.photos.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common:progress.photos.subtitle')}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {hasUploadedToday && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
                      ✓ You've uploaded a photo today. You can replace it with a new one.
                    </div>
                  )}
                  
                  {!hasUploadedToday ? (
                    // Show both Take and Upload buttons only if no photo uploaded today
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCameraOpen}
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            {t('common:progress.photos.takePhoto')}
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {t('common:progress.photos.uploadPhoto')}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    // Show only Change Image button if photo already uploaded today
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      disabled={isUploadingPhoto}
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {t('common:progress.photos.changePhoto')}
                        </>
                      )}
                    </Button>
                  )}
                  
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                  
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {/* Latest Photo */}
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        const latestPhoto = photos.find(p => p.type === 'latest');
                        if (latestPhoto?.photoUrl) handlePhotoClick(latestPhoto.photoUrl);
                      }}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative group">
                        {photos.find(p => p.type === 'latest') ? (
                          <>
                            <img
                              src={photos.find(p => p.type === 'latest')?.photoUrl || ''}
                              alt="Latest Photo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Image failed to load:', e.currentTarget.src);
                                e.currentTarget.src = '/placeholder-progress.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-1">Latest Photo</p>
                    </div>
                    
                    {/* Favorite Photo */}
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        const favoritePhoto = photos.find(p => p.type === 'favorite');
                        if (favoritePhoto?.photoUrl) handlePhotoClick(favoritePhoto.photoUrl);
                      }}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative group">
                        {photos.find(p => p.type === 'favorite') ? (
                          <>
                            <img
                              src={photos.find(p => p.type === 'favorite')?.photoUrl || ''}
                              alt="Favorite Photo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Image failed to load:', e.currentTarget.src);
                                e.currentTarget.src = '/placeholder-progress.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Heart className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-1">Favorite Photo</p>
                    </div>
                    
                    {/* First Photo */}
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        const firstUploadedPhoto = [...photos].sort((a, b) => a.id - b.id)[0];
                        if (firstUploadedPhoto?.photoUrl) handlePhotoClick(firstUploadedPhoto.photoUrl);
                      }}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative group">
                        {photos.length > 0 ? (
                          <>
                            <img
                              src={[...photos].sort((a, b) => a.id - b.id)[0]?.photoUrl || ''}
                              alt="First Photo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Image failed to load:', e.currentTarget.src);
                                e.currentTarget.src = '/placeholder-progress.png';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Star className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-1">First Photo</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setIsGalleryOpen(true)}
                  >
                    {t('common:progress.photos.viewAll')}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Streaks & Achievements section removed */}
        </motion.div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            className="w-12 h-12 rounded-full flex items-center justify-center border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            className="w-12 h-12 rounded-full flex items-center justify-center border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setCurrentSection(prev => Math.min(progressSections.length - 1, prev + 1))}
            disabled={currentSection === progressSections.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Photo Gallery Dialog */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('common:progress.photos.gallery')}</DialogTitle>
            <DialogDescription>
              {t('common:progress.photos.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {photos.length > 0 ? photos.map(photo => (
              <div 
                key={photo.id} 
                className="cursor-pointer relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden group"
                onClick={() => {
                  setSelectedPhotoUrl(photo.photoUrl);
                  setIsGalleryOpen(false);
                }}
              >
                <img 
                  src={photo.photoUrl || ''} 
                  alt={photo.caption || 'Progress photo'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', e.currentTarget.src);
                    e.currentTarget.src = '/placeholder-progress.png';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40">
                    <Image className="w-5 h-5" />
                  </button>
                </div>
                {photo.createdAt && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs p-1 rounded">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )) : (
              <div className="col-span-3 py-8 text-center text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>{t('common:progress.photos.noPhotos')}</p>
                <Button 
                  className="mt-4 bg-pink-500 hover:bg-pink-600 text-white"
                  onClick={() => {
                    setIsGalleryOpen(false);
                    setIsCameraOpen(true);
                  }}
                >
                  {t('common:progress.photos.takePhoto')}
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex sm:justify-between gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsGalleryOpen(false)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[#0CC5BA] text-[#0CC5BA] hover:bg-[#0CC5BA]/10"
                onClick={() => {
                  setIsGalleryOpen(false);
                  setIsCameraOpen(true);
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                {t('common:progress.photos.takePhoto')}
              </Button>
              
              <Button
                className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90 text-white"
                onClick={() => {
                  document.getElementById('photo-upload')?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Camera Dialog */}
      {isCameraOpen && (
        <CameraCapture
          onClose={() => setIsCameraOpen(false)}
          onPhotoCapture={async (photoUrl) => {
            await handlePhotoCapture(photoUrl);
            setIsCameraOpen(false);
          }}
        />
      )}
      
      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhotoUrl} onOpenChange={(open) => !open && setSelectedPhotoUrl(null)}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0 overflow-hidden bg-black">
          <div className="relative">
            <button
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            {selectedPhotoUrl && (
              <div className="flex items-center justify-center">
                <img 
                  src={selectedPhotoUrl || ''} 
                  alt="Progress" 
                  className="w-full h-auto max-h-[90vh] object-contain"
                  onError={(e) => {
                    console.error('Image failed to load in dialog:', e.currentTarget.src);
                    e.currentTarget.src = '/placeholder-progress.png';
                  }}
                />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 p-4 flex justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent">
              <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40">
                <Heart className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40">
                <Share className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40">
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDeletePhotoClick}
                disabled={isDeletingPhoto}
                className="w-10 h-10 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:progress.photos.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:progress.photos.deleteMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('common:progress.photos.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhoto}
              disabled={isDeletingPhoto}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeletingPhoto ? "Deleting..." : t('common:progress.photos.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </BaseLayout>
  );
}