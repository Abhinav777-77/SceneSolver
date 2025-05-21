import { Microscope, Fingerprint, Camera, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AnalysisToolsProps {
  isAnalyzing: boolean;
  hasImages: boolean;
  onAnalyzeEvidence: () => void;
  onImageEnhancement: () => void;
  onGenerateReport: () => void;
}

export function AnalysisTools({
  isAnalyzing,
  hasImages,
  onAnalyzeEvidence,
  onImageEnhancement,
  onGenerateReport,
}: AnalysisToolsProps) {
  return (
    <div className="p-4">
      {/* Remove the Analyze Evidence card */}
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Tools</h3>
        </div>
        
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start text-left" 
            size="sm" 
            onClick={onImageEnhancement}
            disabled={!hasImages}
          >
            <Camera className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Image Enhancement</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-left" 
            size="sm" 
            onClick={onGenerateReport}
            disabled={!hasImages}
          >
            <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Evidence Report</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 
