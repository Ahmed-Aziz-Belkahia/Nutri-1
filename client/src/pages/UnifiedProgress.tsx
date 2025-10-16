import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Percent, Activity, ArrowLeft, Info, Loader2, Plus, X, Eye, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { useBodyAnalysis } from "@/hooks/use-body-analysis";
import { useWeightLogs } from "@/hooks/use-weight-logs";
import { ProgressOverview } from "@/components/progress/ProgressOverview";
import { WeightTrendChart } from "@/components/progress/WeightTrendChart";
import { SourcesDisclaimer } from "@/components/progress/SourcesDisclaimer";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/use-user-profile";
import SimpleCameraCapture from "@/components/SimpleCameraCapture";

interface BodyAnalysis {
  bodyFatPercentage: number;
  bodyType: string;
  muscleMass?: string;
  bodyCompositionNotes?: string;
  improvementSuggestions?: string[];
  confidence: number;
}

export default function UnifiedProgress() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { photos, isLoading: photosLoading, uploadPhoto, updatePhotoType, deletePhoto } = useProgressPhotos();
  const { analyzeBody, updateProfileWithBodyFat, isLoading: isAnalysisLoading } = useBodyAnalysis();
  const { weightLogs, isLoading: isWeightLogsLoading } = useWeightLogs();
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile();

  // States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showBodyFatDialog, setShowBodyFatDialog] = useState(false);
  const [bodyFatAnalysis, setBodyFatAnalysis] = useState<BodyAnalysis | null>(null);
  const [isMarkingPhoto, setIsMarkingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  
  // Track last analyzed photos to prevent duplicate analyses
  const [lastAnalyzedPhotos, setLastAnalyzedPhotos] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lastAnalyzedPhotos');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading lastAnalyzedPhotos from localStorage:', error);
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for storage events (cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastAnalyzedPhotos' && e.newValue) {
        try {
          setLastAnalyzedPhotos(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing lastAnalyzedPhotos from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get photos organized by type
  const latestPhotos = photos?.filter(photo => photo.type === 'latest') || [];
  const progressPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  const allPhotos = photos || [];

  // Get the best photo for body analysis
  const bestPhotoForAnalysis = latestPhotos[0] || progressPhotos[0] || allPhotos[0];
  
  // Check if photos have changed since last analysis - wrapped in useMemo for reactivity
  const photosHaveChanged = useMemo(() => {
    // If there are no photos, can't analyze
    if (allPhotos.length === 0) {
      return false;
    }
    
    // If never analyzed before, enable analysis
    if (lastAnalyzedPhotos.length === 0) {
      console.log('Photo change detection: Never analyzed before, enabling button');
      return true;
    }
    
    // Check if photos have changed
    const currentPhotoUrls = allPhotos.map(p => p.photoUrl).sort();
    const sortedLastAnalyzed = [...lastAnalyzedPhotos].sort();
    const hasChanged = 
      currentPhotoUrls.length !== sortedLastAnalyzed.length ||
      currentPhotoUrls.some((url, index) => url !== sortedLastAnalyzed[index]);
    
    console.log('Photo change detection:', {
      currentPhotoUrls,
      lastAnalyzedPhotos,
      photosHaveChanged: hasChanged,
      hasPhotos: allPhotos.length > 0
    });
    
    return hasChanged;
  }, [allPhotos, lastAnalyzedPhotos]);

  // Handle camera capture
  const handleCameraCapture = async (imageData: string) => {
    setUploadingPhoto(true);
    setUploadPreview(imageData);
    
    try {
      await uploadPhoto(imageData, 'latest');
      
      // Explicitly refetch photos to update the analyze button state
      await queryClient.invalidateQueries({ queryKey: ['/api/progress-photos'] });
      await queryClient.refetchQueries({ queryKey: ['/api/progress-photos'] });
      
      toast({
        title: "Success!",
        description: "Progress photo uploaded",
      });
      setIsCameraOpen(false);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      setUploadPreview(null);
    }
  };

  // Handle file upload with enhanced progress feedback
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Choose a photo smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Choose an image file",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    
    // Convert file to base64 for preview and upload
    const reader = new FileReader();
    const base64String = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to convert image'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

    // Set preview immediately
    setUploadPreview(base64String);
    
    // Show immediate feedback
    toast({
      title: "Uploading...",
      description: "Processing progress photo",
    });

    try {
      await uploadPhoto(base64String, 'latest');
      
      // Explicitly refetch photos to update the analyze button state
      await queryClient.invalidateQueries({ queryKey: ['/api/progress-photos'] });
      await queryClient.refetchQueries({ queryKey: ['/api/progress-photos'] });
      
      toast({
        title: "Success!",
        description: "Progress photo uploaded",
      });
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      setUploadPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle body fat analysis
  const handleBodyFatAnalysis = async () => {
    console.log('Body analysis button clicked!');
    console.log('Best photo for analysis:', bestPhotoForAnalysis);
    console.log('User profile:', userProfile);
    
    if (!bestPhotoForAnalysis) {
      console.log('No photo available for analysis');
      toast({
        title: "No Photo Available",
        description: "Please take a progress photo first",
        variant: "destructive",
      });
      return;
    }

    console.log('User profile data:', userProfile);
    
    if (!userProfile?.currentWeight) {
      console.log('Missing weight:', { 
        weight: userProfile?.currentWeight, 
        height: userProfile?.height 
      });
      toast({
        title: "Brakuje informacji",
        description: "Dodaj swoją wagę w profilu, aby włączyć analizę ciała.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Mark photo as progress-now if needed
      if (bestPhotoForAnalysis.type !== 'progress-now') {
        setIsMarkingPhoto(true);
        await updatePhotoType({
          photoUrl: bestPhotoForAnalysis.photoUrl,
          type: 'progress-now'
        });
        setIsMarkingPhoto(false);
      }

      // Convert photo URL to base64
      console.log('Fetching photo from URL:', bestPhotoForAnalysis.photoUrl);
      const photoResponse = await fetch(bestPhotoForAnalysis.photoUrl);
      
      if (!photoResponse.ok) {
        throw new Error('Failed to fetch photo');
      }
      
      const photoBlob = await photoResponse.blob();
      const reader = new FileReader();
      
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error('Failed to convert photo to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read photo'));
        reader.readAsDataURL(photoBlob);
      });

      console.log('Photo converted to base64, length:', base64String.length);
      
      // Call the body analysis API with proper parameters
      // Use default height of 175cm if not provided (average adult height)
      const weightValue = typeof userProfile.currentWeight === 'string' 
        ? parseFloat(userProfile.currentWeight) 
        : userProfile.currentWeight || 70;
      const heightValue = userProfile.height || 175;
      
      console.log('Using analysis parameters:', { weightValue, heightValue });
      
      const analysis = await analyzeBody(
        base64String,
        weightValue,
        heightValue
      );
      
      console.log('Analysis completed, setting state:', analysis);
      setBodyFatAnalysis(analysis);
      console.log('Setting showBodyFatDialog to true');
      setShowBodyFatDialog(true);

      // Update profile with new body fat data
      if (analysis?.bodyFatPercentage) {
        await updateProfileWithBodyFat(analysis.bodyFatPercentage, analysis.bodyType);
        refetchUserProfile();
      }
      
      // Save current photo URLs to prevent duplicate analysis
      const photoUrls = allPhotos.map(p => p.photoUrl);
      setLastAnalyzedPhotos(photoUrls);
      localStorage.setItem('lastAnalyzedPhotos', JSON.stringify(photoUrls));
      console.log('Saved analyzed photos to localStorage:', photoUrls);
    } catch (error) {
      console.error('Body analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze body composition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingPhoto(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      await deletePhoto(photoUrl);
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      setShowPhotoDialog(false);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] relative overflow-hidden">
      {/* Abstract background pattern matching Dashboard */}
      <div className="absolute inset-0 opacity-5" style={{ 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      }}></div>
      
      {/* Colorful abstract shapes matching Dashboard */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/5 filter blur-3xl -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 filter blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/5 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-pink-500/5 filter blur-3xl" />

      <div className="max-w-[600px] mx-auto relative z-10 pt-4 px-4">
        {/* Header matching Dashboard design */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 rounded-2xl shadow-sm"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-[#0CC5BA]/10 p-2 rounded-full">
                  <Activity className="h-5 w-5 text-[#0CC5BA]" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
                  Progress
                </h1>
              </div>
              
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative cursor-pointer"
                onClick={() => setLocation('/profile')}
              >
                <div className="relative">
                  <button
                    className="w-12 h-12 rounded-full bg-[#0CC5BA] flex items-center justify-center text-white text-xl font-semibold hover:bg-[#0CC5BA]/90 transition-colors overflow-hidden"
                  >
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{user?.email ? user.email[0].toUpperCase() : 'U'}</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        <div className="mt-6 space-y-6 pb-32">
        {/* Overview + Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <ProgressOverview
            currentWeight={userProfile?.currentWeight ? parseFloat(userProfile.currentWeight as any) : undefined}
            goalWeight={userProfile?.goalWeight ? parseFloat(userProfile.goalWeight as any) : undefined}
            startWeight={weightLogs.length ? weightLogs[weightLogs.length - 1].weight : undefined}
            bodyFatPercentage={userProfile?.bodyFatPercentage ? parseFloat(String(userProfile.bodyFatPercentage)) : undefined}
          />
          <WeightTrendChart
            weightLogs={weightLogs}
            goalWeight={userProfile?.goalWeight ? parseFloat(userProfile.goalWeight as any) : undefined}
            loading={isWeightLogsLoading}
          />
        </motion.div>
        {/* Progress Photos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden rounded-3xl border-none shadow-xl bg-gradient-to-br from-white via-[#0CC5BA]/5 to-blue-50/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative">
            {/* Subtle animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#0CC5BA]/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-blue-500 flex items-center justify-center shadow-lg shadow-[#0CC5BA]/30"
                >
                  <Camera className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-600 bg-clip-text text-transparent">Progress Photos</h3>
                  <p className="text-sm text-gray-600 font-medium">Visual tracking of your journey</p>
                </div>
              </div>

            {/* Photo Count Badge */}
            {allPhotos.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#0CC5BA]/10 to-blue-100/50 rounded-full border border-[#0CC5BA]/20">
                  <Camera className="w-3.5 h-3.5 text-[#0CC5BA]" />
                  <span className="text-xs font-semibold text-gray-700">
                    {allPhotos.length} {allPhotos.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>
            )}

            {/* Photo Grid with Upload Preview */}
            {allPhotos.length > 0 || uploadPreview ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Upload Preview - Shows first when uploading */}
                {uploadPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-2xl overflow-hidden"
                  >
                    <img
                      src={uploadPreview}
                      alt="Uploading photo"
                      className="w-full h-full object-cover"
                    />
                    {/* Upload progress overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 mx-auto mb-2"
                        >
                          <Loader2 className="w-8 h-8 text-white" />
                        </motion.div>
                        <div className="text-white text-xs font-medium">Uploading...</div>
                      </div>
                    </div>
                    {/* Animated upload particles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                          x: [0, Math.random() * 100 - 50],
                          y: [0, Math.random() * 100 - 50]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3,
                          ease: "easeOut"
                        }}
                        className="absolute w-1 h-1 bg-[#0CC5BA] rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                        }}
                      />
                    ))}
                  </motion.div>
                )}
                
                {/* Existing Photos */}
                {allPhotos.slice(0, uploadPreview ? 3 : 4).map((photo, index) => (
                  <motion.div
                    key={photo.photoUrl}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (uploadPreview ? index + 1 : index) * 0.1 }}
                    className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-300"
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setShowPhotoDialog(true);
                    }}
                  >
                    {/* Image with enhanced hover effect */}
                    <img
                      src={photo.photoUrl}
                      alt="Progress photo"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {/* Date badge */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/30">
                            <div className="text-white text-xs font-bold">
                              {new Date(photo.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                          {photo.type === 'progress-now' && (
                            <div className="bg-[#0CC5BA]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#0CC5BA]/30">
                              <div className="text-white text-xs font-bold flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Analyzed
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* View icon */}
                      <div className="absolute top-3 right-3">
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Index badge - top left */}
                    <div className="absolute top-3 left-3">
                      <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                        <span className="text-white text-xs font-bold">#{allPhotos.length - index}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 px-6 bg-gradient-to-br from-gray-50/90 via-blue-50/50 to-[#0CC5BA]/5 rounded-3xl border-2 border-dashed border-gray-300/50 mb-6 relative overflow-hidden"
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-4 left-4 w-16 h-16 border-2 border-[#0CC5BA] rounded-full animate-pulse"></div>
                  <div className="absolute bottom-4 right-4 w-20 h-20 border-2 border-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-[#0CC5BA] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0CC5BA] via-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#0CC5BA]/30"
                  >
                    <Camera className="w-10 h-10 text-white" />
                  </motion.div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Start Your Journey</h4>
                  <p className="text-sm text-gray-600 mb-5 max-w-xs mx-auto leading-relaxed">
                    Take your first progress photo and watch your transformation unfold
                  </p>
                  
                  {/* Motivational badges with icons */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="px-4 py-2 bg-gradient-to-r from-[#0CC5BA]/10 to-[#0CC5BA]/5 text-[#0CC5BA] rounded-xl text-xs font-semibold border border-[#0CC5BA]/20 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Track Progress
                    </div>
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-100/80 to-blue-50 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200/50 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      AI Analysis
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Button with Enhanced Upload Animation */}
            <div className="mt-6">
              <motion.div 
                whileHover={!uploadingPhoto ? { scale: 1.02 } : {}}
                whileTap={!uploadingPhoto ? { scale: 0.98 } : {}}
                className="w-full relative"
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#0CC5BA] hover:from-blue-600 hover:via-blue-700 hover:to-[#0BB5AA] text-white rounded-2xl py-4 font-semibold text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl transition-all duration-500 border-0 relative overflow-hidden"
                  disabled={uploadingPhoto}
                >
                  {/* Upload progress overlay */}
                  {uploadingPhoto && (
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-[#0CC5BA]/20 to-blue-500/20 backdrop-blur-sm"
                    />
                  )}
                  
                  {/* Animated particles during upload */}
                  {uploadingPhoto && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                          animate={{ 
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            x: [0, Math.random() * 200 - 100],
                            y: [0, Math.random() * 60 - 30]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut"
                          }}
                          className="absolute w-1 h-1 bg-white rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Button content with animation */}
                  <div className="relative z-10 flex items-center justify-center">
                    {uploadingPhoto ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 mr-2"
                        >
                          <Loader2 className="w-5 h-5" />
                        </motion.div>
                        <motion.span
                          animate={{ opacity: [1, 0.7, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          Uploading...
                        </motion.span>
                      </>
                    ) : (
                      <>
                        <motion.div
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Upload className="w-5 h-5 mr-2" />
                        </motion.div>
                        Upload Photo
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            </div>
            </div>
          </Card>
        </motion.div>

  {/* Body Fat Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden rounded-3xl border-none shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-[#0CC5BA]/5 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative">
            {/* Subtle animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/20 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#0CC5BA]/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
            
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-[#0CC5BA] flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <Activity className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent">Body Analysis</h3>
                  <p className="text-sm text-gray-600 font-medium">AI-powered body composition analysis</p>
                </div>
              </div>

            {/* Current Stats */}
            {userProfile?.bodyFatPercentage && (
              <div className="bg-gradient-to-br from-blue-50/90 via-[#0CC5BA]/10 to-blue-100/40 rounded-2xl p-6 mb-6 border-2 border-blue-100/50 shadow-lg backdrop-blur-sm relative overflow-hidden">
                {/* Animated background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#0CC5BA]/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Body Fat Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-blue-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-[#0CC5BA] flex items-center justify-center">
                          <Percent className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Body Fat</span>
                      </div>
                      <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent">
                        {userProfile.bodyFatPercentage}%
                      </div>
                    </div>
                    
                    {/* Body Type Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-blue-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Body Type</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 leading-tight">
                        {userProfile.bodyType || 'Not Set'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(userProfile.bodyFatPercentage, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-[#0CC5BA]"
                      />
                    </div>
                    <span className="font-semibold">{userProfile.bodyFatPercentage}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleBodyFatAnalysis}
                disabled={isAnalysisLoading || isMarkingPhoto || !bestPhotoForAnalysis || !photosHaveChanged}
                className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#0CC5BA] hover:from-blue-600 hover:via-blue-700 hover:to-[#0BB5AA] text-white rounded-2xl py-4 font-semibold text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border-0"
              >
                {(isAnalysisLoading || isMarkingPhoto) && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                <Percent className="w-5 h-5 mr-2" />
                {isAnalysisLoading ? 'Analyzing...' : isMarkingPhoto ? 'Preparing...' : 'Analyze Body Composition'}
              </Button>
            </motion.div>

            {!bestPhotoForAnalysis && (
              <div className="mt-5 p-5 text-sm text-center bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-yellow-50/40 rounded-2xl border-2 border-amber-100/50 shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-center mb-3">
                  <motion.div 
                    className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mr-3 shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Info className="w-5 h-5 text-white" />
                  </motion.div>
                  <span className="font-semibold text-amber-800 text-base">Photo Required</span>
                </div>
                  <span className="text-amber-700 font-medium">Add a progress photo to enable body analysis</span>
              </div>
            )}
            
            {/* Warning when photos haven't changed */}
            {bestPhotoForAnalysis && !photosHaveChanged && (
              <div className="mt-5 p-5 text-sm text-center bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-purple-50/40 rounded-2xl border-2 border-blue-100/50 shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-center mb-3">
                  <motion.div 
                    className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mr-3 shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Info className="w-5 h-5 text-white" />
                  </motion.div>
                  <span className="font-semibold text-blue-800 text-base">Already Analyzed</span>
                </div>
                  <span className="text-blue-700 font-medium">Upload a new photo to analyze again</span>
              </div>
            )}
            </div>
          </Card>
        </motion.div>

        {/* Sources & Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SourcesDisclaimer />
        </motion.div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />



      {/* Photo View Dialog - Enhanced Modal */}
      {showPhotoDialog && selectedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPhotoDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative max-w-4xl w-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <img
              src={selectedPhoto.photoUrl}
              alt="Progress photo"
              className="w-full h-auto max-h-[85vh] object-contain"
              onError={(e) => {
                console.error('Image failed to load:', selectedPhoto.photoUrl);
              }}
              onLoad={() => console.log('Image loaded successfully:', selectedPhoto.photoUrl)}
            />
            
            {/* Control buttons */}
            <div className="absolute top-4 right-4 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDeletePhoto(selectedPhoto.photoUrl)}
                className="w-12 h-12 rounded-2xl bg-red-500/90 hover:bg-red-600 backdrop-blur-md flex items-center justify-center transition-colors shadow-lg border border-red-400/30"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPhotoDialog(false)}
                className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors shadow-lg border border-white/20"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
            
            {/* Photo info - Enhanced */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-8 backdrop-blur-sm">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-white font-bold text-2xl mb-2">
                    {new Date(selectedPhoto.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPhoto.type === 'progress-now' ? (
                      <div className="flex items-center gap-2 bg-[#0CC5BA]/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#0CC5BA]/30">
                        <Activity className="w-4 h-4 text-[#0CC5BA]" />
                        <span className="text-[#0CC5BA] text-sm font-semibold">Body Analysis Photo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-blue-500/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-blue-400/30">
                        <Camera className="w-4 h-4 text-blue-300" />
                        <span className="text-blue-200 text-sm font-semibold">Progress Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Body Fat Analysis Results Modal - Enhanced */}
      {showBodyFatDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowBodyFatDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-end p-4 bg-white">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBodyFatDialog(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-colors shadow-md"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
            
            <div className="text-center px-6 pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 via-[#0CC5BA] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
              >
                <Activity className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent mb-1">
                Analysis Complete
              </h2>
              <p className="text-sm text-gray-600">Your body composition results</p>
            </div>
            
            {bodyFatAnalysis ? (
              <div className="px-6 pb-6 space-y-4">
                {/* Main Results - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center p-8 bg-gradient-to-br from-blue-50/90 via-[#0CC5BA]/10 to-blue-100/40 rounded-3xl border-2 border-blue-100/50 shadow-xl backdrop-blur-sm relative overflow-hidden"
                >
                  {/* Animated background elements */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#0CC5BA]/20 to-transparent rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                  
                  <div className="relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-[#0CC5BA] to-blue-600 bg-clip-text text-transparent mb-3"
                    >
                      {bodyFatAnalysis.bodyFatPercentage}%
                    </motion.div>
                    <div className="text-xl font-bold text-gray-900 mb-3">
                      {bodyFatAnalysis.bodyType}
                    </div>
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-blue-100/50">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-gray-700">
                        {Math.round(bodyFatAnalysis.confidence)}% Confidence
                      </span>
                    </div>
                  </div>
                </motion.div>
                
                {/* Additional Info */}
                {bodyFatAnalysis.muscleMass && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-emerald-50/90 to-green-100/40 rounded-2xl p-4 border-2 border-emerald-100/50 shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-emerald-600 mb-1">Muscle Mass</div>
                        <div className="text-base font-bold text-gray-900">{bodyFatAnalysis.muscleMass}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Recommendations */}
                {bodyFatAnalysis.improvementSuggestions && bodyFatAnalysis.improvementSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-amber-50/90 to-orange-100/40 rounded-2xl p-5 border-2 border-amber-100/50 shadow-lg"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                        <Info className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-900 text-base">Recommendations</h4>
                    </div>
                    <ul className="space-y-3">
                      {bodyFatAnalysis.improvementSuggestions.map((suggestion, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="text-sm text-gray-700 flex items-start gap-3 bg-white/60 p-3 rounded-xl"
                        >
                          <span className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="font-medium leading-relaxed flex-1">{suggestion}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                
                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => setShowBodyFatDialog(false)}
                    className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#0CC5BA] hover:from-blue-600 hover:via-blue-700 hover:to-[#0BB5AA] text-white rounded-2xl py-4 font-bold text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl transition-all duration-500 border-0"
                  >
                    Got it! 🎉
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="px-6 pb-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0CC5BA] mb-3" />
                <p className="text-gray-600">Analyzing your body composition...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}