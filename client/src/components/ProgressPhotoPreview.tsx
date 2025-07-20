import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function ProgressPhotoPreview() {
  const { photos, isLoading } = useProgressPhotos();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center"
        >
          <Camera className="w-10 h-10 text-white" />
        </motion.div>
        
        <motion.h4
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg font-bold text-gray-700 mb-2"
        >
          {t('progress.noPhotosYet', 'No Photos Yet')}
        </motion.h4>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed"
        >
          {t('progress.takeFirstPhoto', 'Take your first progress photo to start tracking your journey')}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 justify-center"
        >
          <Button
            onClick={() => setLocation('/camera')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {t('progress.trackProgress', 'Track Progress')}
          </Button>
          <Button
            onClick={() => setLocation('/progress')}
            variant="outline"
            className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50 px-6 py-2 rounded-full font-medium"
          >
            {t('progress.stayMotivated', 'Stay Motivated')}
          </Button>
        </motion.div>
      </div>
    );
  }

  // If there are photos, show a preview grid
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {photos.slice(0, 4).map((photo, index) => (
          <motion.div
            key={photo.photoUrl}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
            onClick={() => setLocation('/progress')}
          >
            <img
              src={photo.photoUrl}
              alt="Progress photo"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </motion.div>
        ))}
      </div>
      
      <div className="flex gap-3">
        <Button
          onClick={() => setLocation('/camera')}
          className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full font-medium"
        >
          <Camera className="w-4 h-4 mr-2" />
          {t('progress.addPhoto', 'Add Photo')}
        </Button>
        <Button
          onClick={() => setLocation('/progress')}
          variant="outline"
          className="flex-1 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 rounded-full font-medium"
        >
          {t('progress.viewAll', 'View All')}
        </Button>
      </div>
    </div>
  );
}