import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Webcam from 'react-webcam';
import { Camera, ArrowLeft, ImageIcon, AlignLeft, AlertTriangle, Pencil, X, Loader2 } from "lucide-react";
import { useFoodLog } from '@/hooks/use-food-log';
import { analyzeFoodText } from '@/lib/vision';
import CameraUI from '@/components/CameraUI';
import CaptureButton from '@/components/CaptureButton';

// Form schema for manual food entry
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

// Form schema for the text-based food analysis
const textAnalysisSchema = z.object({
  text: z.string().min(1, "Food description is required"),
});

// Interface for food analysis result
interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string | null;
  details?: Record<string, any>;
}

export default function AddFood() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"camera" | "gallery" | "manual">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorSuggestion, setErrorSuggestion] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addFood } = useFoodLog();
  // Heuristic to detect in-app browsers where camera may be blocked (FB/IG/TikTok/etc.)
  const isInAppBrowser = (() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /(FBAN|FBAV|Instagram|Line|Snapchat|TikTok|Twitter|WeChat|Discord)/i.test(ua);
  })();
  // Camera handling state
  const [cameraAttempts, setCameraAttempts] = useState(0);
  const [webcamKey, setWebcamKey] = useState(0);
  const [cameraConstraints, setCameraConstraints] = useState<any>({
    facingMode: 'environment',
    aspectRatio: 4/3,
    width: { ideal: 1280 },
    height: { ideal: 720 }
  });
  // Gate mounting the Webcam until we've either confirmed permission is already granted
  // or the user explicitly taps Enable Camera. This avoids autoplay overlays on Android/iOS.
  const [cameraReady, setCameraReady] = useState(true); // Start as true, set to false only if there's an error
  const [needsPlayGesture, setNeedsPlayGesture] = useState(false);
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : true;
  useEffect(() => {
    let cancelled = false;
    // No need to check permission upfront - just let the Webcam component handle it
    // If it fails, the onUserMediaError callback will be triggered
    return () => {
      cancelled = true;
    };
  }, []);
  
  // Disable scrolling on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  // For text analysis
  const [manualEntryMode, setManualEntryMode] = useState<"form" | "text">("text");
  
  // For manual food entry with form
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
  
  // For text-based food entry
  const textForm = useForm<z.infer<typeof textAnalysisSchema>>({
    resolver: zodResolver(textAnalysisSchema),
    defaultValues: {
      text: "",
    },
  });

  // Handle form submission for manual entry
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Add to food log
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

  // Explicitly request native camera permission via a user gesture and then mount Webcam
  const requestNativeCameraPrompt = async () => {
    try {
      setCameraError(null);
  // Trigger native prompt with a broad constraint first; stop tracks immediately
  // Using { video: true } increases prompt reliability on Android
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false as any });
      stream.getTracks().forEach(t => t.stop());
      // After permission, try to pick a rear camera device on Android where facingMode can be ignored
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        // Prefer labels that include back/rear/environment
        const rear = videoInputs.find(d => /back|rear|environment/i.test(d.label));
        const fallbackRear = videoInputs.length > 1 ? videoInputs[videoInputs.length - 1] : videoInputs[0];
        const chosen = rear || fallbackRear;
        if (chosen && chosen.deviceId) {
          setCameraConstraints({
            aspectRatio: 4/3,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            deviceId: { exact: chosen.deviceId }
          });
        } else {
          // Keep environment hint if we couldn't resolve a device id
          setCameraConstraints({
            facingMode: 'environment',
            aspectRatio: 4/3,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          });
        }
      } catch {
        // Ignore enumerateDevices failures; we'll rely on facingMode
      }
      setCameraReady(true);
      setCameraAttempts(0);
      setWebcamKey((k) => k + 1);
      // After mounting, attempt to start playback; if blocked, require tap
      setTimeout(() => {
        const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
        if (video && (video.paused || video.readyState < 2)) {
          video.play().catch(() => setNeedsPlayGesture(true));
        }
      }, 100);
    } catch (err) {
      console.error('Camera permission request failed:', err);
      setCameraError("Camera permission was blocked or denied. Open site/app settings to allow camera, or use Manual entry.");
      // Prepare easier constraints for a subsequent attempt
      setCameraAttempts((prev) => {
        const next = prev + 1;
        if (next === 1) {
          setCameraConstraints({
            facingMode: 'environment',
            aspectRatio: 4/3,
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 }
          });
        } else if (next === 2) {
          setCameraConstraints({
            facingMode: 'user',
            aspectRatio: 4/3,
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 }
          });
        }
        return next;
      });
    }
  };

  const kickstartPlayback = async () => {
    try {
      const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
      if (video) {
        await video.play();
        setNeedsPlayGesture(false);
      }
    } catch (e) {
      console.warn('Playback start blocked:', e);
      setNeedsPlayGesture(true);
    }
  };

  // Handle image capture from webcam
  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    try {
      // Capture image
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        throw new Error("Failed to capture image");
      }
      
      setCapturedImage(screenshot);

      toast({
        title: "Photo Captured",
        description: "Analyzing your meal...",
      });

      // Store the image data for later use
      localStorage.setItem('pendingFoodImage', screenshot);
  localStorage.setItem('pendingFoodName', 'Analyzing...');

      // Immediately navigate to dashboard
      console.log('[AddFood] Navigating to dashboard...');
      setLocation("/dashboard");
    } catch (error) {
      console.error('Capture Error:', error);
      handleAnalysisError(error);
    }
  };
  
  // Handle file upload for gallery mode
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64data = reader.result as string;
          setCapturedImage(base64data);
          
          toast({
            title: "Photo Uploaded",
            description: "Analyzing your meal...",
          });

          // Store the image data for later use
          localStorage.setItem('pendingFoodImage', base64data);
          localStorage.setItem('pendingFoodName', 'Analyzing...');
  
          // Immediately navigate to dashboard
          console.log('[AddFood] Navigating to dashboard after upload...');
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

  // Separate function to handle analysis errors with detailed messages
  const handleAnalysisError = (error: unknown) => {
    console.error('Analysis Error:', error);
    
    // Create more user-friendly error messages
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
      } else if (error.message.includes('HTTP error! status: 413')) {
        errorTitle = "Image Too Large";
        errorMessage = "Image too large.";
        suggestion = "Please use a smaller image or try taking another photo with lower resolution.";
      } else {
        errorMessage = error.message;
      }
    }
    
    // Show the custom error modal
    setErrorTitle(errorTitle);
    setErrorMessage(errorMessage);
    setErrorSuggestion(suggestion);
    setErrorModalOpen(true);
    setIsAnalyzing(false);
  };

  // Handle text submission for analysis
  const onTextSubmit = async (values: z.infer<typeof textAnalysisSchema>) => {
    try {
      setIsAnalyzing(true);
      
      // Validate input
      if (!values.text || values.text.trim() === '') {
        throw new Error('Please enter a food description');
      }
      
      // Use the API to analyze the food description
      console.log('Analyzing text:', values.text);
      
      try {
        // This will use the improved analyzeFoodText function that handles name improvements
        const result = await analyzeFoodText(values.text);
        console.log('Analysis result:', result);
        
        // Ensure we have the required properties before proceeding
        if (!result || typeof result.name !== 'string' || typeof result.calories !== 'number') {
          throw new Error('Invalid analysis result: Missing required data');
        }
        
        // Prepare food data with proper defaults for any missing values
        const foodData = {
          name: result.name,
          calories: typeof result.calories === 'number' ? result.calories : 0,
          protein: typeof result.protein === 'number' ? result.protein : 0,
          carbs: typeof result.carbs === 'number' ? result.carbs : 0,
          fat: typeof result.fat === 'number' ? result.fat : 0,
          components: Array.isArray(result.components) ? result.components : [],
          image: null
        };
        
        console.log('Sending processed food data to be logged:', foodData);
        
        // Add the analyzed food to log
        const addResult = await addFood(foodData);
        console.log('Food added to log:', addResult);

        toast({
          title: "Success",
          description: `Added ${result.name} to your log`,
        });

        // Navigate to dashboard
        setLocation("/dashboard");
      } catch (analysisError) {
        console.error('Food analysis error:', analysisError);
        throw new Error(
          analysisError instanceof Error 
            ? analysisError.message 
            : 'Failed to analyze food. Please try again or use manual entry.'
        );
      }
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

  // Handle tab change
  const handleTabChange = (tab: "camera" | "gallery" | "manual") => {
    setActiveTab(tab);
  };

  // Handle gallery button click
  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  // Scanner view with enhanced camera UI
  const renderScannerView = () => {
    return (
      <div className="h-screen w-full overflow-hidden fixed inset-0 bg-black" style={{ overflowY: 'hidden' }}>
        <div className="relative overflow-hidden h-full w-full">
          {cameraReady && (
            <Webcam
              key={webcamKey}
              ref={webcamRef}
              audio={false}
              muted
              playsInline
              autoPlay
              controls={false}
              // Clicking the video also attempts to start playback if needed
              onClick={() => {
                if (needsPlayGesture) kickstartPlayback();
              }}
              onPlay={() => setNeedsPlayGesture(false)}
              screenshotFormat="image/jpeg"
              videoConstraints={cameraConstraints}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
              onUserMedia={() => {
                // Camera started successfully
                setCameraError(null);
                setCameraAttempts(0);
                // Try to auto start playback; some Android contexts need a tap
                const video = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;
                if (video) {
                  video.play().catch(() => setNeedsPlayGesture(true));
                }
              }}
              onUserMediaError={(error) => {
                console.error('Camera Error:', error);
                const name = (error as any)?.name || '';
                const msg = (error as any)?.message || '';
                if (/NotAllowedError|Permission/i.test(name) || /denied|blocked/i.test(msg)) {
                  // Permission blocked or denied – surface enable overlay/instructions
                  setCameraError("Camera permission is blocked or denied. Enable it in site settings, then try again.");
                  setCameraReady(false);
                  return;
                }
                // Progressive fallback attempts
                setCameraAttempts((prev) => {
                  const next = prev + 1;
                  if (next === 1) {
                    // Lower resolution, keep environment camera
                    setCameraConstraints({
                      facingMode: 'environment',
                      aspectRatio: 4/3,
                      width: { ideal: 640, max: 640 },
                      height: { ideal: 480, max: 480 }
                    });
                    setWebcamKey((k) => k + 1);
                  } else if (next === 2) {
                    // Switch to front camera as a fallback
                    setCameraConstraints({
                      facingMode: 'user',
                      aspectRatio: 4/3,
                      width: { ideal: 640, max: 640 },
                      height: { ideal: 480, max: 480 }
                    });
                    setWebcamKey((k) => k + 1);
                  } else {
                    setCameraError(
                      "We couldn't access your camera. Check browser permissions (HTTPS required on mobile) or use manual entry."
                    );
                  }
                  return next;
                });
              }}
            />
          )}

          {/* Secure context / playback gesture overlays */}
          {cameraReady && needsPlayGesture && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm px-6 text-center">
              <div className="text-white">
                <h2 className="text-xl font-semibold mb-2">Tap to Start Camera</h2>
                <p className="text-white/80 max-w-md mx-auto">
                  Your browser requires a tap to start the camera stream.
                </p>
              </div>
              <Button type="button" onClick={kickstartPlayback} className="bg-[#0E95A7] hover:bg-[#0D8495]">
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
              <button onClick={() => { setActiveTab('gallery'); handleGalleryClick(); }} className="text-white/70 underline text-sm">Use Device Camera (no live preview)</button>
            </div>
          )}

          {!isSecure && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm px-6 text-center">
              <div className="text-white">
                <h2 className="text-xl font-semibold mb-2">Camera Blocked</h2>
                <p className="text-white/80 max-w-md mx-auto">
                  This page isn’t using HTTPS, so the camera is blocked. Open the app over HTTPS or use Gallery/Manual.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Button type="button" variant="outline" onClick={() => { setActiveTab('gallery'); handleGalleryClick(); }} className="w-full">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Open Device Camera
                </Button>
                <Button type="button" onClick={() => setActiveTab('manual')} className="w-full bg-[#0E95A7] hover:bg-[#0D8495]">
                  <AlignLeft className="mr-2 h-4 w-4" />
                  Manual Entry
                </Button>
              </div>
            </div>
          )}

          {!cameraReady && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/70 backdrop-blur-sm px-6 text-center">
              <div className="text-white">
                <h2 className="text-2xl font-semibold mb-2">Enable Camera</h2>
                <p className="text-white/80 max-w-md mx-auto">
                  Tap the button below to request camera access. On Android, use Chrome and ensure HTTPS.
                  {isInAppBrowser && ' Detected in‑app browser – please open in Chrome for camera support.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Button type="button" onClick={requestNativeCameraPrompt} className="w-full bg-[#0E95A7] hover:bg-[#0D8495]">
                  <Camera className="mr-2 h-4 w-4" />
                  Enable Camera
                </Button>
                <Button type="button" variant="outline" onClick={() => { setActiveTab('gallery'); handleGalleryClick(); }} className="w-full">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Open Device Camera
                </Button>
              </div>
              <button
                onClick={() => setActiveTab('manual')}
                className="text-white/70 underline text-sm"
              >
                Switch to Manual Entry
              </button>
            </div>
          )}
          
          {/* Backdrop overlay for better contrast with enhanced gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none"></div>
          
          {/* Header with navigation controls and mode tabs */}
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="flex justify-between items-center p-4">
              <button
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/10"
                onClick={() => setLocation("/dashboard")}
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-white text-base font-semibold">{t('addFood.title', { defaultValue: 'Add Food' })}</div>
              
              <div className="w-10 h-10"></div> {/* Spacer for alignment */}
            </div>
            
            {/* Mode selection tabs at top */}
            <div className="flex justify-center px-4 py-2">
              <div className="bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 flex w-full max-w-xs">
                <button
                  onClick={() => {
                    setActiveTab("camera");
                    if (!cameraReady) requestNativeCameraPrompt();
                  }}
                  className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                    activeTab === "camera" 
                      ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>{t('addFood.camera', { defaultValue: 'Camera' })}</span>
                </button>
                
                <button
                  onClick={() => { setActiveTab("gallery"); handleGalleryClick(); }}
                  className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                    ${activeTab === "gallery" 
                      ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                      : "text-white/70 hover:text-white"}`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>{t('addFood.gallery', { defaultValue: 'Gallery' })}</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("manual")}
                  className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                    activeTab === "manual" 
                      ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                  <span>{t('addFood.manual', { defaultValue: 'Manual' })}</span>
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
            
          {/* Capture button - Clean design with border */}
          <div className="absolute bottom-20 left-0 right-0 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl relative"
              onClick={handleCapture}
              style={{
                background: "linear-gradient(45deg, #0E95A7, #0CC5BA)"
              }}
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#0CC5BA] flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
            </motion.button>
          </div>

          {/* File input for gallery mode (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
          

        </div>
      </div>
    );
  };

  // Error modal for displaying issues
  const ErrorModal = () => (
    <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-500">
            <AlertTriangle className="mr-2 h-5 w-5" />
            {errorTitle}
          </DialogTitle>
          <DialogDescription className="text-gray-800 text-base font-normal pt-2">
            {errorMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800">
          {errorSuggestion}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setErrorModalOpen(false);
              setActiveTab('manual');
            }}
            className="w-full sm:w-auto"
          >
            Switch to Manual Entry
          </Button>
          <Button 
            onClick={() => setErrorModalOpen(false)}
            className="w-full sm:w-auto bg-[#0E95A7] hover:bg-[#0D8495]"
          >
            Try Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Camera error view when camera access fails
  const renderCameraErrorView = () => (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">Camera Access Error</h2>
      <p className="text-gray-600 text-center max-w-md mb-6">
        {cameraError || "We couldn't access your camera. Check camera permissions or switch to manual entry."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          variant="outline"
          onClick={() => setActiveTab('manual')}
          className="w-full"
        >
          <AlignLeft className="mr-2 h-4 w-4" />
          Switch to Manual
        </Button>
        <Button
          onClick={async () => {
            // If permission wasn't requested yet, do that first to surface the native prompt
            if (!cameraReady) {
              await requestNativeCameraPrompt();
              return;
            }
            // Otherwise retry with next fallback and remount webcam
            setCameraError(null);
            setCameraAttempts((prev) => {
              const next = prev + 1;
              if (next === 1) {
                setCameraConstraints({
                  facingMode: 'environment',
                  aspectRatio: 4/3,
                  width: { ideal: 640, max: 640 },
                  height: { ideal: 480, max: 480 }
                });
              } else {
                setCameraConstraints({
                  facingMode: 'user',
                  aspectRatio: 4/3,
                  width: { ideal: 640, max: 640 },
                  height: { ideal: 480, max: 480 }
                });
              }
              setWebcamKey((k) => k + 1);
              return next;
            });
          }}
          className="w-full bg-[#0E95A7] hover:bg-[#0D8495]"
        >
          <Camera className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );

  // Manual entry tab view
  const renderManualEntryView = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full bg-gradient-to-br from-[#f8fffe] via-white to-[#f0fdfc] text-gray-800 overflow-auto"
      >
        {/* Enhanced header with glassmorphism effect */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg shadow-sm border-b border-white/20">
          <div className="flex justify-between items-center px-6 py-5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/dashboard")}
              className="w-11 h-11 rounded-xl bg-gray-50/80 backdrop-blur flex items-center justify-center text-gray-600 hover:bg-gray-100/80 transition-all duration-200 shadow-sm"
            >
              <X className="h-5 w-5" />
            </motion.button>
            
            <div className="text-xl font-bold bg-gradient-to-r from-[#0E95A7] via-[#0CBACC] to-[#0E95A7] bg-clip-text text-transparent">
              Add Food
            </div>
            
            <div className="w-11 h-11"></div> {/* Empty space for alignment */}
          </div>
          
          {/* Enhanced tabs with better styling */}
          <div className="flex justify-center px-6 py-3">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/80 backdrop-blur rounded-2xl p-1.5 flex w-full max-w-sm shadow-inner border border-gray-200/50">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab("camera");
                  if (!cameraReady) requestNativeCameraPrompt();
                }}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                  text-gray-600 hover:text-gray-800 hover:bg-white/60"
              >
                <Camera className="h-4 w-4" />
                <span>{t('addFood.camera', { defaultValue: 'Camera' })}</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab('gallery');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                  text-gray-600 hover:text-gray-800 hover:bg-white/60"
              >
                <ImageIcon className="h-4 w-4" />
                <span>{t('addFood.gallery', { defaultValue: 'Gallery' })}</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab("manual")}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                  bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] text-white shadow-md"
              >
                <Pencil className="h-4 w-4" />
                <span>{t('addFood.manual', { defaultValue: 'Manual' })}</span>
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 pb-20 overflow-auto">
          <div className="max-w-md mx-auto">
            {/* Enhanced toggle between text analysis and manual entry */}
            <div className="mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/30">
                <div className="flex p-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all duration-300 rounded-xl ${
                      manualEntryMode === 'text'
                        ? 'bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] text-white shadow-lg'
                        : 'bg-transparent text-gray-600 hover:bg-white/60'
                    }`}
                    onClick={() => setManualEntryMode('text')}
                  >
                    <div className="flex items-center justify-center">
                      <AlignLeft className="h-4 w-4 mr-2" />
                      AI Analysis
                    </div>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all duration-300 rounded-xl ${
                      manualEntryMode === 'form'
                        ? 'bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] text-white shadow-lg'
                        : 'bg-transparent text-gray-600 hover:bg-white/60'
                    }`}
                    onClick={() => setManualEntryMode('form')}
                  >
                    <div className="flex items-center justify-center">
                      <Pencil className="h-4 w-4 mr-2" />
                      Manual Add
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
            
            {manualEntryMode === 'text' ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/40 p-6 relative overflow-hidden"
              >
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0E95A7]/5 via-transparent to-[#0CBACC]/5 pointer-events-none" />
                
                <div className="relative mb-6">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] rounded-full mr-3" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] bg-clip-text text-transparent">
                      Describe Your Food
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-5">
                    Be specific for accurate nutrition information
                  </p>
                </div>
                
                <Form {...textForm}>
                  <form onSubmit={textForm.handleSubmit(onTextSubmit)} className="relative space-y-6">
                    <FormField
                      control={textForm.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <textarea
                                placeholder="Example: 2 slices of whole wheat toast with 1 tablespoon of peanut butter and a medium banana"
                                {...field}
                                rows={4}
                                className="w-full rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-4 resize-none transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                              />
                              <div className="absolute top-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full">
                                AI powered
                              </div>
                            </div>
                          </FormControl>
                          <div className="flex items-center mt-3 bg-gradient-to-r from-[#0E95A7]/10 to-[#0CBACC]/10 rounded-lg p-3">
                            <div className="w-2 h-2 bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] rounded-full mr-3 animate-pulse"></div>
                            <p className="text-xs text-gray-600 font-medium">
                              Include quantities, preparation methods, and brands if known
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-[#0E95A7] via-[#0CBACC] to-[#0E95A7] hover:shadow-xl disabled:opacity-70 text-white rounded-xl h-12 font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-pulse" />
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <AlignLeft className="mr-2 h-5 w-5" />
                            Analyze & Add Food
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/40 p-6 relative overflow-hidden"
              >
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0E95A7]/5 via-transparent to-[#0CBACC]/5 pointer-events-none" />
                
                <div className="relative mb-6">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] rounded-full mr-3" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] bg-clip-text text-transparent">
                      Manual Entry
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-5">
                    Enter nutritional information directly
                  </p>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-semibold">Food Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Apple, Chicken Breast" 
                              {...field} 
                              className="rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-3 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-semibold text-sm">Calories</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="1" 
                                min="0" 
                                {...field} 
                                className="rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-3 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                              />
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
                            <FormLabel className="text-gray-700 font-semibold text-sm">Protein (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                {...field} 
                                className="rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-3 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                              />
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
                            <FormLabel className="text-gray-700 font-semibold text-sm">Carbs (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                {...field} 
                                className="rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-3 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                              />
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
                            <FormLabel className="text-gray-700 font-semibold text-sm">Fat (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                {...field} 
                                className="rounded-xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm focus:border-[#0E95A7] focus:ring-4 focus:ring-[#0E95A7]/10 text-gray-800 p-3 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        className="w-full mt-2 bg-gradient-to-r from-[#0E95A7] via-[#0CBACC] to-[#0E95A7] hover:shadow-xl disabled:opacity-70 text-white rounded-xl h-12 font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-2xl relative overflow-hidden"
                        disabled={isAnalyzing}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-pulse" />
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Pencil className="mr-2 h-5 w-5" />
                            Add to Food Log
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Form>
              </motion.div>
            )}
            
            {/* Enhanced AI Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex justify-center"
            >
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/40 shadow-sm">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="w-6 h-6 rounded-full bg-gradient-to-r from-[#0E95A7] to-[#0CBACC] flex items-center justify-center shadow-sm"
                >
                  <span className="text-white text-xs font-bold">AI</span>
                </motion.div>
                <p className="text-xs text-gray-600 font-medium">
                  {manualEntryMode === 'text' 
                    ? 'Powered by AI to analyze your food with precision' 
                    : 'Switch to text mode for AI-powered nutritional analysis'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {activeTab === 'manual' ? (
        renderManualEntryView()
      ) : (
        <>
          {cameraError ? renderCameraErrorView() : renderScannerView()}
        </>
      )}

      <ErrorModal />
    </>
  );
}