import React, { FC, useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Camera, ImageIcon, ChefHat } from "lucide-react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import IngredientAnalysisProgress from './IngredientAnalysisProgress';

interface RecipeScannerProps {
  onClose?: () => void;
}

const RecipeScanner: FC<RecipeScannerProps> = ({ onClose = () => {} }) => {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"camera" | "gallery">("camera");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Disable scrolling on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Handle image capture from webcam
  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    try {
      setIsAnalyzing(true);
      
      // Capture image
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        throw new Error("Failed to capture image");
      }
      
      // Process the captured image for recipe generation
      try {
        const response = await fetch('/api/analyze-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: screenshot }),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Received ingredient analysis data:', data);
          
          // Ensure we have the expected data structure
          if (!data.ingredients || !Array.isArray(data.ingredients)) {
            throw new Error('Invalid response format - no ingredients found');
          }
          
          // Navigate to ingredient confirmation with the detected ingredients
          const analysisData = {
            ingredients: data.ingredients,
            confidence: data.confidence || 0.9
          };
          
          const encodedData = encodeURIComponent(JSON.stringify(analysisData));
          console.log('Navigating to ingredient confirmation with data:', analysisData);
          console.log('Encoded URL data:', encodedData);
          
          // Use router navigation for smooth transition
          const resultUrl = `/confirm-ingredients?data=${encodedData}`;
          console.log('Navigating to URL:', resultUrl);
          setLocation(resultUrl);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to analyze ingredients');
        }
      } catch (error) {
        console.error('Analysis error:', error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Could not analyze the ingredients. Please try again."
        });
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "Could not capture image. Please try again."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsAnalyzing(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target?.result as string;
        
        try {
          const response = await fetch('/api/analyze-ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageSrc }),
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Received ingredient analysis data from file:', data);
            
            // Ensure we have the expected data structure
            if (!data.ingredients || !Array.isArray(data.ingredients)) {
              throw new Error('Invalid response format - no ingredients found');
            }
            
            // Navigate to ingredient confirmation with the detected ingredients
            const analysisData = {
              ingredients: data.ingredients,
              confidence: data.confidence || 0.9
            };
            
            const encodedData = encodeURIComponent(JSON.stringify(analysisData));
            console.log('Navigating to ingredient confirmation with file data:', analysisData);
            console.log('Encoded file URL data:', encodedData);
            
            // Use router navigation for smooth transition
            const resultUrl = `/confirm-ingredients?data=${encodedData}`;
            console.log('Navigating to file URL:', resultUrl);
            setLocation(resultUrl);
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to analyze ingredients');
          }
        } catch (error) {
          console.error('Analysis error:', error);
          toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "Could not analyze the ingredients. Please try again."
          });
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      setIsAnalyzing(false);
    }
  };

  // Handle gallery click
  const handleGalleryClick = () => {
    setActiveTab("gallery");
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-gray-800 overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      <div className="relative w-full h-full bg-black">
        {/* Camera */}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "environment",
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          }}
          className="w-full h-full object-cover bg-black"
          style={{ backgroundColor: '#000000' }}
          onUserMedia={() => {
            setCameraError(null);
          }}
          onUserMediaError={(error) => {
            console.error('Camera Error:', error);
            setCameraError(
              "We couldn't access your camera. Please check your camera permissions or try switching to gallery upload."
            );
          }}
        />
        
        {/* Backdrop overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none"></div>
        
        {/* Header with navigation controls and mode tabs */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="flex justify-between items-center p-4 pt-8">
            <button
              className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-white text-base font-semibold flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Recipe Scanner
            </div>
            
            <div className="w-10 h-10"></div> {/* Spacer for alignment */}
          </div>
          
          {/* Mode selection tabs at top */}
          <div className="flex justify-center px-4 py-2">
            <div className="bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 flex w-full max-w-xs">
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === "camera" 
                    ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </button>
              
              <button
                onClick={handleGalleryClick}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all
                  ${activeTab === "gallery" 
                    ? "bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] text-white" 
                    : "text-white/70 hover:text-white"}`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Gallery</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Scanning frame with animated elements */}
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
            
            {/* Center instruction text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm text-center">
                <p className="text-white text-sm font-medium">
                  Point camera at ingredients
                </p>
              </div>
            </div>
          </motion.div>
        </div>
          
        {/* Capture button */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl relative"
            onClick={handleCapture}
            disabled={isAnalyzing}
            style={{
              background: "linear-gradient(45deg, #0E95A7, #0CC5BA)"
            }}
          >
            {isAnalyzing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-white/20 border-t-4 border-t-white rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#0CC5BA] flex items-center justify-center">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
          </motion.button>
        </div>

        {/* File input for gallery mode (hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        {/* Enhanced Analysis Progress Overlay */}
        <IngredientAnalysisProgress isVisible={isAnalyzing} />
      </div>
    </div>
  );
};

export default RecipeScanner;