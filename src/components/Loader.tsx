"use client";

import { motion, Variants } from "framer-motion";

export function Loader() {
  const dotVariants: Variants = {
    jump: {
      y: -30,
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      animate="jump"
      transition={{ staggerChildren: -0.2, staggerDirection: -1 }}
      className="flex items-center justify-center gap-2.5 min-h-24"
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-black will-change-transform"
        variants={dotVariants}
      />
      <motion.div
        className="w-5 h-5 rounded-full bg-black will-change-transform"
        variants={dotVariants}
      />
      <motion.div
        className="w-5 h-5 rounded-full bg-black will-change-transform"
        variants={dotVariants}
      />
    </motion.div>
  );
}

export default Loader;
