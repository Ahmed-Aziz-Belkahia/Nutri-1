import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, Result } from '@zxing/library';
import { lookupBarcode } from '@/lib/barcode';

// Interface for the component props
interface BarcodeScannerProps {
  onClose: () => void;
  onScanSuccess: (product: any) => void;
}

export default function BarcodeScanner({ onClose, onScanSuccess }: BarcodeScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const lastResultRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const cameraAttempts = useRef<number>(0);
  
  // Optimized low-resolution camera constraints for better performance
  const [cameraConstraints, setCameraConstraints] = useState({
    facingMode: 'environment',
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    aspectRatio: 4/3,
    frameRate: { max: 15 }
  });

  // Initialize barcode reader with optimal settings
  useEffect(() => {
    // Create hints with preferred formats for product barcodes
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128
    ]);
    
    // Set advanced options for better detection
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    hints.set(DecodeHintType.PURE_BARCODE, false);
    
    // Initialize reader with specified hints
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    
    // Clean up
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Set up continuous scanning when camera is ready
  useEffect(() => {
    // Skip setup if conditions aren't right
  if (!cameraReady || !readerRef.current || !webcamRef.current || !scanning) {
      return;
    }
    
    // Scanner frame processing function
    const processFrame = async () => {
      // Skip if already processing or scanning disabled
      if (processingRef.current || !scanning) {
        return;
      }
      
      // Set processing flag to prevent concurrent scans
      processingRef.current = true;
      
      // Get reference to video element
      const videoElement = webcamRef.current?.video;
      if (!videoElement) {
        processingRef.current = false;
        return;
      }
      
      try {
        // Scan for barcodes
        if (readerRef.current) {
          try {
            const result = await readerRef.current.decodeFromVideoElement(videoElement);
            
            // Process valid result
            if (result && typeof result.getText === 'function') {
              handleBarcodeResult(result);
            }
          } catch (error) {
            // Expected errors when no barcode in frame - silently ignore
            if (!(error instanceof Error && error.name === 'NotFoundException')) {
              console.debug('Scan error:', error);
            }
          }
        }
      } finally {
        // Always clear processing flag when done
        processingRef.current = false;
      }
    };
    
    // Set up interval with optimal frequency (not too fast, not too slow)
    // Lower scan rate to 200ms to reduce CPU usage
    scanIntervalRef.current = window.setInterval(processFrame, 200);
    
    // Cleanup function
    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraReady, scanning]);
  
  // Handle successful barcode detection
  const handleBarcodeResult = async (result: Result) => {
    const barcodeText = result.getText();
    
    // Prevent duplicate scans
    if (lastResultRef.current === barcodeText) return;
    lastResultRef.current = barcodeText;
    
    console.log('Barcode detected:', barcodeText);
    
    // Stop scanning
    setScanning(false);
    
    // Add vibration feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    try {
      // Lookup product data
      const product = await lookupBarcode(barcodeText);
      
      // Return product to parent component
      onScanSuccess(product);
    } catch (error) {
      console.error('Error processing barcode:', error);
      setError('Failed to lookup product information');
      
      // Resume scanning after error
      setTimeout(() => {
        setScanning(true);
        lastResultRef.current = null;
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Camera feed */}
      <div className="relative h-full w-full overflow-hidden">
  <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={cameraConstraints}
          onUserMedia={() => {
            console.log("Camera accessed successfully");
            setCameraReady(true);
            cameraAttempts.current = 0; // Reset counter on success
          }}
          onUserMediaError={(err) => {
            console.error("Camera error:", err);
            
            // Try with reduced settings if we have fewer than 3 attempts
            if (cameraAttempts.current < 3) {
              cameraAttempts.current += 1;
              console.log(`Camera access failed. Attempt ${cameraAttempts.current} with reduced settings`);
              
              // Progressively lower camera settings on each attempt
              setCameraConstraints({
                facingMode: 'environment',
                width: { ideal: 480, max: 640 },
                height: { ideal: 360, max: 480 },
                aspectRatio: 4/3,
                frameRate: { max: 10 }
              });
              
              // Force webcam to re-initialize
              setTimeout(() => {
                setCameraReady(false);
              }, 500);
            } else {
              setError('Camera access denied. Please ensure camera permissions are granted in your browser.');
            }
          }}
          className="absolute inset-0 h-full w-full object-cover"
          mirrored={false}
          imageSmoothing={false} // Disable image smoothing for better barcode detection
          screenshotFormat="image/jpeg"
  />
        
        {/* Overlay with scanner UI */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 pointer-events-none">
          {/* Header */}
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
            
            <div className="w-10 h-10"></div>
          </div>
          
          {/* Scanner target area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-4/5 max-w-xs aspect-[3/2]">
              {/* Scanner frame */}
              <div className="absolute inset-0 border-2 border-[#0E95A7] rounded-lg"></div>
              
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#0E95A7]"></div>
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#0E95A7]"></div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#0E95A7]"></div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#0E95A7]"></div>
              
              {/* Scanning animation - horizontal line */}
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
              
              {/* Scanning laser effect */}
              <motion.div 
                className="absolute inset-0 bg-[#0E95A7]/10"
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-20 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
              {scanning ? "Point camera at barcode" : "Barcode detected..."}
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-28 left-0 right-0 flex justify-center"
          >
            <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}