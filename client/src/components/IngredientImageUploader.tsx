import { useState, useRef } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface IngredientImageUploaderProps {
  ingredientId: number;
  ingredientName: string;
  onSuccess: (imageUrl: string) => void;
  onCancel: () => void;
}

export function IngredientImageUploader({
  ingredientId,
  ingredientName,
  onSuccess,
  onCancel
}: IngredientImageUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCameraInterface, setShowCameraInterface] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Function to open file picker
  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCapturedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Function to show camera interface
  const handleTakePhoto = async () => {
    setShowCameraInterface(true);
    
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions or use file upload.",
        variant: "destructive"
      });
      setShowCameraInterface(false);
    }
  };
  
  // Function to capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        
        // Stop all video streams
        const stream = video.srcObject as MediaStream;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
        }
        
        setShowCameraInterface(false);
      }
    }
  };
  
  // Function to cancel camera interface
  const closeCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
    setShowCameraInterface(false);
  };
  
  // Function to upload image
  const handleUpload = async () => {
    if (!capturedImage) return;
    
    setIsUploading(true);
    
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, `ingredient_${ingredientId}.jpg`);
      formData.append('ingredientId', ingredientId.toString());
      formData.append('ingredientName', ingredientName);
      
      // Upload image
      const uploadResponse = await fetch('/api/shopping-list-items/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await uploadResponse.json();
      
      toast({
        title: "Image Uploaded",
        description: "Your ingredient image has been saved",
      });
      
      // Call success callback with new image URL
      onSuccess(data.imageUrl);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // If showing camera interface
  if (showCameraInterface) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-black text-white">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={closeCamera}
            className="text-white"
          >
            <X className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-medium">Take Photo</h2>
          <div className="w-10"></div>
        </div>
        
        <div className="flex-1 relative">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <div className="p-4 bg-black">
          <Button 
            className="w-16 h-16 rounded-full mx-auto block bg-white hover:bg-gray-200"
            onClick={capturePhoto}
          >
            <div className="w-12 h-12 rounded-full border-2 border-black"></div>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Add Image for {ingredientName}</h3>
        <p className="text-sm text-gray-500">Take a photo or choose from your gallery</p>
      </div>
      
      {capturedImage ? (
        <div className="relative mb-4">
          <img 
            src={capturedImage} 
            alt="Captured ingredient"
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={() => setCapturedImage(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 mb-4">
          <Button
            variant="outline"
            className="flex-1 h-24 flex flex-col items-center justify-center border-dashed border-2"
            onClick={handleTakePhoto}
          >
            <Camera className="h-6 w-6 mb-2" />
            <span>Camera</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex-1 h-24 flex flex-col items-center justify-center border-dashed border-2"
            onClick={handleChooseFile}
          >
            <Upload className="h-6 w-6 mb-2" />
            <span>Gallery</span>
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <Button
          className="flex-1 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white"
          onClick={handleUpload}
          disabled={!capturedImage || isUploading}
        >
          {isUploading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Save Image
            </>
          )}
        </Button>
      </div>
    </div>
  );
}