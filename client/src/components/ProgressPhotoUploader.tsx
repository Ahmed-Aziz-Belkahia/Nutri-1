import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProgressPhotos } from '@/hooks/use-progress-photos';
import { useTranslation } from 'react-i18next';

interface ProgressPhotoUploaderProps {
  onPhotoAdded?: () => void;
}

export default function ProgressPhotoUploader({ onPhotoAdded }: ProgressPhotoUploaderProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPhoto, isAddingPhoto } = useProgressPhotos();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file.",
      });
      return;
    }

    // Preview the image
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    
    try {
      setIsUploading(true);
      
      // Upload the photo
      await addPhoto({
        photoUrl: selectedImage,
        type: 'latest',
        caption: 'Progress photo'
      });
      
      // Reset the component state
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Display success message
      toast({
        title: "Photo uploaded",
        description: "Your progress photo has been saved.",
      });
      
      // Notify parent component
      if (onPhotoAdded) onPhotoAdded();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {selectedImage ? (
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-[#0CC5BA]/20 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="w-full h-full object-cover"
            />
            <button 
              onClick={handleCancel}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleCancel}
              className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl font-semibold py-3"
              disabled={isUploading || isAddingPhoto}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1 bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] hover:from-[#0BB5AA] hover:to-[#0BB9CC] text-white rounded-2xl font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isUploading || isAddingPhoto}
            >
              {(isUploading || isAddingPhoto) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Save Photo
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={triggerFileInput}
            className="h-20 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex flex-col items-center justify-center gap-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs font-semibold">Take Photo</span>
          </Button>
          <Button
            onClick={triggerFileInput}
            className="h-20 bg-gradient-to-br from-[#0CC5BA] to-[#0CBACC] hover:from-[#0BB5AA] hover:to-[#0BB9CC] text-white flex flex-col items-center justify-center gap-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs font-semibold">Upload</span>
          </Button>
        </div>
      )}
    </div>
  );
}