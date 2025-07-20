import React from 'react';
import { useTranslation } from 'react-i18next';
import { Percent, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProgressPhotos } from '@/hooks/use-progress-photos';
import { useLocation } from 'wouter';

interface BodyFatPercentageWidgetProps {
  onAnalyze: () => void;
  isLoading?: boolean;
}

export default function BodyFatPercentageWidget({ onAnalyze, isLoading = false }: BodyFatPercentageWidgetProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { photos } = useProgressPhotos();
  
  // First try to get the latest photo (specifically marked as latest)
  const latestPhotos = photos?.filter(photo => photo.type === 'latest') || [];
  
  // Then try progress-now photos if no latest
  const progressNowPhotos = photos?.filter(photo => photo.type === 'progress-now') || [];
  
  // If neither type exists, use any available photo
  const hasAnyPhoto = photos && photos.length > 0;
  const hasPhotos = hasAnyPhoto;

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
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
        
        <p className="text-gray-600 text-sm ml-14 mb-4">
          Użyj zdjęcia całego ciała w dobrym oświetleniu.
        </p>
        
        <Button
          onClick={onAnalyze}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-full py-6 text-base font-medium"
          disabled={isLoading || !hasPhotos}
        >
          {isLoading ? t('progress.analyzing') : 'Sprawdź procent tkanki tłuszczowej'}
        </Button>
      </div>
      
      {!hasPhotos && (
        <div className="p-4 text-center border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {t('progress.noSuitablePhotos')}
          </p>
        </div>
      )}
    </Card>
  );
}