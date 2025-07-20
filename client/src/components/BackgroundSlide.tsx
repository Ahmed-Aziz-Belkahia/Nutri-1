import { motion } from "framer-motion";

interface BackgroundSlideProps {
  fallbackBg: string;
  isActive: boolean;
}

export default function BackgroundSlide({ fallbackBg, isActive }: BackgroundSlideProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className={`absolute inset-0 overflow-hidden ${fallbackBg}`}
    >
      <div className="absolute inset-0 bg-black/40" />
    </motion.div>
  );
}
