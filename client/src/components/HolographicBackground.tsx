import { motion } from "framer-motion";

export default function HolographicBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,197,186,0.15)_0%,transparent_70%)]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Scan lines */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
    </div>
  );
}