/**
 * Barcode utilities for product lookup
 */

// Interface for product data
export interface ProductData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string | null;
  barcode: string;
}

/**
 * Lookup product data from Open Food Facts API
 * In a real app, this would be connected to a real API
 */
export async function lookupBarcodeFromAPI(barcode: string): Promise<ProductData | null> {
  console.log(`Looking up barcode ${barcode} from API...`);
  
  // This would be a real API call in production
  // const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  // const response = await fetch(url);
  // const data = await response.json();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Simulate API response based on barcode format
  if (barcode && barcode.length >= 8 && barcode.length <= 13 && /^\d+$/.test(barcode)) {
    // Valid EAN/UPC barcode format
    return null; // Simulate API not finding this product
  } else {
    // Invalid barcode format
    return null;
  }
}

/**
 * Lookup product data by barcode - handles all cases
 * 
 * @param barcode - The barcode string
 * @returns ProductData object with nutrition information
 */
export async function lookupBarcode(barcode: string): Promise<ProductData> {
  console.log(`Processing barcode ${barcode}...`);
  
  // Validate barcode format
  if (!barcode || barcode.trim() === "") {
    throw new Error("Invalid barcode: empty barcode");
  }
  
  // Check format (basic validation)
  if (!/^\d+$/.test(barcode)) {
    throw new Error("Invalid barcode format");
  }
  
  try {
    // Try to get from API first (would connect to real service in production)
    const apiResult = await lookupBarcodeFromAPI(barcode);
    if (apiResult) {
      return apiResult;
    }
    
    // For demo purposes, some hardcoded products
    if (barcode === "8005276") {
      return {
        name: "Milka Chocolate",
        calories: 530,
        protein: 6.5,
        carbs: 57.0,
        fat: 30.0,
        image: "https://world.openfoodfacts.org/images/products/800/527/600/0323/front_en.6.400.jpg",
        barcode
      };
    }
    
    // If API doesn't have it, create a generic product
    return {
      name: `Scanned Product`,
      calories: 200,
      protein: 5,
      carbs: 20, 
      fat: 10,
      barcode
    };
  } catch (error) {
    console.error("Error looking up barcode:", error);
    throw new Error(`Failed to lookup product data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}