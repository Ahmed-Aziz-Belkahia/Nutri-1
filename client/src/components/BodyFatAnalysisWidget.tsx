import React from 'react';
import { useTranslation } from 'react-i18next';
import { Percent, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBodyAnalysis } from '@/hooks/use-body-analysis';
import { useProgressPhotos } from '@/hooks/use-progress-photos';

interface BodyFatAnalysisWidgetProps {
  currentWeight: number;
  height: number;
  onAnalysisComplete?: () => void;
}

export default function BodyFatAnalysisWidget({
  currentWeight,
  height,
  onAnalysisComplete
}: BodyFatAnalysisWidgetProps) {
  const { t } = useTranslation();
  const { analyzeBody, isLoading } = useBodyAnalysis();
  const { photos } = useProgressPhotos();
  
  // Find suitable photos for analysis
  const progressNowPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  
  // If no progress-now photos, we can still use any available photo
  const hasAnyPhoto = progressNowPhotos.length > 0 || (photos && photos.length > 0);
  const hasPhotos = hasAnyPhoto;
  
  // Handle checking body fat percentage
  const handleCheckBodyFat = () => {
    // This should not redirect to a separate page, instead emit the event to be handled in the parent component
    if (onAnalysisComplete) {
      onAnalysisComplete();
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Percent className="w-6 h-6 text-purple-500" />
          <h3 className="text-lg font-semibold">
            {t('progress.bodyFatAnalysis')}
          </h3>
        </div>
        <div className="flex items-center">
          <span className="flex items-center bg-gray-100 text-gray-500 rounded-full px-2 py-1">
            <Info className="w-4 h-4 mr-1" />
            <span className="text-xs">AI</span>
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        {t('progress.bestResultsTip')}
      </p>
      
      <Button
        onClick={handleCheckBodyFat}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-full py-3"
        disabled={isLoading || !hasPhotos}
      >
        {t('progress.checkBodyFatPercentage')}
      </Button>
      
      {!hasPhotos && (
        <p className="text-xs text-center text-gray-500 mt-2">
          {t('progress.noSuitablePhotos')}
        </p>
      )}
    </div>
  );
}