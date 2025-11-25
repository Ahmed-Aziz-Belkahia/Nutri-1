import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CircularButtonWhite from '@/components/CircularButtonWhite';

export default function CircularButtonDemo() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="p-4 flex items-center">
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ml-4 text-xl font-semibold">{t('common:circularButtonDemo.title')}</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-md mx-auto space-y-12">
          {/* Explanation */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">{t('common:circularButtonDemo.heading')}</h2>
            <p className="text-gray-300 mb-4">
              {t('common:circularButtonDemo.description')}
            </p>
          </div>

          {/* Button Showcase */}
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Small Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="sm" 
                onClick={() => alert(t('common:circularButtonDemo.smallButtonAlert'))} 
              />
              <p className="mt-3 text-sm text-gray-400">{t('common:circularButtonDemo.smallSize')}</p>
            </div>

            {/* Medium Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="md" 
                onClick={() => alert(t('common:circularButtonDemo.mediumButtonAlert'))} 
              />
              <p className="mt-3 text-sm text-gray-400">{t('common:circularButtonDemo.mediumSize')}</p>
            </div>

            {/* Large Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="lg" 
                onClick={() => alert(t('common:circularButtonDemo.largeButtonAlert'))} 
              />
              <p className="mt-3 text-sm text-gray-400">{t('common:circularButtonDemo.largeSize')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}