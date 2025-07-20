//import { Button } from "@/components/ui/button";
//import { Camera, Search } from "lucide-react";
//import { useState } from "react";
//import { useLocation } from "wouter";
//import ScannerUI from "./ScannerUI";
//
//interface ActionButtonsProps {
//  onClose: () => void;
//}
//
//export default function ActionButtons({ onClose }: ActionButtonsProps) {
//  const [showScanner, setShowScanner] = useState(false);
//  const [, setLocation] = useLocation();
//
//  if (showScanner) {
//    return (
//      <ScannerUI
//        onClose={() => {
//          setShowScanner(false);
//          onClose();
//        }}
//        aria-label="Food Scanner"
//        description="Take a photo of your food to analyze its nutritional content"
//      />
//    );
//  }
//
//  return (
//    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end">
//      <div className="bg-white w-full px-6 pb-10 pt-6 space-y-6 rounded-t-[2rem]">
//        <h2 className="text-lg font-semibold text-gray-900">Add Food</h2>
//
//        <div className="grid grid-cols-2 gap-4">
//          <Button 
//            variant="outline" 
//            className="flex flex-col items-center justify-center h-[120px] border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 hover:border-[#0CC5BA] group transition-all duration-200"
//            onClick={() => {
//              setShowScanner(true);
//            }}
//          >
//            <div className="w-12 h-12 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center mb-3 group-hover:bg-[#0CC5BA]/20 transition-colors">
//              <Camera className="h-6 w-6 text-[#0CC5BA]" />
//            </div>
//            <span className="text-sm font-medium text-gray-900">Scan Food</span>
//            <span className="text-xs text-gray-500 mt-1">Take a photo of your meal</span>
//          </Button>
//
//          <Button 
//            variant="outline" 
//            className="flex flex-col items-center justify-center h-[120px] border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 hover:border-[#0CC5BA] group transition-all duration-200"
//            onClick={() => {
//              onClose();
//              setLocation("/food-database");
//            }}
//          >
//            <div className="w-12 h-12 rounded-full bg-[#0CC5BA]/10 flex items-center justify-center mb-3 group-hover:bg-[#0CC5BA]/20 transition-colors">
//              <Search className="h-6 w-6 text-[#0CC5BA]" />
//            </div>
//            <span className="text-sm font-medium text-gray-900">Search</span>
//            <span className="text-xs text-gray-500 mt-1">Browse food database</span>
//          </Button>
//        </div>
//
//        <Button 
//          variant="ghost" 
//          className="w-full bg-gray-50 text-gray-900 rounded-2xl h-14 hover:bg-gray-100"
//          onClick={onClose}
//        >
//          Cancel
//        </Button>
//      </div>
//    </div>
//  );
//}