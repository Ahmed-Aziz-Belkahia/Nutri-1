import { motion } from "framer-motion";
import { ReactNode } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";

interface EnhancedSelectionButtonProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  isSelected: boolean;
  onClick: () => void;
  gradientFrom?: string;
  gradientTo?: string;
  animationDelay?: number;
}

export default function EnhancedSelectionButton({
  label,
  description,
  icon,
  isSelected,
  onClick,
  gradientFrom = "#0CC5BA",
  gradientTo = "#3B82F6",
  animationDelay = 0
}: EnhancedSelectionButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + animationDelay * 0.1 }}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full group overflow-hidden ${
        isSelected ? "z-10" : "z-0"
      }`}
    >
      {/* Border gradient for selected state */}
      {isSelected ? (
        <div className="absolute inset-0 p-0.5 rounded-2xl bg-gradient-to-br from-[#0CC5BA] via-[#3B82F6] to-[#8B5CF6]">
          <div className="absolute inset-0 bg-white rounded-2xl" />
        </div>
      ) : null}

      <div
        className={`relative h-full p-6 rounded-2xl border-2 transition-all duration-300 ${
          isSelected
            ? "shadow-lg bg-gradient-to-r from-[#0CC5BA]/5 via-[#3B82F6]/5 to-[#8B5CF6]/5 border-transparent"
            : "border-gray-200 hover:border-gray-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Left icon or custom icon */}
          <div className={`flex-shrink-0 ${isSelected ? "" : "text-gray-400"}`}>
            {icon || (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected
                    ? "bg-gradient-to-br text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
                style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})` } : {}}
              >
                {isSelected ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <div className="w-6 h-6 opacity-60" />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 text-left">
            <h3
              className={`font-semibold text-lg transition-colors duration-200 ${
                isSelected
                  ? "bg-gradient-to-r bg-clip-text text-transparent"
                  : "text-gray-700"
              }`}
              style={isSelected ? { backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` } : {}}
            >
              {label}
            </h3>
            {description && description.trim() !== "" && (
              <p className="text-gray-500 text-sm mt-1">{description}</p>
            )}
          </div>

          {/* Right arrow indicator */}
          <div
            className={`ml-auto transition-transform duration-300 ${
              isSelected ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                isSelected
                  ? "bg-gradient-to-br text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
              style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})` } : {}}
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Bottom highlight line when selected */}
        {isSelected && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r"
            style={{ backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}
          />
        )}
      </div>
    </motion.button>
  );
}