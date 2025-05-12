"use client";

import { useRef, useEffect } from "react";

export default function ScrollContainer({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheelScroll = (event: WheelEvent) => {
      // Only intercept vertical scroll when not holding shift key
      if (!event.shiftKey) {
        // This is crucial to prevent default vertical scrolling
        event.preventDefault();
        
        // Translate vertical scroll to horizontal with a multiplier for better feel
        container.scrollLeft += event.deltaY * 1.5;
      }
    };
    
    // passive: false is required to allow preventDefault() to work
    container.addEventListener("wheel", handleWheelScroll, { passive: false });
    
    return () => {
      container.removeEventListener("wheel", handleWheelScroll);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className={className || ""}
      // These styles help ensure correct behavior on all devices
      style={{ touchAction: "pan-x" }}
    >
      {children}
    </div>
  );
}