import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  className?: string; // Additional classes for the spinner container
  size?: number | string; // Size of the spinner (e.g. 24 or "1.5rem")
}

export default function LoadingSpinner({ className = "", size = 48 }: LoadingSpinnerProps) {
  const spinnerSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <motion.div
      className={`border-[3px] border-primary/25 border-t-primary border-solid rounded-full ${className}`}
      style={{ width: spinnerSize, height: spinnerSize }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}
