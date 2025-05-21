import { FileText, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsDisplayProps {
  analysisResults: any;
  caseReport: string | null;
  enhancedImage: string | null;
  objectDetectionResults: any;
  onDownloadReport: () => void;
}

export function ResultsDisplay({
  analysisResults,
  caseReport,
  enhancedImage,
  objectDetectionResults,
  onDownloadReport,
}: ResultsDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Analysis Results */}
      {analysisResults && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Analysis Results</h3>
          {analysisResults.map((result: any, index: number) => (
            <div key={index} className="mb-4 last:mb-0">
              <p className="text-sm font-medium">{result.predicted_crime_type}</p>
              <p className="text-sm text-muted-foreground">{result.predicted_crime}</p>
              <p className="text-xs text-muted-foreground mt-1">Confidence: {(result.confidence_score * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      )}
      {/* Object Detection Results */}


      {/* Evidence Guide */}
     

      {/* Case Report */}
      {caseReport && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Case Report</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={onDownloadReport}
            >
              <FileUp className="h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[600px]">
            {caseReport.split('\n').map((line, index) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              
              if (trimmedLine.startsWith('**')) {
                return (
                  <h4 key={index} className="font-medium text-base sticky top-0 bg-background py-2">
                    {trimmedLine.replace(/\*\*/g, '')}
                  </h4>
                );
              }
              
              if (trimmedLine.startsWith('*')) {
                return (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{trimmedLine.replace('*', '')}</span>
                  </div>
                );
              }
              
              return <p key={index} className="text-sm">{trimmedLine}</p>;
            })}
          </div>
        </div>
      )}

      {/* Fingerprint Results */}

      {/* Enhanced Image */}
      {enhancedImage && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Enhanced Image</h3>
          <img 
            src={enhancedImage} 
            alt="Enhanced" 
            className="w-full rounded-lg"
          />
        </div>
      )}

      
      {/* Default State */}
      {!analysisResults && !caseReport  && !enhancedImage  && !objectDetectionResults && (
        <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg">
          <div className="p-3 bg-muted rounded-lg mb-3">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-medium">Analysis results will appear here</h3>
          <p className="text-xs mt-2 text-muted-foreground">
            Click "Analyze" on an evidence image to generate insights and analysis
          </p>
        </div>
      )}
    </div>
  );
} 
