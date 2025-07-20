import { FC } from 'react';
import RecipeScanner from '@/components/RecipeScanner';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

const RecipeScannerPage: FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  console.log('Current location in RecipeScannerPage:', location);

  const handleClose = () => {
    // Invalidate recipes queries before navigating away to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "created"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recipes", "saved"] });
    setLocation('/recipes');
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden" style={{ backgroundColor: '#000000', overflowY: 'hidden' }}>
      <RecipeScanner onClose={handleClose} />
    </div>
  );
};

export default RecipeScannerPage;