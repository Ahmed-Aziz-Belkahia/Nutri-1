import { useState, useRef, useEffect } from "react";
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
  const { user } = useUser();
  const { photos, isLoading: photosLoading, uploadPhoto, updatePhotoType, deletePhoto } = useProgressPhotos();
  const { analyzeBody, updateProfileWithBodyFat, isLoading: isAnalysisLoading } = useBodyAnalysis();
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get photos organized by type
  const latestPhotos = photos?.filter(photo => photo.type === 'latest') || [];
  const progressPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  const allPhotos = photos || [];

  // Get the best photo for body analysis
  const bestPhotoForAnalysis = latestPhotos[0] || progressPhotos[0] || allPhotos[0];

  // Handle camera capture
  const handleCameraCapture = async (imageData: string) => {
    setUploadingPhoto(true);
    setUploadPreview(imageData);
    
    try {
      await uploadPhoto(imageData, 'latest');
      toast({
        title: "Sukces!",
        description: "Zdjęcie postępu zostało przesłane",
      });
      setIsCameraOpen(false);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się przesłać zdjęcia",
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
        title: "Plik za duży",
        description: "Wybierz zdjęcie mniejsze niż 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Nieprawidłowy typ pliku",
        description: "Wybierz plik graficzny",
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
      title: "Przesyłanie...",
      description: "Przetwarzanie zdjęcia postępu",
    });

    try {
      await uploadPhoto(base64String, 'latest');
      
      toast({
        title: "Sukces!",
        description: "Zdjęcie postępu zostało przesłane",
      });
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się przesłać zdjęcia",
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
                  Postępy
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

        <div className="mt-6 space-y-6 pb-24">
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
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-600 bg-clip-text text-transparent">Zdjęcia Postępów</h3>
                  <p className="text-sm text-gray-600 font-medium">Wizualne śledzenie Twojej podróży</p>
                </div>
              </div>

            {/* Photo Grid with Upload Preview */}
            {allPhotos.length > 0 || uploadPreview ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
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
                        <div className="text-white text-xs font-medium">Przesyłanie...</div>
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
                    className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setShowPhotoDialog(true);
                    }}
                  >
                    <img
                      src={photo.photoUrl}
                      alt="Progress photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="text-white text-xs font-medium">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </div>
                        {photo.type === 'progress-now' && (
                          <div className="text-white/80 text-xs">Body Analysis</div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-gradient-to-br from-gray-50/80 to-blue-50/50 rounded-2xl border border-gray-200/50 mb-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0CC5BA]/20"
                >
                  <Camera className="w-8 h-8 text-white" />
                </motion.div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Brak Zdjęć</h4>
                <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">Dodaj pierwsze zdjęcie, aby rozpocząć śledzenie postępów</p>
                
                {/* Motivational badges */}
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-[#0CC5BA]/10 text-[#0CC5BA] rounded-full text-xs font-medium">Śledź Postępy</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Bądź Zmotywowany</span>
                </div>
              </div>
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
                          Przesyłanie...
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
                        Wgraj Zdjęcie
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
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent">Analiza Ciała</h3>
                  <p className="text-sm text-gray-600 font-medium">Analiza składu ciała oparta na AI</p>
                </div>
              </div>

            {/* Current Stats */}
            {userProfile?.bodyFatPercentage && (
              <div className="bg-gradient-to-br from-blue-50/90 via-[#0CC5BA]/10 to-blue-100/40 rounded-2xl p-5 mb-6 border-2 border-blue-100/50 shadow-lg backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent">
                      {userProfile.bodyFatPercentage}%
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-1">Tkanka Tłuszczowa</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {userProfile.bodyType || 'Nieznany'}
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-1">Typ Ciała</div>
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
                disabled={isAnalysisLoading || isMarkingPhoto || !bestPhotoForAnalysis}
                className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#0CC5BA] hover:from-blue-600 hover:via-blue-700 hover:to-[#0BB5AA] text-white rounded-2xl py-4 font-semibold text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border-0"
              >
                {(isAnalysisLoading || isMarkingPhoto) && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                <Percent className="w-5 h-5 mr-2" />
                {isAnalysisLoading ? 'Analizowanie...' : isMarkingPhoto ? 'Przygotowywanie...' : 'Analizuj Skład Ciała'}
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
                  <span className="font-semibold text-amber-800 text-base">Wymagane Zdjęcie</span>
                </div>
                <span className="text-amber-700 font-medium">Dodaj zdjęcie postępu, aby włączyć analizę ciała</span>
              </div>
            )}
            </div>
          </Card>
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



      {/* Photo View Dialog - Custom Modal */}
      {showPhotoDialog && selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPhotoDialog(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => handleDeletePhoto(selectedPhoto.photoUrl)}
                className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setShowPhotoDialog(false)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            {/* Photo info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="text-white font-semibold text-lg">
                {new Date(selectedPhoto.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-white/80 text-sm mt-1">
                {selectedPhoto.type === 'progress-now' ? 'Used for body analysis' : 'Progress photo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body Fat Analysis Results Modal */}
      {showBodyFatDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowBodyFatDialog(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowBodyFatDialog(false)}
              className="absolute right-4 top-4 z-10 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 text-sm">×</span>
            </button>
            
            <div className="text-center p-4 pb-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent">
                Wyniki Analizy Ciała
              </h2>
            </div>
            
            {bodyFatAnalysis ? (
              <div className="px-4 pb-4 space-y-4">
                {/* Main Results */}
                <div className="text-center p-6 bg-gradient-to-br from-blue-50/90 via-[#0CC5BA]/10 to-blue-100/40 rounded-2xl border-2 border-blue-100/50 shadow-lg backdrop-blur-sm">
                  <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-[#0CC5BA] bg-clip-text text-transparent mb-2">
                    {bodyFatAnalysis.bodyFatPercentage}%
                  </div>
                  <div className="text-lg font-bold text-gray-900 mb-2">
                    {bodyFatAnalysis.bodyType}
                  </div>
                  <div className="text-xs font-medium text-gray-600 bg-white/60 rounded-full px-3 py-1 inline-block">
                    Pewność: {Math.round(bodyFatAnalysis.confidence)}%
                  </div>
                </div>
                
                {/* Additional Info */}
                {bodyFatAnalysis.muscleMass && (
                  <div className="bg-gradient-to-br from-green-50/90 to-emerald-100/40 rounded-xl p-3 border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-600">Masa Mięśniowa</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{bodyFatAnalysis.muscleMass}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recommendations */}
                {bodyFatAnalysis.improvementSuggestions && bodyFatAnalysis.improvementSuggestions.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50/90 to-orange-100/40 rounded-xl p-4 border border-amber-100">
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                      <span className="text-amber-600 font-bold">!</span>
                      Rekomendacje
                    </h4>
                    <ul className="space-y-2">
                      {bodyFatAnalysis.improvementSuggestions.map((suggestion, index) => (
                        <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="font-medium leading-relaxed">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Action Button */}
                <Button
                  onClick={() => setShowBodyFatDialog(false)}
                  className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#0CC5BA] hover:from-blue-600 hover:via-blue-700 hover:to-[#0BB5AA] text-white rounded-xl py-3 font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-2xl transition-all duration-500 border-0"
                >
                  Rozumiem!
                </Button>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <p>Loading analysis...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}