import { useLocation } from "wouter";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { useToast } from "@/hooks/use-toast";
import SimpleCameraCapture from "@/components/SimpleCameraCapture";

export default function CameraPage() {
  const [, setLocation] = useLocation();
  const { uploadPhoto } = useProgressPhotos();
  const { toast } = useToast();

  const handleCameraCapture = async (photoDataUrl: string) => {
    try {
      console.log("Uploading captured photo...", {
        hasData: !!photoDataUrl,
        dataLength: photoDataUrl.length,
        isBase64: photoDataUrl.startsWith('data:image/')
      });
      
      // The uploadPhoto function expects a photoUrl (base64 data URL)
      await uploadPhoto(photoDataUrl, 'progress-now');
      
      toast({
        title: "Success",
        description: "Progress photo uploaded successfully!",
      });
      
      // Navigate back to progress page
      setLocation('/progress');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setLocation('/progress');
  };

  return (
    <SimpleCameraCapture
      onCapture={handleCameraCapture}
      onClose={handleClose}
    />
  );
}