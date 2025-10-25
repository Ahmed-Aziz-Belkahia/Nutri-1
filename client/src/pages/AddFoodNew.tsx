import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Webcam from 'react-webcam';
import { Camera, AlertTriangle, ArrowLeft, Sparkles, Loader2, Image as ImageIcon, Edit3 } from "lucide-react";
import { useFoodLog } from '@/hooks/use-food-log';
import { analyzeFoodText } from '@/lib/vision';

// Form schemas
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  calories: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Calories must be a positive number",
  }),
  protein: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Protein must be a number",
  }),
  carbs: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Carbs must be a number",
  }),
  fat: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Fat must be a number",
  }),
});

const textAnalysisSchema = z.object({
  text: z.string().min(1, "Food description is required"),
});

interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string | null;
  details?: Record<string, any>;
}

export default function AddFoodNew() {
  const [, setLocation] = useLocation();
  const navigate = (delta: number) => {
    if (delta === -1) {
      setLocation('/dashboard');
    }
  };
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"photo" | "gallery" | "manual">("photo");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorSuggestion, setErrorSuggestion] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addFood } = useFoodLog();

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [webcamKey, setWebcamKey] = useState(0);
  const [cameraConstraints] = useState<any>({
    facingMode: 'environment',
    aspectRatio: 9/16,
    width: { ideal: 1080 },
    height: { ideal: 1920 }
  });

  // Forms
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    },
  });

  const textForm = useForm<z.infer<typeof textAnalysisSchema>>({
    resolver: zodResolver(textAnalysisSchema),
    defaultValues: {
      text: "",
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
        video: { facingMode: 'environment' }, 
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
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        throw new Error("Failed to capture image");
      }

      toast({
        title: "Photo Captured",
        description: "Analyzing your meal...",
      });

      localStorage.setItem('pendingFoodImage', screenshot);
      localStorage.setItem('pendingFoodName', 'Analyzing...');
      setLocation("/dashboard");
    } catch (error) {
      console.error('Capture Error:', error);
      handleAnalysisError(error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64data = reader.result as string;
          
          toast({
            title: "Photo Uploaded",
            description: "Analyzing your meal...",
          });

          localStorage.setItem('pendingFoodImage', base64data);
          localStorage.setItem('pendingFoodName', 'Analyzing...');
          setLocation("/dashboard");
        } catch (analysisError) {
          console.error('Upload Analysis Error:', analysisError);
          handleAnalysisError(analysisError);
        }
      };
      
      reader.onerror = (fileReadError) => {
        console.error('File Read Error:', fileReadError);
        setErrorTitle("File Reading Error");
        setErrorMessage("We couldn't read your image file.");
        setErrorSuggestion("The file might be corrupted. Try selecting a different image or take a new photo.");
        setErrorModalOpen(true);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      handleAnalysisError(error);
    }
  };

  const handleAnalysisError = (error: unknown) => {
    console.error('Analysis Error:', error);
    
    let errorTitle = "Analysis Error";
    let errorMessage = "Failed to analyze food";
    let suggestion = "Try a different image or manual entry";
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid image format') || error.message.includes('unsupported image')) {
        errorTitle = "Unsupported Image";
        errorMessage = "Unsupported image format.";
        suggestion = "Please use JPEG, PNG, GIF, or WEBP images. Try taking a new photo or switching to manual entry";
      } else if (error.message.includes('HTTP error! status: 500')) {
        errorTitle = "AI Processing Error";
        errorMessage = "Server error analyzing image.";
        suggestion = "Our AI had trouble with this image. Try with better lighting or a clearer view of the food.";
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

  // Handle manual form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await addFood({
        name: values.name,
        calories: Number(values.calories),
        protein: Number(values.protein),
        carbs: Number(values.carbs),
        fat: Number(values.fat),
        image: null
      });

      toast({
        title: "Success",
        description: `Added ${values.name} to log`,
      });

      setLocation("/dashboard");
    } catch (error) {
      console.error('Error adding food:', error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add food to log",
      });
    }
  };

  // Handle text AI analysis
  const onTextSubmit = async (values: z.infer<typeof textAnalysisSchema>) => {
    try {
      setIsAnalyzing(true);
      
      if (!values.text || values.text.trim() === '') {
        throw new Error('Please enter a food description');
      }
      
      const result = await analyzeFoodText(values.text);
      
      if (!result || typeof result.name !== 'string' || typeof result.calories !== 'number') {
        throw new Error('Invalid analysis result: Missing required data');
      }
      
      const foodData = {
        name: result.name,
        calories: typeof result.calories === 'number' ? result.calories : 0,
        protein: typeof result.protein === 'number' ? result.protein : 0,
        carbs: typeof result.carbs === 'number' ? result.carbs : 0,
        fat: typeof result.fat === 'number' ? result.fat : 0,
        components: Array.isArray(result.components) ? result.components : [],
        image: null
      };
      
      await addFood(foodData);

      toast({
        title: "Success",
        description: `Added ${result.name} to your log`,
      });

      setLocation("/dashboard");
    } catch (error) {
      console.error('Error in text submission process:', error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to analyze food description. Try being more specific or use manual entry."
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
              <p className="text-white/80 text-sm font-medium">Initializing camera...</p>
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
              <h3 className="text-white text-xl font-bold mb-2">Camera Access Required</h3>
              <p className="text-white/60 text-sm mb-8">{cameraError}</p>
              <div className="space-y-3">
                <Button
                  onClick={requestCameraPermission}
                  className="w-full bg-[#26A8FF] hover:bg-[#1A8FE6] text-white rounded-full h-12 font-semibold shadow-lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Enable Camera
                </Button>
                <Button
                  onClick={() => setActiveTab('manual')}
                  variant="ghost"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-full h-12"
                >
                  Use Manual Entry Instead
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
            <p className="text-white/80 text-sm font-medium mb-4">Tap to capture your meal</p>
            
            {/* Capture Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCapture}
              className="relative w-20 h-20 rounded-full flex items-center justify-center group"
            >
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />
              
              {/* Pulsing Effect */}
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
              
              {/* Inner Circle */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center shadow-2xl group-active:scale-95 transition-transform">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </motion.button>

            {/* Gallery Quick Access */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Choose from Gallery</span>
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

  // Gallery view - redirects to file input
  const renderGalleryView = () => {
    // Automatically trigger file input when gallery tab is selected
    React.useEffect(() => {
      fileInputRef.current?.click();
      // Return to photo tab after selection
      setActiveTab("photo");
    }, []);

    return null;
  };

  // Manual entry view - Clean and organized
  const renderManualView = () => {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/30 to-white overflow-auto">
        <div className="min-h-full flex flex-col" style={{ paddingTop: '120px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          <div className="flex-1 px-5">
            <div className="max-w-md mx-auto space-y-6">
              {/* AI Analysis Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-[#26A8FF]/5 to-[#1A8FE6]/5 px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] flex items-center justify-center shadow-md">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">AI-Powered Analysis</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Just describe what you ate</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6">
                  <Form {...textForm}>
                    <form onSubmit={textForm.handleSubmit(onTextSubmit)} className="space-y-4">
                      <FormField
                        control={textForm.control}
                        name="text"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <textarea
                                  placeholder="e.g., Two scrambled eggs with spinach, whole wheat toast with avocado, and a banana"
                                  {...field}
                                  rows={5}
                                  className="w-full rounded-2xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 p-4 resize-none transition-all text-gray-900 placeholder:text-gray-400 text-sm leading-relaxed"
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                  Be specific for best results
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] hover:shadow-xl disabled:opacity-50 text-white rounded-full h-13 font-semibold transition-all text-base"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Analyze & Add to Log
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </motion.div>

              {/* Divider with "OR" */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <div className="px-3 py-1.5 bg-gray-100 rounded-full">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Or Enter Manually</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>

              {/* Manual Entry Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-md">
                      <Edit3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Manual Entry</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Enter nutrition facts directly</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      {/* Food Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-gray-700 mb-2 block">Food Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Greek Yogurt, Grilled Chicken" 
                                {...field} 
                                className="rounded-xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 h-12 transition-all text-base" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Nutrition Grid */}
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-700">Nutrition Information</p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="calories"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Calories</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      step="1" 
                                      min="0" 
                                      placeholder="0"
                                      {...field} 
                                      className="rounded-xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 h-12 transition-all pr-10 text-base" 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kcal</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Protein</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      min="0" 
                                      placeholder="0"
                                      {...field} 
                                      className="rounded-xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 h-12 transition-all pr-8 text-base" 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">g</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Carbs</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      min="0" 
                                      placeholder="0"
                                      {...field} 
                                      className="rounded-xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 h-12 transition-all pr-8 text-base" 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">g</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="fat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fat</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      min="0" 
                                      placeholder="0"
                                      {...field} 
                                      className="rounded-xl border-2 border-gray-200 focus:border-[#26A8FF] focus:ring-4 focus:ring-[#26A8FF]/10 h-12 transition-all pr-8 text-base" 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">g</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={isAnalyzing}
                        className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-full h-13 font-semibold transition-all text-base shadow-lg"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Add to Food Log'
                        )}
                      </Button>
                    </form>
                  </Form>
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
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <div className="px-5 pb-4">
          {/* Back Button Row */}
          <div className="flex items-center mb-4">
            <motion.button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </motion.button>
          </div>

          {/* Title & Tabs */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Add Food</h1>
              <p className="text-sm text-gray-500 mt-1">Log your meals effortlessly</p>
            </div>

            {/* Tab Selector */}
            <div className="bg-gray-100/80 backdrop-blur-sm rounded-2xl p-1.5 flex gap-1.5">
              <motion.button
                onClick={() => setActiveTab("photo")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === "photo"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>Photo</span>
                </div>
              </motion.button>

              <motion.button
                onClick={() => setActiveTab("gallery")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === "gallery"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Gallery</span>
                </div>
              </motion.button>

              <motion.button
                onClick={() => setActiveTab("manual")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === "manual"
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  <span>Manual</span>
                </div>
              </motion.button>
            </div>
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
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {errorTitle}
            </DialogTitle>
            <DialogDescription className="text-gray-800 text-base pt-2">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 p-4 rounded-2xl text-sm text-red-800">
            {errorSuggestion}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setErrorModalOpen(false);
                setActiveTab('manual');
              }}
              className="w-full sm:w-auto rounded-xl"
            >
              Switch to Manual
            </Button>
            <Button 
              onClick={() => setErrorModalOpen(false)}
              className="w-full sm:w-auto bg-[#26A8FF] hover:bg-[#1A8FE6] rounded-xl"
            >
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
