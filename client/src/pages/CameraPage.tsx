import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { useToast } from "@/hooks/use-toast";
import SimpleCameraCapture from "@/components/SimpleCameraCapture";

export default function CameraPage() {
  const { t } = useTranslation(['common']);
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
        title: t('common:cameraPage.success.title'),
        description: t('common:cameraPage.success.description'),
      });
      
      // Navigate back to progress page
      setLocation('/progress');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: t('common:cameraPage.error.title'),
        description: t('common:cameraPage.error.description'),
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