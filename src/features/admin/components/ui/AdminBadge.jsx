// Reusable status / label badge for admin tables and detail views
import cn from "@/lib/cn";

const VARIANT_CLASSES = {
  green:  "bg-green-50 text-green-700 border-green-200",
  red:    "bg-red-50 text-red-600 border-red-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray:   "bg-gray-50 text-gray-600 border-gray-200",
  olive:  "bg-[#6B7F59]/10 text-[#6B7F59] border-[#6B7F59]/20",
};

export function AdminBadge({ children, variant = "gray", dot = false, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border",
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.gray,
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
      )}
      {children}
    </span>
  );
}

export default AdminBadge;
