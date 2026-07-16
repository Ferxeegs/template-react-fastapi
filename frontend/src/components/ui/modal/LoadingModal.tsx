import React, { useEffect, useState, useRef } from "react";

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  minDuration?: number; // Minimum time in ms to display the loading state to avoid flashing
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  message = "Memuat data...",
  minDuration = 500, // 500ms minimum display time
}) => {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      startTimeRef.current = Date.now();
      setShow(true);
      // Small delay to trigger the CSS transition
      const animTimer = setTimeout(() => {
        setAnimate(true);
      }, 20);
      return () => clearTimeout(animTimer);
    } else {
      if (startTimeRef.current !== null) {
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, minDuration - elapsedTime);

        timeoutRef.current = setTimeout(() => {
          setAnimate(false);
          // Wait for fade-out animation to complete
          const fadeTimer = setTimeout(() => {
            setShow(false);
            startTimeRef.current = null;
          }, 200); // matching duration-200 class
          return () => clearTimeout(fadeTimer);
        }, remainingTime);
      } else {
        setShow(false);
        setAnimate(false);
      }
    }
  }, [isOpen, minDuration]);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20 backdrop-blur-[6px] z-[99999] transition-all duration-200 ease-out ${
        animate ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center p-6 bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 max-w-[220px] w-full text-center transition-all duration-200 ease-out ${
          animate ? "scale-100" : "scale-95"
        }`}
      >
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-250 select-none">
          {message}
        </p>
      </div>
    </div>
  );
};
