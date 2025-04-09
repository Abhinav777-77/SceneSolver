import { Search } from "lucide-react";

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-8 h-8 text-primary animate-bounce" />
          </div>
        </div>
        <p className="text-lg font-medium text-primary animate-pulse">Analyzing...</p>
      </div>
    </div>
  );
} 