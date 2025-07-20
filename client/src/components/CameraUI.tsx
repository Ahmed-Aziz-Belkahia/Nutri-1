import React from 'react';
import { Camera, ImageIcon, Pencil, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

type TabType = 'camera' | 'gallery' | 'manual';

interface CameraUIProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onGalleryClick: () => void;
}

const CameraUI: React.FC<CameraUIProps> = ({ activeTab, onTabChange, onGalleryClick }) => {
  const handleGalleryTab = () => {
    onTabChange('gallery');
    onGalleryClick();
  };

  return (
    <div className="flex justify-center w-full">
      <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 flex items-center justify-center shadow-md">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'camera'
              ? 'bg-[#0E95A7] text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => onTabChange('camera')}
        >
          <Camera className="h-5 w-5 mr-1.5" />
          <span>Camera</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'gallery'
              ? 'bg-[#0E95A7] text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={handleGalleryTab}
        >
          <ImageIcon className="h-5 w-5 mr-1.5" />
          <span>Gallery</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'manual'
              ? 'bg-[#0E95A7] text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => onTabChange('manual')}
        >
          <Edit className="h-5 w-5 mr-1.5" />
          <span>Manual</span>
        </motion.button>
      </div>
    </div>
  );
};

export default CameraUI;