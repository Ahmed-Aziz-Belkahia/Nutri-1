import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Webcam from 'react-webcam';
import { Camera, AlertTriangle, ArrowLeft, Sparkles, Loader2, Image as ImageIcon, Edit3, ChefHat } from "lucide-react";

// Utility function to convert image to WebP format for optimization
const convertToWebP = async (base64Image: string, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const webpData = canvas.toDataURL('image/webp', quality);
      resolve(webpData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
};

// Form schemas
const textAnalysisSchema = z.object({
  ingredients: z.string().min(1, "Please enter your ingredients"),
});

export default function RecipeScanner() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const navigate = (delta: number) => {
    if (delta === -1) {
      setLocation('/recipes');
    }
  };
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"photo" | "gallery" | "manual">("photo");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorSuggestion, setErrorSuggestion] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [webcamKey, setWebcamKey] = useState(0);
  const [cameraConstraints] = useState<any>({
    facingMode: { exact: 'environment' },
    aspectRatio: 9/16,
    width: { ideal: 1920, min: 1080 },
    height: { ideal: 1080, min: 720 },
    advanced: [
      { zoom: 1.0 },
      { focusMode: 'continuous' },
      { exposureMode: 'continuous' }
    ]
  });

  // Forms
  const textForm = useForm<z.infer<typeof textAnalysisSchema>>({
    resolver: zodResolver(textAnalysisSchema),
    defaultValues: {
      ingredients: "",
    },
  });

  // Request camera permission
  useEffect(() => {
    if (activeTab === "photo") {
      requestCameraPermission();
    }
  }, [activeTab]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { exact: 'environment' },
          width: { ideal: 1920, min: 1080 },
          height: { ideal: 1080, min: 720 }
        }, 
        audio: false 
      });
      stream.getTracks().forEach(t => t.stop());
      setCameraReady(true);
      setCameraError(null);
    } catch (err) {
      console.error('Camera permission error:', err);
      setCameraError("Camera access denied. Please enable camera permissions.");
      setCameraReady(false);
    }
  };

  // Handle image capture
  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    try {
      setIsAnalyzing(true);
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        throw new Error("Failed to capture image");
      }

      // Convert to WebP for optimization
      const optimizedImage = await convertToWebP(screenshot, 0.8);

      // Store image and navigate to analysis page
      localStorage.setItem('analyzingIngredientsImage', optimizedImage);
      setLocation("/ingredients-analysis");
    } catch (error) {
      console.error('Capture Error:', error);
      handleAnalysisError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsAnalyzing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Convert to WebP for optimization
        const optimizedImage = await convertToWebP(base64, 0.8);
        
        // Store image and navigate to analysis page
        localStorage.setItem('analyzingIngredientsImage', optimizedImage);
        setLocation("/ingredients-analysis");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      handleAnalysisError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle gallery image selection - immediately start scanning
  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Take the first file and immediately start scanning
    const file = files[0];
    setIsAnalyzing(true);
    
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Convert to WebP for optimization
      const optimizedImage = await convertToWebP(base64, 0.8);
      
      // Store image and navigate to analysis page
      localStorage.setItem('analyzingIngredientsImage', optimizedImage);
      setLocation("/ingredients-analysis");
    } catch (error) {
      console.error('Gallery upload error:', error);
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  // Handle gallery image selection
  const handleGalleryImageSelect = async (image: string) => {
    setSelectedGalleryImage(image);
    
    try {
      setIsAnalyzing(true);
      // Convert to WebP for optimization
      const optimizedImage = await convertToWebP(image, 0.8);
      
      // Store image and navigate to analysis page
      localStorage.setItem('analyzingIngredientsImage', optimizedImage);
      setLocation("/ingredients-analysis");
    } catch (error) {
      console.error('Gallery selection error:', error);
      handleAnalysisError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisError = (error: unknown) => {
    console.error('Analysis Error:', error);
    
    let errorTitle = t('common:recipeScanner.errors.analysisError');
    let errorMessage = t('common:recipeScanner.errors.failedToAnalyze');
    let suggestion = t('common:recipeScanner.errors.tryDifferent');
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid image format') || error.message.includes('unsupported image')) {
        errorTitle = t('common:recipeScanner.errors.unsupportedImage');
        errorMessage = t('common:recipeScanner.errors.unsupportedFormat');
        suggestion = t('common:recipeScanner.errors.useCorrectFormat');
      } else if (error.message.includes('HTTP error! status: 500')) {
        errorTitle = t('common:recipeScanner.errors.aiProcessingError');
        errorMessage = t('common:recipeScanner.errors.serverError');
        suggestion = t('common:recipeScanner.errors.tryBetterLighting');
      } else {
        errorMessage = error.message;
      }
    }
    
    setErrorTitle(errorTitle);
    setErrorMessage(errorMessage);
    setErrorSuggestion(suggestion);
    setErrorModalOpen(true);
    setIsAnalyzing(false);
  };

  // Handle text AI analysis
  const onTextSubmit = async (values: z.infer<typeof textAnalysisSchema>) => {
    try {
      setIsAnalyzing(true);
      
      if (!values.ingredients || values.ingredients.trim() === '') {
        throw new Error(t('common:recipeScanner.errors.enterIngredients'));
      }
      
      // Parse ingredients from text (comma-separated)
      const ingredientsList = values.ingredients
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);
      
      // Send to backend for recipe generation
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredients: ingredientsList,
          preferences: { difficulty: 'Medium', timeNeeded: 30, flavor: 'Mixed' }
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(t('common:recipeScanner.errors.failedToGenerate'));
      }

      const result = await response.json();
      
      // Store result and navigate to results page
      localStorage.setItem('scannedIngredients', JSON.stringify(ingredientsList));
      localStorage.setItem('generatedRecipes', JSON.stringify(result));
      setLocation("/recipe-results");
    } catch (error) {
      console.error('Error in text submission:', error);
      
      toast({
        variant: "destructive",
        title: t('common:recipeScanner.errors.analysisError'),
        description: error instanceof Error 
          ? error.message 
          : t('common:recipeScanner.errors.beMoreSpecific')
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Camera view - Immersive full-screen experience
  const renderPhotoView = () => {
    return (
      <>
        {/* Camera Feed */}
        {cameraReady && (
          <Webcam
            key={webcamKey}
            ref={webcamRef}
            audio={false}
            muted
            playsInline
            autoPlay
            screenshotFormat="image/jpeg"
            videoConstraints={cameraConstraints}
            className={`absolute inset-0 w-full h-full object-cover ${cameraLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
            onUserMedia={() => {
              setCameraError(null);
              setCameraLoading(false);
            }}
            onUserMediaError={(error) => {
              console.error('Camera Error:', error);
              setCameraError("Camera access denied");
              setCameraLoading(false);
            }}
          />
        )}

        {/* Camera Loading State */}
        {cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-[#26A8FF]/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-[#26A8FF] rounded-full animate-spin" />
                <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#26A8FF]" />
              </div>
              <p className="text-white/80 text-sm font-medium">{t('common:recipeScanner.camera.initializing')}</p>
            </div>
          </div>
        )}

        {/* Camera Error State */}
        {cameraError && !cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6 z-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-sm"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center backdrop-blur-sm border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{t('common:recipeScanner.camera.accessRequired')}</h3>
              <p className="text-white/60 text-sm mb-8">{cameraError}</p>
              <div className="space-y-3">
                <Button
                  onClick={requestCameraPermission}
                  className="w-full bg-[#26A8FF] hover:bg-[#1A8FE6] text-white rounded-full h-12 font-semibold shadow-lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {t('common:recipeScanner.camera.retry')}
                </Button>
                <Button
                  onClick={() => setActiveTab('manual')}
                  variant="ghost"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-full h-12"
                >
                  {t('common:recipeScanner.camera.switchToGallery')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom Gradient Overlay */}
        {!cameraError && !cameraLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
        )}

        {/* Capture Button with Animation */}
        {!cameraError && !cameraLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-0 left-0 right-0 flex flex-col items-center z-30" 
            style={{ paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))' }}
          >
            {/* Hint Text */}
            <p className="text-white/80 text-sm font-medium mb-4">
              {isAnalyzing ? t('common:recipeScanner.camera.analyzing') : t('common:recipeScanner.camera.tapToCapture')}
            </p>
            
            {/* Capture Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCapture}
              disabled={isAnalyzing}
              className="relative w-20 h-20 rounded-full flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />
              
              {/* Pulsing Effect */}
              {!isAnalyzing && (
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-[#26A8FF]"
                />
              )}
              
              {/* Inner Circle */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center shadow-2xl group-active:scale-95 transition-transform">
                {isAnalyzing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </>
    );
  };

  // Gallery view
  const renderGalleryView = () => {
    return (
      <div className="absolute inset-0 gradient-bg overflow-auto">
        <div className="min-h-full flex flex-col" style={{ paddingTop: '240px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          <div className="flex-1 px-5">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose from Gallery</h2>
                <p className="text-gray-600">Select ingredient images to analyze</p>
              </motion.div>

              {/* Gallery Grid */}
              {galleryImages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#26A8FF]/10 to-[#1A8FE6]/10 flex items-center justify-center mb-6">
                    <ImageIcon className="w-16 h-16 text-[#26A8FF]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('common:recipeScanner.gallery.empty')}</h3>
                  <p className="text-gray-500 text-center mb-8 max-w-md">
                    {t('common:recipeScanner.gallery.subtitle')}
                  </p>
                  <Button
                    onClick={() => galleryInputRef.current?.click()}
                    className="bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] hover:from-[#1A8FE6] hover:to-[#0D7FD6] text-white px-8 py-6 rounded-2xl text-lg font-semibold shadow-lg"
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    {t('common:recipeScanner.gallery.uploadButton')}
                  </Button>
                </motion.div>
              ) : (
                <>
                  {/* Load More Button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6"
                  >
                    <Button
                      onClick={() => galleryInputRef.current?.click()}
                      variant="outline"
                      className="w-full py-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#26A8FF] hover:bg-[#26A8FF]/5 transition-all"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      {t('common:recipeScanner.gallery.uploadButton')}
                    </Button>
                  </motion.div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                    {galleryImages.map((image, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleGalleryImageSelect(image)}
                        className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all group"
                      >
                        <img
                          src={image}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <span className="text-white font-semibold text-sm">{t('common:recipeScanner.gallery.select')}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Gallery Input - Single Selection for immediate scanning */}
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleGalleryImagesUpload}
        />
      </div>
    );
  };

  // Manual entry view
  const renderManualView = () => {
    return (
      <div className="absolute inset-0 gradient-bg overflow-auto">
        <div className="min-h-full flex flex-col" style={{ paddingTop: '240px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          <div className="flex-1 px-5">
            <div className="max-w-md mx-auto space-y-5">
              
              {/* AI Recipe Generator Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-gray-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#26A8FF] to-[#0CC5BA] flex items-center justify-center shadow-lg shadow-[#26A8FF]/20">
                      <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{t('common:recipeScanner.manual.title')}</h3>
                      <p className="text-xs text-gray-500">{t('common:recipeScanner.manual.subtitle')}</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-5">
                  <form onSubmit={textForm.handleSubmit(onTextSubmit)} className="space-y-4">
                    <div>
                      <div className="relative">
                        <Textarea
                          placeholder={t('common:recipeScanner.manual.placeholder')}
                          {...textForm.register("ingredients")}
                          rows={5}
                          className="w-full rounded-2xl bg-white/80 border border-gray-200/60 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 p-4 resize-none transition-all text-gray-900 placeholder:text-gray-400 text-sm leading-relaxed"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-white/50 px-3 py-2 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5 text-[#26A8FF]" />
                        <span>{t('common:recipeScanner.manual.hint')}</span>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isAnalyzing}
                      className="w-full bg-gradient-to-r from-[#26A8FF] to-[#0CC5BA] hover:opacity-90 disabled:opacity-50 text-white rounded-2xl h-13 font-semibold transition-all text-base shadow-lg shadow-[#26A8FF]/20"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('common:recipeScanner.manual.generating')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          {t('common:recipeScanner.manual.generateButton')}
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>

              {/* How It Works Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-gray-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900">{t('common:recipeScanner.manual.howItWorks.title')}</h4>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-5">
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#26A8FF]/20 to-[#0CC5BA]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#26A8FF] font-bold text-sm">1</span>
                      </div>
                      <p className="text-sm text-gray-700 pt-1">{t('common:recipeScanner.manual.howItWorks.step1')}</p>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#26A8FF]/20 to-[#0CC5BA]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#26A8FF] font-bold text-sm">2</span>
                      </div>
                      <p className="text-sm text-gray-700 pt-1">{t('common:recipeScanner.manual.howItWorks.step2')}</p>
                    </div>
                    
                    {/* Step 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#26A8FF]/20 to-[#0CC5BA]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#26A8FF] font-bold text-sm">3</span>
                      </div>
                      <p className="text-sm text-gray-700 pt-1">{t('common:recipeScanner.manual.howItWorks.step3')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-gray-50/30 to-white" style={{ 
      paddingTop: 'env(safe-area-inset-top, 0)',
      paddingBottom: 'env(safe-area-inset-bottom, 0)'
    }}>
      {/* Header - Transparent for photo tab, solid for others */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${
          activeTab === "photo"
            ? "bg-gradient-to-b from-black/40 via-black/20 to-transparent border-b-0"
            : "bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm"
        }`}
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <div className="px-5 pb-4">
          {/* Back Button Row */}
          <div className="flex items-center mb-4">
            <motion.button
              onClick={() => navigate(-1)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "photo"
                  ? "bg-black/30 hover:bg-black/40 backdrop-blur-md"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowLeft className={`w-5 h-5 ${activeTab === "photo" ? "text-white" : "text-gray-700"}`} />
            </motion.button>
          </div>

          {/* Title & Tabs - Hidden on photo tab */}
          {activeTab !== "photo" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">{t('common:recipeScanner.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('common:recipeScanner.subtitle')}</p>
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className={`rounded-2xl p-1.5 flex gap-1.5 transition-all ${
            activeTab === "photo"
              ? "bg-white/20 backdrop-blur-xl border border-white/30 mt-4"
              : "bg-gray-100/80 backdrop-blur-sm mt-4"
          }`}>
            <motion.button
              onClick={() => setActiveTab("photo")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "photo"
                  ? "bg-white text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                <span>{t('common:recipeScanner.tabs.photo')}</span>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setActiveTab("gallery")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "gallery"
                  ? "bg-white text-gray-900 shadow-md"
                  : activeTab === "photo"
                    ? "text-white/90"
                    : "text-gray-600 hover:text-gray-800"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center justify-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>{t('common:recipeScanner.tabs.gallery')}</span>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "manual"
                  ? "bg-white text-gray-900 shadow-md"
                  : activeTab === "photo"
                    ? "text-white/90"
                    : "text-gray-600 hover:text-gray-800"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center justify-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>{t('common:recipeScanner.tabs.manual')}</span>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative h-full">
        <AnimatePresence mode="wait">
          {activeTab === "photo" && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {renderPhotoView()}
            </motion.div>
          )}
          {activeTab === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {renderGalleryView()}
            </motion.div>
          )}
          {activeTab === "manual" && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {renderManualView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {errorModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{
                paddingTop: 'max(24px, env(safe-area-inset-top, 24px))',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))'
              }}
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{errorTitle}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Suggestion Box */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#26A8FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{t('common:recipeScanner.errors.suggestion')}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{errorSuggestion}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setErrorModalOpen(false)}
                      className="w-full bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] text-white rounded-2xl h-12 font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      {t('common:recipeScanner.errors.tryAgain')}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setErrorModalOpen(false);
                        setActiveTab('manual');
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl h-12 font-semibold transition-all"
                    >
                      {t('common:recipeScanner.errors.switchToManual')}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
