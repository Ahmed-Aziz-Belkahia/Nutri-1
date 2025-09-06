import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Percent, Info, Camera, ArrowLeft, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBodyAnalysis } from '@/hooks/use-body-analysis';
import { useProgressPhotos } from '@/hooks/use-progress-photos';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function BodyFatAnalysis() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { analyzeBody, updateProfileWithBodyFat, isLoading } = useBodyAnalysis();
  const { photos, updatePhotoType } = useProgressPhotos();
  const [isMarkingPhoto, setIsMarkingPhoto] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Find suitable photos for analysis
  const progressNowPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  console.log('Progress-now photos for analysis:', progressNowPhotos);
  
  // Add debug logs to see what photos we have
  console.log('All available photos:', photos);
  console.log('Progress-now photos:', progressNowPhotos);
  
  // First try to use latest photos, then progress-now photos, then any photo
  const latestPhoto = photos?.find(photo => photo.type === 'latest') || 
                     photos?.find(photo => photo.type === 'progress-now') || 
                     (photos && photos.length > 0 ? photos[0] : null);
  
  console.log('Selected photo for analysis:', latestPhoto);
  
  const hasPhotos = !!latestPhoto;
  const needsToMarkPhoto = hasPhotos && progressNowPhotos.length === 0;
  
  // Handle marking the selected photo as progress-now (for body analysis)
  const handleMarkAsProgressNow = async () => {
    if (!latestPhoto) return;
    
    setIsMarkingPhoto(true);
    
    try {
      // Mark the photo as progress-now
      await updatePhotoType({
        photoUrl: latestPhoto.photoUrl,
        type: 'progress-now'
      });
      
      toast({
        title: t('progress.photoMarked'),
        description: t('progress.photoReadyForAnalysis'),
      });
      
      // After marking, perform the analysis
      setTimeout(() => {
        handleCheckBodyFat();
      }, 500);
    } catch (error) {
      console.error('Error marking photo:', error);
      toast({
        variant: "destructive",
        title: t('progress.markingError'),
        description: t('progress.tryAgainLater'),
      });
    } finally {
      setIsMarkingPhoto(false);
    }
  };
  
  // Handle checking body fat percentage
  const handleCheckBodyFat = async () => {
    if (!latestPhoto) {
      toast({
        variant: "destructive",
        title: t('progress.noPhotoAvailable'),
        description: t('progress.noSuitablePhotos'),
      });
      return;
    }
    
    // Show a loading toast
    toast({
      title: t('progress.analyzing'),
      description: t('progress.processingPhoto'),
    });
    
    try {
      // Fetch the photo from the server
      console.log('Fetching photo for analysis:', latestPhoto.photoUrl);
      const photoResponse = await fetch(latestPhoto.photoUrl);
      const photoBlob = await photoResponse.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          // Get the base64 data
          const base64String = reader.result as string;
          
          // Get user profile data for height and weight
          const userProfileResponse = await fetch('/api/user/profile');
          const userProfile = await userProfileResponse.json();
          
          if (!userProfile || !userProfile.currentWeight || !userProfile.height) {
            toast({
              variant: "destructive",
              title: t('progress.missingData'),
              description: t('progress.weightHeightRequired'),
            });
            return;
          }
          
          console.log('Starting body analysis with:', {
            imageLength: base64String.length,
            weight: userProfile.currentWeight,
            height: userProfile.height
          });
          
          // Call the API to analyze body composition
          const result = await analyzeBody(
            base64String,
            parseFloat(userProfile.currentWeight),
            parseFloat(userProfile.height)
          );
          
          console.log('Analysis result:', result);
          
          // Store the analysis result for displaying sources
          setAnalysisResult(result);
          
          // Update the user's profile with the new body fat percentage
          if (result.bodyFatPercentage) {
            await updateProfileWithBodyFat(result.bodyFatPercentage, result.bodyType);
            
            // Show success message
            toast({
              title: t('progress.analysisComplete'),
              description: t('progress.bodyFatUpdated', { 
                percentage: result.bodyFatPercentage.toFixed(1) 
              }),
            });
            
            // Show sources automatically after analysis
            setShowSources(true);
          }
        } catch (err) {
          console.error('Error analyzing body:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          toast({
            variant: "destructive",
            title: t('progress.analysisError'),
            description: t('progress.photoProcessingError', { error: errorMessage }),
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: t('progress.analysisError'),
          description: t('progress.photoProcessingError', { error: 'Failed to read photo' }),
        });
      };
      
      reader.readAsDataURL(photoBlob);
    } catch (error) {
      console.error('Error fetching photo:', error);
      toast({
        variant: "destructive",
        title: t('progress.analysisError'),
        description: t('progress.photoProcessingError', { 
          error: error instanceof Error ? error.message : 'Failed to fetch photo'
        }),
      });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="p-0 flex items-center text-gray-600"
          onClick={() => setLocation('/progress-new')}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to Progress</span>
        </Button>
      </div>
      
      <Card className="overflow-hidden rounded-xl shadow-sm">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100 flex-shrink-0">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                Analiza Tkanki Tłuszczowej
              </h2>
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full p-1.5 flex items-center justify-center mr-1">
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-500">AI</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm ml-[3.75rem] mb-4">
            Użyj zdjęcia całego ciała w dobrym oświetleniu.
          </p>
          
          {/* Show current photo being used */}
          {latestPhoto && (
            <div className="mb-6 relative rounded-xl overflow-hidden">
              <img 
                src={latestPhoto.photoUrl}
                alt="Zdjęcie do analizy" 
                className="w-full h-52 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <div className="text-sm text-white font-medium">
                  {latestPhoto.type === 'progress-now' ? 'Zdjęcie referencyjne' : 'Ostatnie zdjęcie'}
                </div>
                <div className="text-xs text-white/80">
                  {new Date(latestPhoto.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          
          {needsToMarkPhoto ? (
            <Button
              onClick={handleMarkAsProgressNow}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6 font-medium text-base"
              disabled={isLoading || isMarkingPhoto}
            >
              {isMarkingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isMarkingPhoto ? 'Przygotowywanie zdjęcia...' : 'Użyj tego zdjęcia do analizy'}
            </Button>
          ) : (
            <Button
              onClick={handleCheckBodyFat}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-full py-6 font-medium text-base"
              disabled={isLoading || !hasPhotos}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Analizowanie...' : 'Sprawdź procent tkanki tłuszczowej'}
            </Button>
          )}
        </div>
        
        {!hasPhotos && (
          <div className="p-6 text-center border-t border-gray-100">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              {t('progress.noSuitablePhotos')}
            </p>
            <Button 
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50 rounded-full px-6"
              onClick={() => setLocation('/progress-new?section=photos')}
            >
              {t('progress.takeProgressPhoto')}
            </Button>
          </div>
        )}
      </Card>
      
      {/* Sources and Methods Section */}
      <Card className="mt-4">
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0"
            onClick={() => setShowSources(!showSources)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">Źródła medyczne i metody obliczeń</span>
            </div>
            <span className="text-sm text-gray-500">
              {showSources ? 'Ukryj' : 'Pokaż'}
            </span>
          </Button>
          
          {showSources && (
            <div className="mt-4 space-y-4">
              {/* Calculation Methods */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-700">Metody obliczeń:</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium">BMI (Body Mass Index)</div>
                    <div className="text-gray-600 text-xs mt-1">BMI = waga (kg) ÷ wzrost² (m²)</div>
                    <div className="text-gray-500 text-xs">Źródło: WHO Global Database on Body Mass Index</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium">Szacowanie tkanki tłuszczowej</div>
                    <div className="text-gray-600 text-xs mt-1">
                      Mężczyźni: % = (1.20 × BMI) + (0.23 × wiek) - 16.2<br/>
                      Kobiety: % = (1.20 × BMI) + (0.23 × wiek) - 5.4
                    </div>
                    <div className="text-gray-500 text-xs">Źródło: Deurenberg et al. (1991) British Journal of Nutrition</div>
                  </div>
                </div>
              </div>
              
              {/* Medical Sources */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-700">Źródła medyczne:</h4>
                <div className="space-y-2">
                  {[
                    {
                      title: "Wytyczne WHO dotyczące składu ciała",
                      organization: "World Health Organization (WHO)",
                      url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"
                    },
                    {
                      title: "Standardy klasyfikacji BMI",
                      organization: "Centers for Disease Control and Prevention (CDC)",
                      url: "https://www.cdc.gov/healthyweight/assessing/bmi/adult_bmi/index.html"
                    },
                    {
                      title: "Wytyczne dotyczące procentu tkanki tłuszczowej",
                      organization: "American Council on Exercise (ACE)",
                      url: "https://www.acefitness.org/education-and-resources/lifestyle/tools-calculators/percent-body-fat-calculator/"
                    }
                  ].map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-blue-900">{source.title}</div>
                          <div className="text-xs text-blue-700 mt-1">{source.organization}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-blue-600 mt-1 flex-shrink-0 ml-2" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              
              {/* Analysis Results Sources */}
              {analysisResult?.sources && (
                <div>
                  <h4 className="font-medium mb-2 text-sm text-gray-700">Dodatkowe źródła z analizy:</h4>
                  <div className="space-y-2">
                    {analysisResult.sources.map((source: any, index: number) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-green-900">{source.title}</div>
                            <div className="text-xs text-green-700 mt-1">{source.organization}</div>
                            <div className="text-xs text-green-600 mt-1">{source.description}</div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-green-600 mt-1 flex-shrink-0 ml-2" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                Ta aplikacja przedstawia informacje medyczne wyłącznie w celach edukacyjnych. 
                Zawsze skonsultuj się z lekarzem przed podejmowaniem decyzji dotyczących zdrowia.
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}