import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useCaseManagement } from './hooks/useCaseManagement';
import { useParams } from 'react-router-dom';

interface CaseAnalysisProps {
  // Add any props your component needs
}

const CaseAnalysis: React.FC<CaseAnalysisProps> = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { 
    uploadedImages, 
    handleFileUpload, 
    handleDeleteImage, 
    analyzeEvidence,
    isAnalyzing,
    isProcessing,
    analysisResults
  } = useCaseManagement(caseId);

  const handleAnalyzeClick = useCallback(async () => {
    console.log("Analyze button clicked");
    try {
      await analyzeEvidence();
    } catch (error) {
      console.error("Error in handleAnalyzeClick:", error);
    }
  }, [analyzeEvidence]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const imageFiles = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      handleFileUpload(imageFiles);
    }
  }, [handleFileUpload]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Case Analysis</h2>
      
      {/* File upload section */}
      <div className="mb-6">
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <label 
          htmlFor="file-upload"
          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Upload Images
        </label>
        
        <span className="ml-2">
          {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} selected
        </span>
      </div>
      
      {/* Image preview section */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {uploadedImages.map((img, index) => (
            <div key={index} className="relative">
              <img 
                src={img.preview} 
                alt={`Preview ${index}`} 
                className="w-full h-32 object-cover rounded"
              />
              <button
                onClick={() => handleDeleteImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Analysis button */}
      <Button
        onClick={handleAnalyzeClick}
        disabled={uploadedImages.length === 0 || isAnalyzing}
        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Evidence'}
      </Button>
      
      {/* Results section */}
      {analysisResults && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2">Analysis Results</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(analysisResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CaseAnalysis;