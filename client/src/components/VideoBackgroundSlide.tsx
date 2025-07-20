import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VideoBackgroundSlideProps {
  videoSrc: string;
  isActive: boolean;
  fallbackBg?: string;
}

export default function VideoBackgroundSlide({ 
  videoSrc, 
  isActive, 
  fallbackBg = "bg-[#1E1B26]" 
}: VideoBackgroundSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when active state changes
  useEffect(() => {
    if (isActive) {
      setVideoError(false);
      setIsLoading(true);

      if (videoRef.current) {
        // Reset the video element
        videoRef.current.load();

        // Attempt to play when loaded
        videoRef.current.play().catch(error => {
          console.error('Initial video play error:', error);
          setVideoError(true);
        });
      }
    }
  }, [isActive]);

  const handleLoadedData = () => {
    console.log('Video loaded:', videoSrc);
    setIsLoading(false);

    if (videoRef.current && isActive) {
      videoRef.current.play().catch(error => {
        console.error('Video play error after load:', error);
        setVideoError(true);
      });
    }
  };

  const handleError = (error: any) => {
    console.error('Video load error for source:', videoSrc, error);
    setVideoError(true);
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className={`absolute inset-0 overflow-hidden ${videoError || isLoading ? fallbackBg : ''}`}
    >
      {!videoError && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          playsInline
          muted
          loop
          preload="auto"
          onLoadedData={handleLoadedData}
          onError={handleError}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2D1B69]/60 via-[#1E1B26]/80 to-[#1E1B26]" />
    </motion.div>
  );
}