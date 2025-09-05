import { cn } from "@/lib/utils";

interface SeparatorProps {
  className?: string;
  children?: React.ReactNode;
}

export function Separator({ className, children }: SeparatorProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-px flex-1 bg-gray-200" />
      {children && (
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {children}
        </span>
      )}
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
