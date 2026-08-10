export default function Spinner({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-[3px] border-[#8C916F]/20 border-t-[#8C916F] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
