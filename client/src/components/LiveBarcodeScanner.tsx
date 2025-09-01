import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Barcode as BarcodeIcon, AlertTriangle } from 'lucide-react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';
import { lookupBarcode, ProductData } from '@/lib/barcode';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getCameraPermissionStatus, requestCameraPermission, type CameraPermissionState } from '@/lib/cameraPermissions';

interface LiveBarcodeScannerProps {
  onClose: () => void;
  onScanSuccess: (product: ProductData) => void;
}

export default function LiveBarcodeScanner({ onClose, onScanSuccess }: LiveBarcodeScannerProps) {
  // Core state
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const [detectedBarcodes, setDetectedBarcodes] = useState<{[key: string]: number}>({});
  const [showFallback, setShowFallback] = useState(false);
  
  // UI state
  const [cameraMessage, setCameraMessage] = useState<string>("Accessing camera...");
  const [scanResult, setScanResult] = useState<{barcode: string, timestamp: number} | null>(null);
  
  // Optimized camera settings
  const [cameraConstraints, setCameraConstraints] = useState({
    facingMode: 'environment', 
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    aspectRatio: { ideal: 1.777777778 },
    frameRate: { max: 15 },
  });
  
  // References
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraAttempts = useRef<number>(0);
  const { toast } = useToast();
  const [permission, setPermission] = useState<CameraPermissionState>('prompt');
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // Initialize barcode reader with enhanced settings
  useEffect(() => {
    console.log("Initializing barcode reader...");
    
    // Configure decoder options
    const hints = new Map();
    
    // Support for multiple barcode formats
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128
    ]);
    
    // Additional settings for better detection
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    
    // Create reader with configured hints
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    
    // Show fallback option after a timeout
    const fallbackTimeout = setTimeout(() => {
      setShowFallback(true);
    }, 2000);
    
    // Cleanup resources on component unmount
    return () => {
      console.log("Cleaning up scanner resources");
      clearTimeout(fallbackTimeout);
      
      if (readerRef.current) {
        readerRef.current.reset();
      }
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Gate by permission before letting webcam initialize
  useEffect(() => {
    (async () => {
      setCheckingPermission(true);
      const status = await getCameraPermissionStatus();
      setPermission(status);
      setHasPermission(status === 'granted');
      setCheckingPermission(false);
    })();
  }, []);

  const handleEnableCamera = async () => {
    const res = await requestCameraPermission({ facingMode: 'environment' });
    if (res.granted) {
      setPermission('granted');
      setHasPermission(true);
      setCameraPermissionDenied(false);
      setError(null);
    } else {
      setPermission('denied');
      setHasPermission(false);
      setCameraPermissionDenied(true);
      setError(res.error ?? 'Camera permission denied. Enable it in settings and try again.');
    }
  };

  // Set up camera status messages
  useEffect(() => {
    if (cameraPermissionDenied) {
      setCameraMessage("Camera access denied. Please use manual entry.");
      return;
    }
    
    if (!cameraReady) {
      setCameraMessage("Activating camera...");
      
      const timeoutId = setTimeout(() => {
        if (!cameraReady) {
          setCameraMessage("Camera initialization is slow. Please wait...");
        }
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    } else {
      setCameraMessage(scanning ? "Point camera at barcode" : "Barcode detected!");
    }
  }, [cameraReady, scanning, cameraPermissionDenied]);

  // Scanning logic - detect and validate barcodes
  useEffect(() => {
    // Skip if conditions aren't right for scanning
  if (!hasPermission || !cameraReady || !webcamRef.current || !readerRef.current || !scanning || isProcessingBarcode) {
      return;
    }
    
    const videoElement = webcamRef.current.video;
    if (!videoElement) return;
    
    console.log("Setting up barcode scanning");
    
    // Function to detect barcode from video frame
    const scanBarcode = async () => {
      if (!videoElement || !readerRef.current || !scanning || isProcessingBarcode) return;
      
      try {
        // Attempt to decode from current video frame
        const result = await readerRef.current.decodeFromVideoElement(videoElement);
        
        // Only process valid barcode text
        if (result && typeof result.getText() === 'string' && result.getText().trim() !== '') {
          const barcodeText = result.getText().trim();
          
          // Keep track of barcode occurrences for validation
          const updatedBarcodes = { ...detectedBarcodes };
          updatedBarcodes[barcodeText] = (updatedBarcodes[barcodeText] || 0) + 1;
          setDetectedBarcodes(updatedBarcodes);
          
          // Only accept barcode after multiple consistent detections (prevents false positives)
          if (updatedBarcodes[barcodeText] >= 3 && barcodeText !== lastBarcode) {
            console.log(`Barcode confirmed: ${barcodeText}`);
            
            // Set as current barcode and stop scanning
            setLastBarcode(barcodeText);
            setScanning(false);
            setIsProcessingBarcode(true);
            setScanResult({ barcode: barcodeText, timestamp: Date.now() });
            
            // Provide haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            
            // Show success toast
            toast({
              title: "Barcode Detected",
              description: `Processing: ${barcodeText}`
            });
            
            // Process the barcode 
            try {
              const product = await lookupBarcode(barcodeText);
              
              // Pass result back to parent component
              onScanSuccess(product);
            } catch (err) {
              console.error('Error processing barcode:', err);
              
              let errorMessage = 'Failed to process barcode';
              if (err instanceof Error) {
                errorMessage = err.message;
              }
              
              setError(errorMessage);
              
              // Resume scanning after delay
              setTimeout(() => {
                setLastBarcode(null);
                setScanning(true);
                setIsProcessingBarcode(false);
                setError(null);
                setDetectedBarcodes({});
              }, 3000);
            }
          }
        }
      } catch (err) {
        // Ignore NotFoundExceptions (normal when no barcode in frame)
        if (!(err instanceof NotFoundException)) {
          console.error('Scanning error:', err);
        }
      }
    };
    
    // Scan at regular intervals
    scanIntervalRef.current = setInterval(scanBarcode, 200);
    
    // Auto-reset detected barcodes periodically to prevent stale data
    scanTimeoutRef.current = setTimeout(() => {
      setDetectedBarcodes({});
    }, 5000);
    
    // Clean up interval when component unmounts or dependencies change
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [hasPermission, cameraReady, scanning, lastBarcode, detectedBarcodes, isProcessingBarcode, onScanSuccess, toast]);

  // Scan a Milka chocolate barcode as a fallback demo
  const handleDemoScan = async () => {
    setScanning(false);
    setIsProcessingBarcode(true);
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Show toast
    toast({
      title: "Demo Barcode Detected",
      description: "Processing Milka Chocolate (8005276)"
    });
    
    try {
      // Get Milka chocolate data
      const product = await lookupBarcode("8005276");
      onScanSuccess(product);
    } catch (error) {
      console.error("Error in demo scan:", error);
      setError("Demo scan failed to process");
      
      setTimeout(() => {
        setScanning(true);
        setIsProcessingBarcode(false);
        setError(null);
      }, 2000);
    }
  };

  // UI for the barcode scanner
  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Camera feed with fallback background */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Dark gradient background behind camera */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-6">
                <motion.div 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6 text-[#0E95A7]"
                >
                  <Camera size={48} />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {cameraPermissionDenied ? "Camera Access Denied" : "Accessing Camera..."}
                </h3>
                <p className="text-gray-400 mb-4">
                  {cameraPermissionDenied 
                    ? "Please allow camera access or use manual entry" 
                    : "Please wait while we access your camera for barcode scanning."}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Permission gate */}
        {!hasPermission && !checkingPermission ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
            <div className="text-white font-semibold text-center px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm mb-6">
              Barcode Scanner
            </div>
            <p className="text-center text-white/80 mb-6 max-w-sm">
              We need access to your camera to scan barcodes. You'll see your device's permission prompt.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleEnableCamera} className="bg-white text-black">Enable Camera</Button>
              <Button onClick={onClose} variant="ghost" className="text-white">Cancel</Button>
            </div>
            {permission === 'denied' && (
              <p className="text-center mt-4 text-sm text-red-300">
                Permission denied. Please enable camera access in your browser/device settings.
              </p>
            )}
          </div>
        ) : (
          /* Webcam component with optimized settings */
          <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={cameraConstraints}
          onUserMedia={() => {
            console.log("Camera accessed successfully");
            setCameraReady(true);
            setCameraPermissionDenied(false);
            cameraAttempts.current = 0; // Reset attempt counter on success
          }}
          onUserMediaError={(err) => {
            console.error("Camera error:", err);
            
            // Try with reduced settings if we have fewer than 3 attempts
            if (cameraAttempts.current < 3) {
              cameraAttempts.current += 1;
              console.log(`Camera access failed. Attempt ${cameraAttempts.current} with reduced settings`);
              
              // Progressively lower camera resolution on each failed attempt
              setCameraConstraints({
                facingMode: 'environment',
                width: { ideal: 480, max: 640 },
                height: { ideal: 360, max: 480 },
                aspectRatio: { ideal: 1.333 },
                frameRate: { max: 10 },
              });
              
              // Force webcam component to re-render with new constraints
              setTimeout(() => {
                setCameraReady(false);
              }, 500);
            } else {
              setCameraPermissionDenied(true);
              setError('Camera access denied. Please use the demo scan button below.');
            }
          }}
          className="absolute inset-0 h-full w-full object-cover"
          mirrored={false}
          screenshotFormat="image/jpeg"
          imageSmoothing={false} // Disable image smoothing for better barcode recognition
  />
  )}
        
        {/* Scanner UI overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 pointer-events-none">
          {/* Header with back button */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </motion.button>
            
            <div className="text-white font-semibold text-center px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
              Barcode Scanner
            </div>
            
            <div className="w-10 h-10 opacity-0">
              <ArrowLeft className="h-5 w-5" />
            </div>
          </div>
          
          {/* Scanner target area with animations */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-4/5 max-w-xs aspect-[3/2] rounded-lg">
              {/* Scanner frame */}
              <div className="absolute inset-0 border-2 border-[#0E95A7] rounded-lg"></div>
              
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#0E95A7]"></div>
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#0E95A7]"></div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#0E95A7]"></div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#0E95A7]"></div>
              
              {/* Scanning line animation */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-[#0E95A7]"
                initial={{ top: 0 }}
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              />
              
              {/* Scanning area highlight effect */}
              <motion.div 
                className="absolute inset-0 bg-[#0E95A7]/10"
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              {/* Processing animation when barcode detected */}
              {isProcessingBarcode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm"
                >
                  <div className="text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 mx-auto mb-2"
                    >
                      <Loader2 className="w-10 h-10 text-[#0E95A7]" />
                    </motion.div>
                    <div className="text-white text-sm">Processing barcode...</div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Status message */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
              {cameraMessage}
            </div>
          </div>
          
          {/* Demo scan button */}
          {showFallback && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto"
            >
              <Button 
                onClick={handleDemoScan}
                disabled={isProcessingBarcode}
                className="bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] hover:brightness-110 text-white flex items-center gap-2 px-6 py-5 rounded-xl shadow-lg shadow-[#0E95A7]/20 text-base font-medium"
              >
                <BarcodeIcon className="h-5 w-5" />
                <span>{isProcessingBarcode ? "Processing..." : "Demo: Scan Milka Chocolate"}</span>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Error message popup */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-36 left-0 right-0 flex justify-center"
          >
            <div className="bg-red-500/80 text-white px-4 py-3 rounded-lg flex items-center gap-2 max-w-xs">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Barcode result info (debug) */}
      {scanResult && (
        <div className="absolute left-4 top-16 bg-black/60 text-white text-xs rounded px-2 py-1">
          {scanResult.barcode}
        </div>
      )}
    </div>
  );
}