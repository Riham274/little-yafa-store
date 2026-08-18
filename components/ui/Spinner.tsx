export default function Spinner({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-[3px] border-[#5A5F44]/20 border-t-[#5A5F44] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
