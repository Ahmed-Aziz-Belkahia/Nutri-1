import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2 } from "lucide-react";

interface SimpleCameraCaptureProps {
  onCapture: (photoUrl: string) => void;
  onClose: () => void;
}

export default function SimpleCameraCapture({ onClose, onCapture }: SimpleCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  console.log("SimpleCameraCapture rendered with state:", { isReady, error, isCapturing });

  useEffect(() => {
    let mounted = true;

    // Prevent body scroll when camera page is active
    document.body.style.overflow = 'hidden';
    document.body.classList.add('camera-active');

    const initCamera = async () => {
      try {
        console.log("Initializing camera...");
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        console.log("Camera stream obtained");

        if (!mounted) return;

        setStream(mediaStream);
        
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = mediaStream;
          
          // Multiple event handlers to ensure we catch when video is ready
          const markReady = () => {
            console.log("Video ready, marking camera as ready");
            if (mounted) {
              setIsReady(true);
            }
          };
          
          video.onloadedmetadata = markReady;
          video.oncanplay = markReady;
          video.onloadeddata = markReady;
          
          // Force play and mark ready
          video.play().then(() => {
            console.log("Video playing, marking as ready");
            markReady();
          }).catch(() => {
            console.log("Video play failed but marking as ready anyway");
            markReady();
          });
          
          // Aggressive fallback - mark ready after short delay
          setTimeout(() => {
            console.log("Aggressive fallback: forcing camera ready");
            if (mounted) {
              setIsReady(true);
            }
          }, 500);
        }
      } catch (err: any) {
        console.error("Camera initialization error:", err);
        if (mounted) {
          setError(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Camera not available');
        }
      }
    };
    
  initCamera();

    return () => {
      mounted = false;
      // Restore body scroll when leaving camera page
      document.body.style.overflow = '';
      document.body.classList.remove('camera-active');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Captured photo as base64, length:', dataURL.length);
      
      onCapture(dataURL);
      onClose();
    } catch (err) {
      console.error('Capture failed:', err);
      setError('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="camera-full-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent safe-area-top">
        <div className="flex items-center justify-between p-4 pt-8">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-white p-3 hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
          <h1 className="text-white font-semibold text-lg">Take Progress Photo</h1>
          <div className="w-12 h-12"></div>
        </div>
      </div>

      {/* Camera View */}
      <div className="w-full h-full relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Camera Error</h2>
            <p className="text-center mb-6">{error}</p>
            <Button onClick={onClose} className="bg-white text-black">
              Close
            </Button>
          </div>
        ) : (
          // Always show camera interface if no error
          <>
            {!isReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white">
                <Loader2 className="w-12 h-12 mb-4 animate-spin text-[#0CC5BA]" />
                <p>Loading camera...</p>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                width: '100vw',
                height: '100vh',
                objectFit: 'cover'
              }}
            />
            
            {/* Guide Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/50 rounded-3xl w-72 h-80">
                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-white rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-white rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-white rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-white rounded-br-lg"></div>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 pb-12 safe-area-bottom">
              <div className="flex items-center justify-center space-x-8">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-16 h-16 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                >
                  <X className="w-8 h-8" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="w-24 h-24 rounded-full bg-white border-4 border-gray-200 hover:bg-gray-50 hover:scale-105 transition-all duration-200 shadow-2xl"
                >
                  {isCapturing ? (
                    <Loader2 className="w-10 h-10 text-gray-600 animate-spin" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] shadow-lg" />
                  )}
                </Button>
                
                <div className="w-16 h-16"></div>
              </div>
              <div className="text-center mt-6">
                <p className="text-white/90 text-base font-medium">Position yourself in the frame and tap to capture</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}