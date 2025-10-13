import React, { useState, useRef, useEffect, FC } from 'react';
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Camera, X, ArrowLeft, Loader2, ImageIcon, Utensils, Barcode, FileText, Pencil, Plus } from "lucide-react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next'; 
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Define schema factory to use translations
const createManualFoodSchema = (t: any) => z.object({
  name: z.string().min(1, t('addFood.validationErrors.nameRequired')),
  calories: z.string().min(1, t('addFood.validationErrors.caloriesRequired')).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: t('addFood.validationErrors.caloriesPositive') }
  ),
  protein: z.string().min(1, t('addFood.validationErrors.proteinRequired')).refine(
    (val) => !isNaN(parseFloat(val)),
    { message: t('addFood.validationErrors.proteinNumber') }
  ),
  carbs: z.string().min(1, t('addFood.validationErrors.carbsRequired')).refine(
    (val) => !isNaN(parseFloat(val)),
    { message: t('addFood.validationErrors.carbsNumber') }
  ),
  fat: z.string().min(1, t('addFood.validationErrors.fatRequired')).refine(
    (val) => !isNaN(parseFloat(val)),
    { message: t('addFood.validationErrors.fatNumber') }
  ),
  quantity: z.string().min(1, t('addFood.validationErrors.quantityRequired')).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: t('addFood.validationErrors.quantityPositive') }
  ),
  unit: z.string().min(1, t('addFood.validationErrors.unitRequired')),
})

export default function EnhancedAddFood() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedFood, setDetectedFood] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<'food' | 'barcode' | 'label' | 'gallery'>('food');
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Create schema with translations
  const manualFoodSchema = createManualFoodSchema(t);
  type ManualFoodForm = z.infer<typeof manualFoodSchema>;
  
  // Disable scrolling on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Add effect to handle camera initialization
  useEffect(() => {
    if (activeTab === 'camera') {
      // Reset camera error when switching to camera tab
      setCameraError(null);
      // Small timeout to ensure component is properly mounted
      const timer = setTimeout(() => {
        if (!isCameraReady && !cameraError && webcamRef.current) {
          console.log('[AddFood] Attempting to initialize camera...');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, isCameraReady, cameraError]);

  // Initialize form for manual entry
  const form = useForm<ManualFoodForm>({
    resolver: zodResolver(manualFoodSchema),
    defaultValues: {
      name: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      quantity: "1",
      unit: "serving",
    },
  });

  // Handle manual form submission
  const onManualSubmit = async (data: ManualFoodForm) => {
    console.log('[EnhancedAddFood] Submitting food data:', data);
    
    try {
      // Prepare the food log data
      const foodLogData = {
        name: data.name,
        calories: parseFloat(data.calories),
        protein: parseFloat(data.protein),
        carbs: parseFloat(data.carbs),
        fat: parseFloat(data.fat),
        image: capturedImage || null,
        date: new Date().toISOString(),
        components: [{
          name: data.name,
          calories: parseFloat(data.calories),
          protein: parseFloat(data.protein),
          carbs: parseFloat(data.carbs),
          fat: parseFloat(data.fat),
          servingSize: `${data.quantity} ${data.unit}`,
          quantity: parseFloat(data.quantity),
          details: {
            type: 'main dish',
            preparation: 'as served'
          }
        }]
      };

      console.log('[EnhancedAddFood] Sending POST request to /api/food-logs:', foodLogData);

      // Send the food log to the API
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(foodLogData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save food log');
      }

      const result = await response.json();
      console.log('[EnhancedAddFood] Food log saved successfully:', result);

      toast({
        title: "Food added successfully",
        description: `Added ${data.name} to your food log`,
      });
      
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
      
    } catch (error) {
      console.error('[EnhancedAddFood] Error adding food:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add food. Please try again.",
      });
    }
  };

  // Handle file selection for upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsAnalyzing(true);
    
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock detected food
        const mockFoodData = {
          name: "Apple",
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          quantity: 1,
          unit: "medium",
        };
        
        setDetectedFood(mockFoodData);
        
        // Auto-fill the form
        Object.entries(mockFoodData).forEach(([key, value]) => {
          form.setValue(key as keyof ManualFoodForm, String(value));
        });
        
        setIsAnalyzing(false);
        setActiveTab("manual");
      }
    };
    reader.readAsDataURL(file);
  };

  // Capture image from webcam
  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    try {
      // Take screenshot using webcam first, before showing analyzing state
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }
      
      setCapturedImage(imageSrc);
      
      // Then activate full screen analyzing animation
      setIsAnalyzing(true);
      
      // Show animation for at least 3 seconds
      const animationStartTime = Date.now();
      
      // Default food data
      let foodData = {
        name: "Food Item",
        calories: 100,
        protein: 0,
        carbs: 0,
        fat: 0,
        quantity: 1,
        unit: "serving",
      };
      
      try {
        // Get the data URL and convert it to a proper format for the API
        const imageData = imageSrc.replace(/^data:image\/jpeg;base64,/, '');
        
        // Call the vision API to analyze the food image
        const response = await fetch('/api/vision/food-recognition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            imageData,
            format: 'jpeg'
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Use the API result instead of default data
        foodData = {
          name: result.name || "Food Item",
          calories: result.calories || 100,
          protein: result.protein || 0,
          carbs: result.carbs || 0,
          fat: result.fat || 0,
          quantity: 1,
          unit: "serving",
        };
      } catch (apiError) {
        console.error('API error:', apiError);
        // We'll use the default food data defined above
      }
      
      // Ensure animation shows for at least 3 seconds
      const timePassed = Date.now() - animationStartTime;
      const remainingTime = Math.max(0, 3000 - timePassed);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Set the detected food from API data
      setDetectedFood(foodData);
      
      // Auto-fill the form
      Object.entries(foodData).forEach(([key, value]) => {
        form.setValue(key as keyof ManualFoodForm, String(value));
      });
      
      // Turn off analyzing state after processing is done
      setIsAnalyzing(false);
      setActiveTab("manual");
      
    } catch (error) {
      console.error('Error capturing image:', error);
      toast({
        variant: "destructive",
        title: t('addFood.errors.cameraError'),
        description: t('addFood.errors.captureError'),
      });
      setIsAnalyzing(false);
    }
  };

  // Render camera view for food scanning
  const renderCameraView = () => {
    return (
      <div className="h-full relative bg-gray-100 overflow-hidden">
        <div className="relative overflow-hidden h-full w-full bg-black">
          {/* Display the burger image instead of camera */}
          <img 
            src="/images/burger.jpg"
            alt="Delicious burger"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
            className="opacity-100"
          />
        </div>
        
        {/* Backdrop overlay for better contrast with enhanced gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none"></div>

        {/* Header with navigation controls and mode tabs */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="flex justify-between items-center p-4 bg-white/90 shadow-sm">
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-gray-800 text-base font-semibold">{t('addFood.title')}</div>
            
            <div className="w-10 h-10"></div> {/* Empty space for alignment */}
          </div>
          
          {/* Mode selection tabs at top */}
          <div className="flex justify-center px-4 py-2 bg-white/90">
            <div className="bg-gray-100 rounded-full p-1 flex w-full max-w-xs">
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === "camera" 
                    ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>{t('addFood.camera')}</span>
              </button>
              
              <button
                onClick={() => {
                  setMode("gallery");
                  fileInputRef.current?.click();
                }}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                  text-gray-500 hover:text-gray-700`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>{t('addFood.gallery')}</span>
              </button>
              
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === "manual" 
                    ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Pencil className="h-4 w-4" />
                <span>{t('addFood.manual')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI-enhanced scanning frame with animated elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm aspect-square"
          >
            {/* Scanning animation */}
            <motion.div
              initial={{ top: "0%" }}
              animate={{
                top: ["0%", "100%", "0%"],
              }}
              transition={{
                duration: 2,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-[#0E95A7]/20 via-[#0E95A7] to-[#0E95A7]/20 animate-scanline opacity-80"
            />

            {/* Frame corners */}
            <motion.div
              animate={{
                opacity: [1, 0.5, 1],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#0E95A7] rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-[#0E95A7] rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-[#0E95A7] rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#0E95A7] rounded-br-2xl" />
            </motion.div>
          </motion.div>
        </div>

        {/* Mode Selection Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-32 left-0 right-0 px-6"
        >
          <div className="flex justify-center gap-3 max-w-[400px] mx-auto">
            {[
              { id: 'food' as const, icon: Utensils, label: 'Food' },
              { id: 'barcode' as const, icon: Barcode, label: 'Barcode' },
              { id: 'label' as const, icon: FileText, label: 'Label' },
              { id: 'gallery' as const, icon: ImageIcon, label: 'Gallery' }
            ].map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setMode(item.id);
                  if (item.id === 'gallery') {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-xl backdrop-blur-md border ${
                  mode === item.id 
                    ? 'bg-[#0E95A7]/20 border-[#0E95A7]/50 text-gray-800' 
                    : 'bg-white/80 border-gray-200 text-gray-600'
                }`}
              >
                <item.icon className={`w-5 h-5 mb-1 ${mode === item.id ? 'text-[#0E95A7]' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Capture Button with outer glow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-8 inset-x-0 flex justify-center z-30"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCapture}
            disabled={isAnalyzing || mode === 'gallery'}
            className={`relative w-24 h-24 ${mode === 'gallery' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Enhanced outer glow effect - brighter and more vibrant */}
            <div className="absolute inset-0 rounded-full bg-[#0CC5BA]/30 blur-xl" />
            
            {/* Outer ring with gradient */}
            <div className="absolute inset-0 rounded-full bg-white shadow-lg border border-gray-200" />
            
            {/* Inner ring with new gradient and pulsing animation */}
            <motion.div 
              animate={{ 
                boxShadow: ['0 0 10px 2px rgba(12, 197, 186, 0.3)', '0 0 15px 3px rgba(12, 197, 186, 0.5)', '0 0 10px 2px rgba(12, 197, 186, 0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-3 rounded-full bg-gradient-to-br from-[#0CC5BA] via-[#0CC5BA] to-[#09A296] shadow-inner" 
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              {isAnalyzing ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: [0.8, 1.1, 0.8], 
                    rotate: 360 
                  }}
                  transition={{ 
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }
                  }}
                  className="relative h-14 w-14"
                >
                  <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                  <div className="absolute inset-0 rounded-full border-t-4 border-[#0CC5BA] animate-spin"></div>
                  <Loader2 className="absolute inset-0 m-auto h-10 w-10 text-white" />
                </motion.div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white" />
                </div>
              )}
              
              {/* Small text indicator below capture button */}
              {isAnalyzing && (
                <motion.p 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-12 whitespace-nowrap text-gray-700 text-sm font-medium"
                >
                  {t('addFood.analyzing')}
                </motion.p>
              )}
            </div>
          </motion.button>
        </motion.div>
      </div>
    );
  };

  // Render manual entry view
  const renderManualEntryView = () => {
    return (
      <div className="h-full bg-white overflow-auto">
        {/* Use the same header design as the camera view */}
        <div className="sticky top-0 z-50 bg-white">
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-base font-semibold">{t('addFood.title')}</div>
            
            <div className="w-10 h-10"></div> {/* Empty space for alignment */}
          </div>
          
          {/* Mode selection tabs at top */}
          <div className="flex justify-center px-4 py-2 border-b">
            <div className="bg-gray-100 rounded-full p-1 flex w-full max-w-xs">
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                  text-gray-600 hover:text-gray-900`}
              >
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </button>
              
              <button
                onClick={() => {
                  setMode("gallery");
                  fileInputRef.current?.click();
                }}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                  text-gray-600 hover:text-gray-900`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Gallery</span>
              </button>
              
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                  bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white`}
              >
                <Pencil className="h-4 w-4" />
                <span>Manual</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-5 pb-20 max-w-lg mx-auto">
          {capturedImage && (
            <Card className="mb-5 overflow-hidden rounded-xl border border-gray-200">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img 
                  src={capturedImage} 
                  alt="Captured food" 
                  className="w-full h-full object-cover"
                />
                {detectedFood && (
                  <div className="absolute top-3 right-3 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full">
                    Wykryto
                  </div>
                )}
              </div>
              {detectedFood && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{detectedFood.name}</p>
                  <p className="text-xs text-gray-600">
                    {detectedFood.calories} cal • {detectedFood.protein}g protein • {detectedFood.carbs}g carbs • {detectedFood.fat}g fat
                  </p>
                </div>
              )}
            </Card>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">{t('addFood.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Jabłko, Pierś z kurczaka" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">{t('addFood.quantity')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">{t('addFood.unit')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz jednostkę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="g">Gramy (g)</SelectItem>
                          <SelectItem value="oz">Uncje (oz)</SelectItem>
                          <SelectItem value="cup">Szklanka</SelectItem>
                          <SelectItem value="serving">Porcja</SelectItem>
                          <SelectItem value="piece">Sztuka</SelectItem>
                          <SelectItem value="small">Mała</SelectItem>
                          <SelectItem value="medium">Średnia</SelectItem>
                          <SelectItem value="large">Duża</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">{t('addFood.calories')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} />
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
                      <FormLabel className="text-gray-700">{t('addFood.protein')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="carbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">{t('addFood.carbs')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
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
                      <FormLabel className="text-gray-700">{t('addFood.fat')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] hover:from-[#0E95A7]/90 hover:to-[#1E6F7D]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addFood.addToLog')}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        aria-label="Upload food image"
      />

      {/* Enhanced Loading Overlay with Animation */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] overflow-hidden"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {capturedImage && (
            <motion.div 
              initial={{ scale: 1.2, opacity: 0.3 }}
              animate={{ 
                scale: [1.2, 1.05, 1.2],
                opacity: [0.3, 0.2, 0.3]
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 z-0 overflow-hidden"
            >
              <img 
                src={capturedImage} 
                alt="Food background" 
                className="w-full h-full object-cover opacity-20 blur-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
            </motion.div>
          )}
          
          {/* Enhanced scanning effects */}
          <motion.div 
            className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
          >
            {/* Scanning lines animation */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`line-${i}`}
                initial={{ y: -100, opacity: 0.7 }}
                animate={{ y: ["100%", "-10%"] }}
                transition={{
                  duration: 2.5 + (i * 0.7),
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.6
                }}
                className="absolute w-full h-0.5 bg-gradient-to-r from-[#0E95A7]/0 via-[#0E95A7] to-[#0E95A7]/0"
              />
            ))}
            
            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: window.innerHeight + 50,
                  opacity: 0 
                }}
                animate={{
                  y: -50,
                  x: Math.random() * window.innerWidth,
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: Math.random() * 2,
                }}
                className="absolute w-2 h-2 bg-[#0CC5BA] rounded-full"
              />
            ))}
            
            {/* Grid pattern overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(12, 197, 186, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(12, 197, 186, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />
          </motion.div>

          {/* AI Analysis animation card */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative bg-black/80 rounded-2xl p-8 w-4/5 max-w-sm text-center border border-[#0E95A7]/30 shadow-2xl shadow-[#0E95A7]/10 backdrop-blur-md z-20"
          >
            {/* Glowing orb animation */}
            <motion.div 
              className="relative w-24 h-24 mx-auto mb-6"
            >
              {/* Pulsing circles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.6, opacity: 0.5 }}
                  animate={{ 
                    scale: [0.6, 1.2, 0.6], 
                    opacity: [0.2, 0.5, 0.2]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.7,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full border-2 border-[#0E95A7]/30"
                />
              ))}
              
              {/* Spinning loader */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full border-b-2 border-r-2 border-[#0E95A7]" />
              </motion.div>
              
              {/* Inner spinner */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 flex items-center justify-center"
              >
                <div className="w-14 h-14 rounded-full border-t-2 border-l-2 border-[#0E95A7]/70" />
              </motion.div>
              
              {/* Center icon/pulse */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0CC5BA] to-[#0E95A7]/70 blur-sm" />
                <Loader2 className="absolute w-12 h-12 text-[#0E95A7] animate-spin" />
              </motion.div>
            </motion.div>
            
            {/* Text with typing animation */}
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xl font-semibold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
            >
              Analyzing Food
            </motion.h3>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-gray-400 mb-6"
            >
              Using AI to identify nutritional content...
            </motion.p>
            
            {/* Animated progress bar */}
            <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ 
                  duration: 3.5, 
                  ease: [0.4, 0.0, 0.2, 1],
                  repeat: Infinity
                }}
                className="h-full bg-gradient-to-r from-[#0CC5BA] via-[#0E95A7] to-[#1E6F7D]"
              />
            </div>
            
            {/* Analyzing steps */}
            <div className="mt-5 text-left">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="flex items-center text-xs text-gray-400 mb-2"
              >
                <div className="w-4 h-4 rounded-full bg-[#0E95A7]/20 border border-[#0E95A7]/30 flex items-center justify-center mr-2">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#0E95A7]" />
                </div>
                <span>Identifying food items</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="flex items-center text-xs text-gray-400 mb-2"
              >
                <div className="w-4 h-4 rounded-full bg-[#0E95A7]/20 border border-[#0E95A7]/30 flex items-center justify-center mr-2">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} className="w-2 h-2 rounded-full bg-[#0E95A7]" />
                </div>
                <span>Calculating nutritional values</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.0, duration: 0.5 }}
                className="flex items-center text-xs text-gray-400"
              >
                <div className="w-4 h-4 rounded-full bg-[#0E95A7]/20 border border-[#0E95A7]/30 flex items-center justify-center mr-2">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }} className="w-2 h-2 rounded-full bg-[#0E95A7]" />
                </div>
                <span>Preparing results</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {cameraError ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-screen flex items-center justify-center text-center"
        >
          <div className="text-white px-6">
            <p className="text-lg mb-2">Camera access denied</p>
            <p className="text-sm text-gray-400">Please enable camera access to use this feature</p>
            <Button
              onClick={() => setActiveTab("manual")}
              className="mt-6 bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] hover:from-[#0E95A7]/90 hover:to-[#1E6F7D]/90"
            >
              Enter Manually Instead
            </Button>
          </div>
        </motion.div>
      ) : (
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "camera" | "manual")}
          className="h-screen relative"
        >
          <TabsContent value="camera" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden" style={{ overflowY: 'hidden' }}>
            {renderCameraView()}
          </TabsContent>
          <TabsContent value="manual" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden" style={{ overflowY: 'hidden' }}>
            {renderManualEntryView()}
          </TabsContent>
          
          {/* Hidden TabsList for state management - not displayed */}
          <TabsList className="hidden">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}