import React, { useState } from 'react';
import { FoodComponent } from '../types/food';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

interface ComponentEditorProps {
  component: FoodComponent;
  onSave: (updatedComponent: FoodComponent) => void;
  onCancel: () => void;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
  onSave,
  onCancel
}) => {
  const { t } = useTranslation();
  const [editedComponent, setEditedComponent] = useState<FoodComponent>(component);
  
  // Ensure we have a details object to work with
  const ensureDetails = () => {
    if (!editedComponent.details) {
      setEditedComponent({
        ...editedComponent,
        details: {}
      });
    }
  };

  // Handle input change for basic properties
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('details.')) {
      ensureDetails();
      const detailKey = name.replace('details.', '');
      setEditedComponent({
        ...editedComponent,
        details: {
          ...editedComponent.details,
          [detailKey]: value
        }
      });
    } else if (name === 'seasonings' || name === 'garnishes') {
      ensureDetails();
      const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
      setEditedComponent({
        ...editedComponent,
        details: {
          ...editedComponent.details,
          [name]: items
        }
      });
    } else if (['calories', 'protein', 'carbs', 'fat'].includes(name)) {
      setEditedComponent({
        ...editedComponent,
        [name]: parseFloat(value) || 0
      });
    } else {
      setEditedComponent({
        ...editedComponent,
        [name]: value
      });
    }
  };

  // Get a value from nested details safely
  const getDetailValue = (key: string): string => {
    if (!editedComponent.details) return '';
    
    const value = editedComponent.details[key];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value?.toString() || '';
  };

  // Handle save button click
  const handleSave = () => {
    onSave(editedComponent);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
          {t('component.editor.title', 'Edit Component Details')}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-1 border-red-200 text-red-500 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1 bg-[#0CC5BA] hover:bg-[#0CC5BA]/90 text-white"
          >
            <Save className="h-4 w-4" />
            {t('common.save', 'Save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Properties */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#0CC5BA] uppercase tracking-wider mb-3 flex items-center">
            <div className="w-1 h-4 bg-[#0CC5BA] rounded-full mr-2"></div>
            {t('component.editor.basicInfo', 'Basic Information')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">{t('component.editor.name', 'Name')}</Label>
              <Input
                id="name"
                name="name"
                value={editedComponent.name}
                onChange={handleInputChange}
                placeholder={t('component.editor.namePlaceholder', 'Component name')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="calories">{t('component.editor.calories', 'Calories')}</Label>
                <Input
                  id="calories"
                  name="calories"
                  type="number"
                  value={editedComponent.calories}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="servingSize">{t('component.editor.servingSize', 'Serving Size')}</Label>
                <Input
                  id="servingSize"
                  name="servingSize"
                  value={editedComponent.servingSize || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. 100g, 1 cup"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="protein">{t('component.editor.protein', 'Protein (g)')}</Label>
                <Input
                  id="protein"
                  name="protein"
                  type="number"
                  value={editedComponent.protein}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="carbs">{t('component.editor.carbs', 'Carbs (g)')}</Label>
                <Input
                  id="carbs"
                  name="carbs"
                  type="number"
                  value={editedComponent.carbs}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="fat">{t('component.editor.fat', 'Fat (g)')}</Label>
                <Input
                  id="fat"
                  name="fat"
                  type="number"
                  value={editedComponent.fat}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Component Properties */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#0CC5BA] uppercase tracking-wider mb-3 flex items-center">
            <div className="w-1 h-4 bg-[#0CC5BA] rounded-full mr-2"></div>
            {t('component.editor.properties', 'Component Properties')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="details.type">{t('component.editor.type', 'Type')}</Label>
              <Input
                id="details.type"
                name="details.type"
                value={getDetailValue('type')}
                onChange={handleInputChange}
                placeholder={t('component.editor.typePlaceholder', 'e.g. Main dish, Side, Dessert')}
              />
            </div>
            
            <div>
              <Label htmlFor="details.preparation">{t('component.editor.preparation', 'Preparation')}</Label>
              <Input
                id="details.preparation"
                name="details.preparation"
                value={getDetailValue('preparation')}
                onChange={handleInputChange}
                placeholder={t('component.editor.preparationPlaceholder', 'e.g. Chopped, Minced, Sliced')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="details.cookingMethod">{t('component.editor.cookingMethod', 'Cooking Method')}</Label>
                <Input
                  id="details.cookingMethod"
                  name="details.cookingMethod"
                  value={getDetailValue('cookingMethod')}
                  onChange={handleInputChange}
                  placeholder={t('component.editor.cookingMethodPlaceholder', 'e.g. Baked, Fried, Boiled')}
                />
              </div>
              <div>
                <Label htmlFor="details.doneness">{t('component.editor.doneness', 'Doneness')}</Label>
                <Input
                  id="details.doneness"
                  name="details.doneness"
                  value={getDetailValue('doneness')}
                  onChange={handleInputChange}
                  placeholder={t('component.editor.donenessPlaceholder', 'e.g. Well-done, Medium, Rare')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Details */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-[#0CC5BA] uppercase tracking-wider mb-3 flex items-center">
          <div className="w-1 h-4 bg-[#0CC5BA] rounded-full mr-2"></div>
          {t('component.editor.additionalDetails', 'Additional Details')}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <Label htmlFor="details.texture">{t('component.editor.texture', 'Texture')}</Label>
              <Input
                id="details.texture"
                name="details.texture"
                value={getDetailValue('texture')}
                onChange={handleInputChange}
                placeholder={t('component.editor.texturePlaceholder', 'e.g. Crunchy, Soft, Crispy')}
              />
            </div>
            
            <div>
              <Label htmlFor="details.temperature">{t('component.editor.temperature', 'Temperature')}</Label>
              <Input
                id="details.temperature"
                name="details.temperature"
                value={getDetailValue('temperature')}
                onChange={handleInputChange}
                placeholder={t('component.editor.temperaturePlaceholder', 'e.g. Hot, Cold, Room temperature')}
              />
            </div>
            
            <div>
              <Label htmlFor="details.color">{t('component.editor.color', 'Color')}</Label>
              <Input
                id="details.color"
                name="details.color"
                value={getDetailValue('color')}
                onChange={handleInputChange}
                placeholder={t('component.editor.colorPlaceholder', 'e.g. Golden brown, Vibrant green')}
              />
            </div>
            
            <div>
              <Label htmlFor="details.estimatedWeight">{t('component.editor.estimatedWeight', 'Estimated Weight')}</Label>
              <Input
                id="details.estimatedWeight"
                name="details.estimatedWeight"
                value={getDetailValue('estimatedWeight')}
                onChange={handleInputChange}
                placeholder={t('component.editor.estimatedWeightPlaceholder', 'e.g. 200g, 0.5lb')}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="seasonings">{t('component.editor.seasonings', 'Seasonings')}</Label>
              <Textarea
                id="seasonings"
                name="seasonings"
                value={getDetailValue('seasonings')}
                onChange={handleInputChange}
                placeholder={t('component.editor.seasoningsPlaceholder', 'Salt, Pepper, Herbs (comma separated)')}
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <Label htmlFor="garnishes">{t('component.editor.garnishes', 'Garnishes')}</Label>
              <Textarea
                id="garnishes"
                name="garnishes"
                value={getDetailValue('garnishes')}
                onChange={handleInputChange}
                placeholder={t('component.editor.garnishesPlaceholder', 'Parsley, Lemon wedge (comma separated)')}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="details.presentation">{t('component.editor.presentation', 'Presentation')}</Label>
          <Textarea
            id="details.presentation"
            name="details.presentation"
            value={getDetailValue('presentation')}
            onChange={handleInputChange}
            placeholder={t('component.editor.presentationPlaceholder', 'Describe how the food is presented')}
            className="min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};