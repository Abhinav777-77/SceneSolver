import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ImageFile {
  file: File;
  preview: string;
}

// Add proper types for object detection results
interface ObjectDetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class: string;
}

interface ObjectDetectionData {
  detected_objects: string[];
  boxes: ObjectDetectionBox[];
  annotated_image: string;
  processing_time: number;
}

interface ObjectDetectionResult {
  filename: string;
  case_id?: string;
  user_id?: string;
  detected_objects: ObjectDetectionData;
  timestamp: number;
}

export function useCaseManagement(caseId?: string) {
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [caseReport, setCaseReport] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [analyzedImages, setAnalyzedImages] = useState<string[]>([]);
  const [objectDetectionResults, setObjectDetectionResults] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = (newImages: ImageFile[]) => {
    // Add new images to the existing array instead of replacing it
    setUploadedImages(prevImages => [...prevImages, ...newImages]);
    
    // If no image is currently selected, select the first new one
    if (!selectedImage && newImages.length > 0) {
      setSelectedImage(newImages[0].preview);
    }
    
    toast({
      title: "Upload Successful",
      description: `Uploaded ${newImages.length} image${newImages.length !== 1 ? "s" : ""}.`,
    });
  };

  const handleDeleteImage = (index: number) => {
    setUploadedImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      
      // If the deleted image was selected, select another one if available
      if (selectedImage === prevImages[index].preview) {
        if (newImages.length > 0) {
          // Select the next image, or the previous one if we deleted the last image
          const newIndex = index < newImages.length ? index : newImages.length - 1;
          setSelectedImage(newImages[newIndex].preview);
        } else {
          setSelectedImage(null);
        }
      }
      
      return newImages;
    });
    
    toast({
      title: "Image Deleted",
      description: "The image has been removed from your case.",
    });
  };

  const analyzeEvidence = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please upload at least one image to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      uploadedImages.forEach((image, index) => {
        formData.append("images", image.file);
        // Add the index as a field to track which image is which
        formData.append("imageIndices", index.toString());
        caseId=sessionStorage.getItem("caseId");
       const  userid=sessionStorage.getItem("userid");
        formData.append("case_id",caseId);
        formData.append("user_id",userid);

      });
        
      // Fix the endpoint URL by adding the /api prefix
      const response = await fetch("http://localhost:5000/api/analysis/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.log("Response not ok:", response);
        throw new Error("Failed to analyze evidence.");
      }

      const data = await response.json();
      console.log("Analysis Result:", data);
      
      // Add the image index to each result
      const processedResults = data.results.map((result, index) => ({
        ...result,
        imageIndex: index
      }));
      
      setAnalysisResults(processedResults);
      
      // Store the analyzed images but don't modify the uploadedImages state
      setAnalyzedImages(uploadedImages.map(img => img.preview));

      toast({
        title: "Analysis Complete",
        description: "Your evidence has been analyzed. View the results in the Studio tab.",
      });
    } catch (error) {
      console.error("Error analyzing evidence:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };



  const fetchCaseReport = async () => {
    if (!caseId) {
      toast({
        title: "No Case Selected",
        description: "Please select a case to generate a report.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("case_id", caseId);
      
      // Get user ID from sessionStorage
      const userId = sessionStorage.getItem("userid");
      
      if (!userId) {
        // If userId is not in sessionStorage, try to get it from localStorage
        const userIdFromLocal = localStorage.getItem("userId");
        if (userIdFromLocal) {
          formData.append("user_id", userIdFromLocal);
        } else {
          // If still no userId, check if there's a user object in sessionStorage or localStorage
          const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              if (user && user.id) {
                formData.append("user_id", user.id);
              } else {
                throw new Error("User ID not found in session. Please log in again.");
              }
            } catch (e) {
              throw new Error("Failed to parse user data. Please log in again.");
            }
          } else {
            throw new Error("User ID not found in session. Please log in again.");
          }
        }
      } else {
        formData.append("user_id", userId);
      }

      // Log what we're sending
      console.log("Generating report for case ID:", caseId);
      console.log("User ID:", formData.get("user_id"));
      
      // Log the FormData entries
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }

      const reportResponse = await fetch("http://localhost:5001/api/report/generate", {
        method: "POST",
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'text/event-stream',
          'x-auth-token': sessionStorage.getItem("authToken") || "" // Use the token from sessionStorage
        }
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.text();
        console.error("Server response:", errorData);
        throw new Error("Failed to generate case report.");
      }

      const reader = reportResponse.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let reportContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the Uint8Array to text
        const text = new TextDecoder().decode(value);
        // Remove the "data: " prefix and newlines from each chunk
        const cleanText = text.replace(/^data: /, '').replace(/\n\n$/, '');
        reportContent += cleanText;
      }

      setCaseReport(reportContent);

      toast({
        title: "Case Report Generated",
        description: "Check the report in the Studio tab.",
      });
    } catch (error) {
      console.error("Error generating case report:", error);
      toast({
        title: "Failed to Generate Report",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  

  const handleImageEnhancement = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("images", uploadedImages[0].file);

      const response = await fetch("http://localhost:5000/enhance", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to enhance image.");
      }

      const data = await response.json();
      setEnhancedImage(data.enhanced_image);
      toast({
        title: "Image Enhancement Complete",
        description: "Check the enhanced image in the Studio tab.",
      });
    } catch (error) {
      console.error("Error enhancing image:", error);
      toast({
        title: "Image Enhancement Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };



  const detectObjects = async () => {
    if (uploadedImages.length === 0 || !selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to detect objects.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Find the index of the selected image
      const selectedIndex = uploadedImages.findIndex(img => img.preview === selectedImage);
      if (selectedIndex === -1) {
        throw new Error("Selected image not found.");
      }

      const formData = new FormData();
      formData.append("images", uploadedImages[selectedIndex].file);
      
      // Add case_id to the form data if available
      if (caseId) {
        formData.append('case_id', caseId);
      }
      const userId=sessionStorage.getItem("userid")
      formData.append('user_id',userId)

      console.log("Sending request to analyze_images endpoint...");
      const response = await fetch("http://localhost:5000/api/analysis/analyze_images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to detect objects.");
      }

      const data = await response.json();
      console.log("Object detection results:", data);
      console.log("Results structure:", JSON.stringify(data, null, 2));
      setObjectDetectionResults(data);
      
      // Add the analyzed image to analyzedImages state if not already there
      if (!analyzedImages.includes(selectedImage)) {
        setAnalyzedImages(prev => [...prev, selectedImage]);
      }
      
      toast({
        title: "Object Detection Complete",
        description: "Check the results in the Studio tab.",
      });
    } catch (error) {
      console.error("Error detecting objects:", error);
      toast({
        title: "Object Detection Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    uploadedImages,
    selectedImage,
    isAnalyzing,
    isProcessing,
    analysisResults,
    caseReport,
    enhancedImage,
    analyzedImages,
    objectDetectionResults,
    setSelectedImage,
    handleFileUpload,
    handleDeleteImage,
    analyzeEvidence,
    fetchCaseReport,
    handleImageEnhancement,
    detectObjects,
  };
} 
