import { ReactNode } from "react";

interface ScrollableContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  horizontal?: boolean;
}

/**
 * ScrollableContainer - Komponen wrapper untuk membuat konten yang bisa di-scroll dengan scrollbar tipis
 * 
 * @param children - Konten yang akan di-wrap
 * @param className - Class tambahan untuk styling
 * @param maxHeight - Maksimal tinggi container (default: "100%")
 * @param horizontal - Apakah scroll horizontal (default: false)
 * 
 * @example
 * <ScrollableContainer maxHeight="400px">
 *   <div>Content here</div>
 * </ScrollableContainer>
 */
export default function ScrollableContainer({
  children,
  className = "",
  maxHeight,
  horizontal = false,
}: ScrollableContainerProps) {
  const baseClasses = "custom-scrollbar";
  const overflowClass = horizontal
    ? "overflow-x-auto overflow-y-hidden"
    : "overflow-y-auto overflow-x-hidden";

  const style = maxHeight ? { maxHeight } : {};

  return (
    <div
      className={`${baseClasses} ${overflowClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

