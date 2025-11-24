import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function Privacy() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
      <header className="sticky top-0 backdrop-blur-xl bg-white/80 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <Button
              variant="ghost" 
              onClick={() => setLocation("/profile")}
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-medium ml-2 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              {t('common:privacy.title')}
            </h1>
          </div>
        </div>
      </header>
      
      <div className="w-full py-8 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">{t('common:privacy.title')}</h2>
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
              <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
                <p className="lead">
                  {t('common:privacy.intro')}
                </p>

                <h2>{t('common:privacy.section1.title')}</h2>
                <p>{t('common:privacy.section1.intro')}</p>
                
                <h3>{t('common:privacy.section1.userProvided.title')}</h3>
                <ul>
                  <li>{t('common:privacy.section1.userProvided.personal')}</li>
                  <li>{t('common:privacy.section1.userProvided.health')}</li>
                </ul>

                <h3>{t('common:privacy.section1.autoCollected.title')}</h3>
                <ul>
                  <li>{t('common:privacy.section1.autoCollected.device')}</li>
                  <li>{t('common:privacy.section1.autoCollected.usage')}</li>
                  <li>{t('common:privacy.section1.autoCollected.log')}</li>
                </ul>

                <h3>{t('common:privacy.section1.thirdParty.title')}</h3>
                <p>{t('common:privacy.section1.thirdParty.description')}</p>

                <h2>{t('common:privacy.section2.title')}</h2>
                <p>{t('common:privacy.section2.intro')}</p>
                <ul>
                  <li>{t('common:privacy.section2.point1')}</li>
                  <li>{t('common:privacy.section2.point2')}</li>
                  <li>{t('common:privacy.section2.point3')}</li>
                  <li>{t('common:privacy.section2.point4')}</li>
                  <li>{t('common:privacy.section2.point5')}</li>
                </ul>

                <h2>{t('common:privacy.section3.title')}</h2>
                <p>{t('common:privacy.section3.intro')}</p>

                <h3>{t('common:privacy.section3.serviceProviders.title')}</h3>
                <p>{t('common:privacy.section3.serviceProviders.description')}</p>

                <h3>{t('common:privacy.section3.legalCompliance.title')}</h3>
                <p>{t('common:privacy.section3.legalCompliance.intro')}</p>
                <ul>
                  <li>{t('common:privacy.section3.legalCompliance.point1')}</li>
                  <li>{t('common:privacy.section3.legalCompliance.point2')}</li>
                </ul>

                <h3>{t('common:privacy.section3.businessTransfers.title')}</h3>
                <p>{t('common:privacy.section3.businessTransfers.description')}</p>

                <h2>{t('common:privacy.section4.title')}</h2>
                <p>{t('common:privacy.section4.description')}</p>

                <h2>{t('common:privacy.section5.title')}</h2>
                <h3>{t('common:privacy.section5.accessUpdate.title')}</h3>
                <p>{t('common:privacy.section5.accessUpdate.description')}</p>

                <h3>{t('common:privacy.section5.optOut.title')}</h3>
                <p>{t('common:privacy.section5.optOut.description')}</p>

                <h3>{t('common:privacy.section5.dataDeletion.title')}</h3>
                <p>{t('common:privacy.section5.dataDeletion.description')}</p>

                <h3>{t('common:privacy.section5.permissions.title')}</h3>
                <p>{t('common:privacy.section5.permissions.description')}</p>

                <h2>{t('common:privacy.section6.title')}</h2>
                <p>{t('common:privacy.section6.description')}</p>

                <h2>{t('common:privacy.section7.title')}</h2>
                <p>{t('common:privacy.section7.description')}</p>

                <h2>{t('common:privacy.section8.title')}</h2>
                <p>{t('common:privacy.section8.description')}</p>
              </div>
            </ScrollArea>
            
            <div className="mt-8 text-center">
              <Button 
                onClick={() => setLocation("/profile")}
                className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('common:privacy.backToProfile')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}