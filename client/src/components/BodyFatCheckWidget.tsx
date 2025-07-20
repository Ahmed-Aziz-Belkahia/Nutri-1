import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBodyAnalysis, type BodyAnalysis } from '@/hooks/use-body-analysis';
import { useProgressPhotos } from '@/hooks/use-progress-photos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Loader2, Camera, Calculator, Image as ImageIcon, RefreshCw, 
  Activity, User, Dumbbell, Lightbulb 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Helper function to compress images client-side
const compressImage = (base64Image: string, maxDimension: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      // Create a canvas to resize the image
      const canvas = document.createElement('canvas');
      
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with reduced quality
      resolve(canvas.toDataURL('image/jpeg', quality / 100));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = base64Image;
  });
};

interface BodyFatCheckWidgetProps {
  currentWeight: number;
  height: number;
  onBodyFatUpdate?: (bodyFat: number) => void;
}

export default function BodyFatCheckWidget({
  currentWeight,
  height,
  onBodyFatUpdate
}: BodyFatCheckWidgetProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [isMarkingPhoto, setIsMarkingPhoto] = useState(false);
  const { analyzeBody, updateProfileWithBodyFat, isLoading, error } = useBodyAnalysis();
  const { photos, isLoading: photosLoading, updatePhotoType } = useProgressPhotos();
  
  // Log available photos to understand what we're working with
  console.log('Available progress photos:', photos);
  
  // First try to get the latest photo (prioritize it)
  const latestPhoto = photos?.find(photo => photo.type === 'latest') || 
                     photos?.find(photo => photo.type === 'progress-now') || 
                     (photos && photos.length > 0 ? photos[0] : null);
  
  // Log any 'progress-now' photos we find to confirm they exist
  const progressNowPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  
  // Check if we have any photos at all
  const hasAnyPhoto = photos && photos.length > 0;
  console.log('Progress-now photos found:', progressNowPhotos.length, progressNowPhotos);
  
  // Log what photo we're using for analysis
  console.log('Selected photo for body analysis:', latestPhoto);
  
  // Open dialog when analysis first arrives 
  useEffect(() => {
    if (analysis) {
      console.log('Analysis result received, opening dialog');
      setShowDialog(true);
    }
  }, [analysis]);
  
  // Clear analysis when dialog is closed
  useEffect(() => {
    if (!showDialog && analysis) {
      // Wait a bit to avoid flicker when dialog reopens
      const timer = setTimeout(() => {
        console.log('Dialog closed, clearing analysis result');
        setAnalysis(null);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showDialog, analysis]);
  
  // Handle marking a photo as progress-now
  const handleMarkAsProgressNow = async () => {
    if (!latestPhoto) {
      toast({
        variant: "destructive",
        title: "No photo available",
        description: "You need to add a progress photo first before marking it for body analysis.",
      });
      return;
    }
    
    if (latestPhoto.type === 'progress-now') {
      toast({
        title: "Already marked",
        description: "This photo is already marked for body analysis.",
      });
      return;
    }
    
    try {
      setIsMarkingPhoto(true);
      
      // Update the photo type to 'progress-now'
      await updatePhotoType({
        photoUrl: latestPhoto.photoUrl,
        type: 'progress-now'
      });
      
      toast({
        title: "Photo marked",
        description: "Your photo has been marked for body analysis.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      toast({
        variant: "destructive",
        title: "Failed to mark photo",
        description: `Error: ${errorMessage}`,
      });
    } finally {
      setIsMarkingPhoto(false);
    }
  };
  
  // Handle analyzing body composition
  const handleAnalyzeBody = async () => {
    console.log('Starting body analysis process...');
    
    if (!latestPhoto) {
      console.log('No latest photo available for analysis');
      toast({
        variant: "destructive",
        title: "No photo available",
        description: "Please add a full body photo in the Progress section with type 'progress-now' first.",
      });
      return;
    }
    
    console.log('Using photo for analysis:', {
      id: latestPhoto.id,
      type: latestPhoto.type,
      url: latestPhoto.photoUrl,
      caption: latestPhoto.caption
    });
    
    if (!currentWeight || !height) {
      console.log('Missing weight or height information', { currentWeight, height });
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please ensure your weight and height are recorded first.",
      });
      return;
    }
    
    console.log('Starting photo fetch with parameters:', {
      weight: currentWeight,
      height: height,
      photoUrl: latestPhoto.photoUrl
    });
    
    try {
      // Convert photo URL to base64 (this assumes the photo URL is accessible)
      console.log('Fetching photo from URL:', latestPhoto.photoUrl);
      const photoResponse = await fetch(latestPhoto.photoUrl);
      
      if (!photoResponse.ok) {
        console.error('Failed to fetch photo, status:', photoResponse.status);
        throw new Error('Failed to fetch photo');
      }
      
      console.log('Photo fetched successfully, converting to blob...');
      const photoBlob = await photoResponse.blob();
      console.log('Photo blob created, size:', photoBlob.size, 'bytes');
      
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          console.log('FileReader completed loading the image');
          if (!reader.result) {
            throw new Error('Failed to read image data');
          }
          let base64String = reader.result as string;
          
          // If the image is large, compress it client-side
          if (base64String.length > 500000) { // 500KB threshold
            console.log('Image is large, compressing client-side...');
            const resizedImage = await compressImage(base64String, 800, 75);
            base64String = resizedImage;
            console.log('Image compressed client-side from', 
                       Math.round(base64String.length / 1024), 'KB to', 
                       Math.round(base64String.length / 1024), 'KB');
          }
          
          // Log the first 100 characters of the base64 string to verify it's valid
          console.log('Base64 string preview:', base64String.substring(0, 100) + '...');
          console.log('Base64 string length:', base64String.length);
          
          console.log('Calling API to analyze body composition with parameters:', {
            base64Length: base64String.length,
            weight: currentWeight,
            height: height
          });
          
          // Call the API to analyze body composition
          const result = await analyzeBody(
            base64String,
            currentWeight,
            height
          );
          
          console.log('Setting analysis result:', result);
          setAnalysis(result);
          console.log('Opening dialog with setShowDialog(true)');
          setShowDialog(true);
          console.log('Dialog should be visible now');
          
          // Update the user's profile with the new body fat percentage and body type
          if (result.bodyFatPercentage) {
            await updateProfileWithBodyFat(result.bodyFatPercentage, result.bodyType);
            if (onBodyFatUpdate) {
              onBodyFatUpdate(result.bodyFatPercentage);
            }
          }
        } catch (err) {
          console.error('Analysis error:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('Detailed error message:', errorMessage);
          
          // Use the hook error if it exists, otherwise use the caught error
          // Define a more friendly message for OpenAI API errors
          let displayMessage = errorMessage || "Failed to analyze body composition";
          
          // Check for specific error messages
          if (errorMessage.includes("Failed to parse") || 
              errorMessage.includes("Invalid analysis format")) {
            displayMessage = "Our AI couldn't analyze this photo properly. Try using a different photo with better lighting and a full body view.";
          }
          
          toast({
            variant: "destructive",
            title: t('progress.analysisError'), // Using translation key for "Analysis failed"
            description: displayMessage,
          });
        }
      };
      
      reader.readAsDataURL(photoBlob);
    } catch (err) {
      console.error('Error processing photo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Detailed photo processing error:', errorMessage);
      
      toast({
        variant: "destructive",
        title: t('progress.analysisError'),
        description: t('progress.photoProcessingError', { error: errorMessage }),
      });
    }
  };
  
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2 ml-1">
        {t('progress.bestResultsTip')}
      </div>
      
      {/* Simplified button for analysis */}
      <Button
        onClick={progressNowPhotos.length === 0 && latestPhoto ? handleMarkAsProgressNow : handleAnalyzeBody}
        className={`w-full ${progressNowPhotos.length === 0 && latestPhoto ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'} text-white`}
        size="sm"
        disabled={isLoading || photosLoading || !latestPhoto}
      >
        {isLoading || isMarkingPhoto ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : progressNowPhotos.length === 0 && latestPhoto ? (
          <ImageIcon className="h-3.5 w-3.5 mr-1" />
        ) : (
          <Calculator className="h-3.5 w-3.5 mr-1" />
        )}
        {isLoading ? t('progress.analyzing') : 
         isMarkingPhoto ? 'Przygotowywanie zdjęcia...' :
         progressNowPhotos.length === 0 && latestPhoto ? 'Użyj tego zdjęcia do analizy' : 
         t('progress.checkBodyFatPercentage')}
      </Button>
      
      {!latestPhoto && (
        <div className="text-xs text-center text-gray-500 mt-2">
          {t('progress.noSuitablePhotos')}
        </div>
      )}
      
      {/* Results Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="font-bold text-lg">{t('progress.bodyComposition')}</DialogTitle>
                <DialogDescription className="text-gray-500 text-xs mt-0.5">
                  {t('progress.resultsBasedOnPhoto')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {analysis && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="p-4 flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-br from-[#0091ff] to-[#0CC5BA] p-2 rounded-full text-white shadow-md mb-2">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 mb-1">{t('progress.bodyFat')}</span>
                    <div className="text-2xl font-bold text-gray-900">{analysis.bodyFatPercentage}%</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="p-4 flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] p-2 rounded-full text-white shadow-md mb-2">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 mb-1">{t('progress.bodyType')}</span>
                    <div className="text-lg font-bold text-gray-900">{analysis.bodyType}</div>
                  </div>
                </div>
              </div>
              
              {analysis.muscleMass && (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="p-4 flex items-center gap-3">
                    <div className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] p-2 rounded-full text-white shadow-md">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-500">{t('progress.muscleMass')}</span>
                      <div className="text-base font-semibold text-gray-900">
                        {analysis.muscleMass === "Moderate" ? t('progress.moderate') : analysis.muscleMass}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {analysis.improvementSuggestions && analysis.improvementSuggestions.length > 0 && (
                <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-gradient-to-br from-[#ff9500] to-[#ff5a5a] p-2 rounded-full text-white shadow-md">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-gray-800">{t('progress.suggestions')}</h3>
                  </div>
                  <ul className="space-y-2 pl-2">
                    {analysis.improvementSuggestions.map((suggestion, index) => {
                      // Map common suggestions to translation keys
                      let translationKey = null;
                      
                      // Check for common suggestion patterns and map to translation keys
                      if (suggestion.includes('strength training') || suggestion.includes('resistance training')) {
                        translationKey = 'bodySuggestions.strength';
                      } else if (suggestion.includes('cardio') || suggestion.includes('aerobic')) {
                        translationKey = 'bodySuggestions.cardio';
                      } else if (suggestion.includes('balanced diet') || suggestion.includes('protein')) {
                        translationKey = 'bodySuggestions.diet';
                      } else if (suggestion.includes('consistency') || suggestion.includes('regular')) {
                        translationKey = 'bodySuggestions.consistency';
                      } else if (suggestion.includes('rest') || suggestion.includes('recovery')) {
                        translationKey = 'bodySuggestions.rest';
                      } else if (suggestion.includes('water') || suggestion.includes('hydration')) {
                        translationKey = 'bodySuggestions.hydration';
                      } else if (suggestion.includes('clearer photo') || suggestion.includes('try again')) {
                        translationKey = 'bodySuggestions.tryAgain';
                      } else if (suggestion.includes('few minutes')) {
                        translationKey = 'bodySuggestions.waitMinutes';
                      } else if (suggestion.includes('good lighting')) {
                        translationKey = 'bodySuggestions.goodLighting';
                      } else if (suggestion.includes('connection')) {
                        translationKey = 'bodySuggestions.checkConnection';
                      } else if (suggestion.includes('visible')) {
                        translationKey = 'bodySuggestions.fullBodyVisible';
                      } else if (suggestion.includes('use another')) {
                        translationKey = 'bodySuggestions.useAnotherPhoto';
                      }
                      
                      // Get translated text or fall back to original suggestion
                      const translatedText = translationKey ? t(translationKey) : suggestion;
                      
                      return (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5"></div>
                          <span className="text-sm text-gray-700">{translatedText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center justify-center mt-2">
                <div className="px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                  <span className="text-xs font-medium text-blue-700">
                    {t('progress.analysisConfidence')}: <span className="font-bold">{analysis.confidence}%</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-2">
            <Button
              onClick={() => setShowDialog(false)}
              className="w-full bg-gradient-to-r from-[#0CC5BA] to-[#0091ff] hover:from-[#0BBAAF] hover:to-[#0081ef] text-white font-medium"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}