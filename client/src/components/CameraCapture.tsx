import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, Camera } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (photoUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCaptureReady, setIsCaptureReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const initializeCamera = useCallback(async () => {
    try {
      console.log("Requesting camera access...");
      setIsLoading(true);
      setError(null);
      setPermissionDenied(false);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported");
      }

      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      streamRef.current = stream;
      console.log("Camera access granted");
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Simplified video setup
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          video.play().then(() => {
            console.log("Video playing");
            setIsCaptureReady(true);
            setIsLoading(false);
          }).catch((e) => {
            console.log("Play failed, but marking ready:", e);
            setIsCaptureReady(true);
            setIsLoading(false);
          });
        };
        
        // Immediate fallback
        setTimeout(() => {
          console.log("Timeout fallback - forcing ready");
          setIsCaptureReady(true);
          setIsLoading(false);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Camera initialization error:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found. Please connect a camera and try again.");
      } else {
        setError(err.message || "Failed to access camera");
      }
      
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeCamera();
    
    return () => {
      if (streamRef.current) {
        console.log("Cleaning up camera stream");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [initializeCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCaptureReady || isProcessing) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const photoUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      if (photoUrl.length < 100) {
        throw new Error('Invalid photo data generated');
      }
      
      // Pass photo to handler
      onCapture(photoUrl);
    } catch (err) {
      console.error("Error capturing photo: ", err);
    } finally {
      setIsProcessing(false);
    }
  }, [isCaptureReady, isProcessing, onCapture]);

  return (
    <div className="fixed inset-0 bg-black z-[9999] overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="p-3 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="text-white font-semibold">Progress Photo</div>
          <div className="w-12 h-12"></div>
        </div>
      </div>

      {/* Full Screen Camera View */}
      <div className="relative w-full h-full">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-6">
            <AlertCircle className="w-16 h-16 mb-6 text-red-400" />
            <h3 className="text-2xl font-bold mb-4">Camera Error</h3>
            <p className="text-center text-gray-300 mb-8 text-lg">{error}</p>
            <div className="flex gap-4">
              
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg"
              >
                Close
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Loader2 className="w-16 h-16 mb-6 animate-spin text-[#0CC5BA]" />
            <p className="text-lg text-gray-300">Starting camera...</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ width: '100vw', height: '100vh' }}
            />
            
            {/* Camera Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Center guide frame */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-96 border-2 border-white/50 rounded-3xl">
                <div className="absolute -top-3 -left-3 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-xl"></div>
                <div className="absolute -top-3 -right-3 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-xl"></div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-xl"></div>
                <div className="absolute -bottom-3 -right-3 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-xl"></div>
              </div>
              
              {/* Instructions */}
              <div className="absolute top-20 left-0 right-0 text-center text-white px-6">
                <p className="text-lg font-medium bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 inline-block">
                  Position yourself within the frame
                </p>
              </div>
            </div>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
              <div className="flex items-center justify-center space-x-8">
                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  className="w-16 h-16 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  onClick={onClose}
                >
                  <X className="h-8 w-8" />
                </Button>
                
                {/* Capture Button */}
                <Button
                  className="w-20 h-20 rounded-full bg-white shadow-2xl border-4 border-gray-300 hover:bg-gray-50 hover:scale-105 transition-all duration-200"
                  disabled={!isCaptureReady || isProcessing}
                  onClick={capturePhoto}
                >
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-gray-600 animate-spin" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] shadow-lg" />
                  )}
                </Button>
                
                {/* Gallery Button */}
                <Button
                  variant="ghost"
                  className="w-16 h-16 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  onClick={() => {
                    // This would open gallery in a real app
                    onClose();
                  }}
                >
                  <div className="w-8 h-8 bg-white/80 rounded border-2 border-white/60"></div>
                </Button>
              </div>
              
              {/* Help Text */}
              <div className="text-center mt-6">
                <p className="text-white/80 text-sm">
                  Tap the capture button to take your progress photo
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}