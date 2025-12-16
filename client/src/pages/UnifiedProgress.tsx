import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Camera, Upload, Activity, Scale, TrendingUp, Info, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { useBodyAnalysis } from "@/hooks/use-body-analysis";
import { useWeightLogs } from "@/hooks/use-weight-logs";
import { useUserProfile } from "@/hooks/use-user-profile";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import BaseLayout from "@/components/layouts/BaseLayout";
import { WeightTrendChart } from "@/components/progress/WeightTrendChart";
import { SourcesDisclaimer } from "@/components/progress/SourcesDisclaimer";

export default function UnifiedProgress() {
  const { t } = useTranslation(['common']);
  const { toast } = useToast();
  const { photos, uploadPhoto } = useProgressPhotos();
  const { analyzeBody, updateProfileWithBodyFat, isLoading: isAnalysisLoading } = useBodyAnalysis();
  const { weightLogs } = useWeightLogs();
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile();
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = usePullToRefresh([
    "/api/progress-photos",
    "/api/weight-logs",
    "/api/user-profile"
  ]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataURL = reader.result as string;
        await uploadPhoto(dataURL, 'latest');
        toast({ title: "Success", description: "Photo uploaded successfully" });
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read photo", variant: "destructive" });
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    const latestPhoto = photos?.[0];
    if (!latestPhoto) {
      toast({ title: "No Photo", description: "Please upload a photo first", variant: "destructive" });
      return;
    }

    const weight = currentWeight || 70;
    const height = (userProfile?.height as number) ?? 170;
    const gender = (userProfile?.gender as 'male' | 'female') || 'male';
    const age = (userProfile?.age as number) ?? 30;

    try {
      // Convert the photo URL to base64 for the API
      const imageBase64 = await fetchImageAsBase64(latestPhoto.photoUrl);
      
      const analysis = await analyzeBody(imageBase64, weight, height, gender, age);
      if (analysis?.bodyFatPercentage) {
        await updateProfileWithBodyFat(analysis.bodyFatPercentage, analysis.bodyType);
        refetchUserProfile();
        toast({ title: "Analysis Complete", description: `Body fat: ${analysis.bodyFatPercentage}%, Type: ${analysis.bodyType}` });
      }
    } catch (error) {
      console.error('Body analysis error:', error);
      toast({ title: "Analysis Failed", description: "Unable to analyze. Please try again.", variant: "destructive" });
    }
  };

  // Helper function to fetch an image URL and convert to base64
  const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const currentWeight = userProfile?.currentWeight ? parseFloat(userProfile.currentWeight as any) : undefined;
  const goalWeight = userProfile?.goalWeight ? parseFloat(userProfile.goalWeight as any) : undefined;
  const startWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : undefined;
  const weightChange = startWeight && currentWeight ? currentWeight - startWeight : 0;
  const remainingWeight = currentWeight && goalWeight ? currentWeight - goalWeight : 0;

  const nextPhoto = () => photos && photos.length > 0 && setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => photos && photos.length > 0 && setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <BaseLayout onRefresh={handleRefresh}>
      <div className="space-y-4 pb-6 px-4">
        {/* Weight Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-3xl bg-white/70 backdrop-blur-xl shadow-lg border border-white/60 overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0CC5BA] to-[#0AA59C] flex items-center justify-center shadow-lg shadow-[#0CC5BA]/20">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('common:unifiedProgress.weightStats.title')}</h2>
              </div>
            </div>
            
            {/* Card Body */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0CC5BA]/10 to-[#0AA59C]/5 border border-[#0CC5BA]/20">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.weightStats.current')}</p>
                  <p className="text-2xl font-bold text-[#0CC5BA]">{currentWeight ? `${currentWeight.toFixed(1)} kg` : '—'}</p>
                </div>
                <div className="rounded-2xl p-4 bg-gradient-to-br from-[#26A8FF]/10 to-[#1E96E8]/5 border border-[#26A8FF]/20">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.weightStats.goal')}</p>
                  <p className="text-2xl font-bold text-[#26A8FF]">{goalWeight ? `${goalWeight.toFixed(1)} kg` : '—'}</p>
                </div>
                <div className="rounded-2xl p-4 bg-white/80 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.weightStats.progress')}</p>
                  <p className={`text-2xl font-bold ${weightChange > 0 ? 'text-orange-500' : weightChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                    {weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl p-4 bg-white/80 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.weightStats.remaining')}</p>
                  <p className="text-2xl font-bold text-gray-700">{remainingWeight !== 0 ? `${Math.abs(remainingWeight).toFixed(1)} kg` : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weight Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <WeightTrendChart weightLogs={weightLogs} goalWeight={goalWeight} />
        </motion.div>

        {/* Photos Carousel Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="rounded-3xl bg-white/70 backdrop-blur-xl shadow-lg border border-white/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#26A8FF] to-[#1E96E8] flex items-center justify-center shadow-lg shadow-[#26A8FF]/20">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('common:unifiedProgress.progressPhotos.title')}</h2>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="rounded-xl bg-gradient-to-r from-[#26A8FF] to-[#1E96E8] hover:opacity-90 shadow-md"
                size="sm"
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>

            {photos && photos.length > 0 ? (
              <div className="p-4 space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 shadow-inner">
                  <img
                    src={photos[currentPhotoIndex].photoUrl}
                    alt="Progress photo"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-sm font-medium text-white backdrop-blur-md"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    {new Date(photos[currentPhotoIndex].createdAt).toLocaleDateString()}
                  </div>
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-800" />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-800" />
                      </button>
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="flex justify-center gap-2">
                    {photos.map((_, idx) => (
                      <div
                        key={idx}
                        className="rounded-full transition-all"
                        style={{
                          width: idx === currentPhotoIndex ? '24px' : '8px',
                          height: '8px',
                          backgroundColor: idx === currentPhotoIndex ? '#26A8FF' : 'rgba(0, 0, 0, 0.15)'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#26A8FF]/10 to-[#1E96E8]/10 flex items-center justify-center mx-auto mb-3">
                  <Camera className="h-8 w-8 text-[#26A8FF]" />
                </div>
                <p className="text-gray-700 font-medium">{t('common:unifiedProgress.progressPhotos.noPhotos')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('common:unifiedProgress.progressPhotos.uploadFirst')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Body Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="rounded-3xl bg-white/70 backdrop-blur-xl shadow-lg border border-white/60 overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0CC5BA] to-[#0AA59C] flex items-center justify-center shadow-lg shadow-[#0CC5BA]/20">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('common:unifiedProgress.bodyAnalysis.title')}</h2>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-4">
              {userProfile?.bodyFatPercentage ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0CC5BA]/10 to-[#0AA59C]/5 border border-[#0CC5BA]/20">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.bodyAnalysis.bodyFat')}</p>
                    <p className="text-2xl font-bold text-[#0CC5BA]">{userProfile.bodyFatPercentage}%</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-[#26A8FF]/10 to-[#1E96E8]/5 border border-[#26A8FF]/20">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('common:unifiedProgress.bodyAnalysis.bodyType')}</p>
                    <p className="text-2xl font-bold capitalize text-[#26A8FF]">{userProfile.bodyType || '—'}</p>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={handleAnalyze}
                disabled={!photos || photos.length === 0 || isAnalysisLoading}
                className="w-full rounded-2xl h-12 bg-gradient-to-r from-[#0CC5BA] to-[#0AA59C] hover:opacity-90 shadow-lg shadow-[#0CC5BA]/20 text-base font-semibold"
              >
                {isAnalysisLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('common:unifiedProgress.bodyAnalysis.analyzing')}
                  </>
                ) : (
                  <>
                    <Activity className="h-5 w-5 mr-2" />
                    {t('common:unifiedProgress.bodyAnalysis.analyzeLatest')}
                  </>
                )}
              </Button>

              {(!photos || photos.length === 0) && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#26A8FF]/5 border border-[#26A8FF]/10">
                  <div className="w-8 h-8 rounded-full bg-[#26A8FF]/10 flex items-center justify-center flex-shrink-0">
                    <Info className="h-4 w-4 text-[#26A8FF]" />
                  </div>
                  <p className="text-sm text-gray-600">{t('common:unifiedProgress.bodyAnalysis.uploadPrompt')}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sources & Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <SourcesDisclaimer />
        </motion.div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </BaseLayout>
  );
}
