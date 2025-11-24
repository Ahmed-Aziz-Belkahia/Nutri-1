import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-zinc-100/80 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => setLocation("/settings")} className="-ml-2 p-2">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-medium ml-2">{t('common:about.title')}</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-[#10c4bc] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl text-white">🥗</span>
          </div>
          <h2 className="text-xl font-semibold">{t('common:about.appName')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('common:about.version')}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{t('common:about.aboutTitle')}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {t('common:about.aboutDescription')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">{t('common:about.featuresTitle')}</h3>
            <ul className="mt-2 text-sm text-gray-500 space-y-2">
              <li>• {t('common:about.features.aiRecognition')}</li>
              <li>• {t('common:about.features.tracking')}</li>
              <li>• {t('common:about.features.monitoring')}</li>
              <li>• {t('common:about.features.recommendations')}</li>
              <li>• {t('common:about.features.database')}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">{t('common:about.creditsTitle')}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {t('common:about.creditsDescription')}
            </p>
          </div>

          <div className="pt-4">
            <div className="text-xs text-center text-gray-400">
              {t('common:about.copyright')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
