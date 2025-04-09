import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Image,
  FileText,
  Microscope,
  Fingerprint,
  Trash2,
  Camera,
  BarChart3,
  Eye,
  Share,
  Settings,
  UploadCloud,
  Plus,
  ChevronRight,
  MessageSquare,
  Book,
  Scroll,
  LayoutGrid,
  Info,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatInterface } from "@/components/ChatInterface";
import { LoadingOverlay } from "@/components/LoadingOverlay";

interface ImageFile {
  file: File;
  preview: string;
}

export default function Case() {
  const { caseId } = useParams();
  const [caseName, setCaseName] = useState(`Case #${caseId?.replace("case-", "")}`);
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"sources" | "chat" | "studio">("studio");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [evidenceGuide, setEvidenceGuide] = useState<string | null>(null);
  const [caseReport, setCaseReport] = useState<string | null>(null);
  const [fingerprintResults, setFingerprintResults] = useState<any>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [patternResults, setPatternResults] = useState<any>(null);
  const [analyzedImages, setAnalyzedImages] = useState<string[]>([]);

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push({
              file: file,
              preview: e.target.result.toString()
            });
            
            // If this is the last file, update state
            if (newImages.length === files.length) {
              setUploadedImages([...uploadedImages, ...newImages]);
              toast({
                title: "Upload Successful",
                description: `Uploaded ${files.length} image${files.length !== 1 ? "s" : ""}.`,
              });
            }
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Only image files are supported at this time.",
          variant: "destructive",
        });
      }
    });
    
    // Clear the input value to allow uploading the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDeleteImage = (index: number) => {
    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    setUploadedImages(newImages);
    
    toast({
      title: "Image Deleted",
      description: "The image has been removed from your case.",
    });
    
    if (selectedImage === uploadedImages[index].preview) {
      setSelectedImage(null);
    }
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
      uploadedImages.forEach((img) => {
        formData.append("images", img.file);
      });

      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze evidence.");
      }

      const data = await response.json();
      console.log("Analysis Result:", data);
      setAnalysisResults(data.results);

      // Store the analyzed images
      const analyzedImageUrls = uploadedImages.map(img => img.preview);
      setAnalyzedImages(analyzedImageUrls);

      toast({
        title: "Analysis Complete",
        description: "Your evidence has been analyzed. View the results in the Studio tab.",
      });

      if (!isMobile) {
        setActiveTab("studio");
      }
    } catch (error) {
      console.error("Error analyzing evidence:", error);
      toast({
        title: "Analysis Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };

  const fetchEvidenceGuide = async () => {
    if (uploadedImages.length === 0) return;

    try {
      const formData = new FormData();
      formData.append("images", uploadedImages[0].file);

      const response = await fetch("http://localhost:5000/evidence-guide", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch evidence guide.");
      }

      const data = await response.json();
      console.log("Evidence Guide:", data);
      setEvidenceGuide(data.evidence_guide);

      toast({
        title: "Evidence Guide Generated",
        description: "Check the guide in the Studio tab.",
      });
    } catch (error) {
      console.error("Error fetching evidence guide:", error);
      toast({
        title: "Failed to Generate Guide",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchCaseReport = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      uploadedImages.forEach((image) => {
        formData.append("images", image.file);
      });

      const response = await fetch("http://localhost:5000/case-report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate case report.");
      }

      const data = await response.json();
      console.log("Case Report:", data);
      setCaseReport(data.report);

      toast({
        title: "Case Report Generated",
        description: "Check the report in the Studio tab.",
      });
    } catch (error) {
      console.error("Error generating case report:", error);
      toast({
        title: "Failed to Generate Report",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState("");

  const handleSearchChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSearchSubmit = async () => {
    if (query.trim() === "") return;

    setLoading(true); // Show loading state

    try {
      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }), // Send query to backend
      });
      const data = await response.json(); // Parse backend response

      setSearchResults([data.response, ...searchResults]); // Append response above
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      setLoading(false);
      setQuery(""); // Clear input field
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };

  const handleFingerprintDetection = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("images", uploadedImages[0].file);

      const response = await fetch("http://localhost:5000/fingerprint", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to detect fingerprints.");
      }

      const data = await response.json();
      setFingerprintResults(data);
      toast({
        title: "Fingerprint Detection Complete",
        description: "Check the results in the Studio tab.",
      });
    } catch (error) {
      console.error("Error detecting fingerprints:", error);
      toast({
        title: "Fingerprint Detection Failed",
        description: "Something went wrong. Please try again.",
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

  const handlePatternRecognition = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      uploadedImages.forEach((image) => {
        formData.append("images", image.file);
      });

      const response = await fetch("http://localhost:5000/patterns", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze patterns.");
      }

      const data = await response.json();
      setPatternResults(data);
      toast({
        title: "Pattern Analysis Complete",
        description: "Check the results in the Studio tab.",
      });
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      toast({
        title: "Pattern Analysis Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">{caseName}</h1>
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => {
              const newName = prompt("Enter new case name:", caseName);
              if (newName) setCaseName(newName);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share this case</DialogTitle>
                <DialogDescription>
                  Invite others to collaborate on this forensic investigation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input placeholder="Enter email address" />
                  <Button size="sm" className="w-full">Send invitation</Button>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Share link</p>
                  <div className="flex items-center gap-2">
                    <Input value={window.location.href} readOnly />
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: "Link copied",
                        description: "Case link copied to clipboard.",
                      });
                    }}>
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            U
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sources Panel - Left Side */}
        <div className={`w-full md:w-80 border-r overflow-y-auto flex flex-col ${activeTab === "sources" ? "block" : "hidden md:block"}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Evidence Images</h2>
            <Button variant="ghost" size="icon">
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-3">
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              className="w-full justify-center" 
              size="sm"
              onClick={triggerFileUpload}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add images
            </Button>
          </div>
          
          {uploadedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-muted-foreground">
              <div className="p-6 bg-muted/50 rounded-lg mb-6">
                <FileUp className="w-12 h-12" />
              </div>
              <h3 className="font-medium text-lg">Upload evidence images</h3>
              <p className="text-sm mt-2 max-w-xs mb-8">
                Upload images from the crime scene or other evidence to analyze patterns and generate insights.
              </p>
              
              <Button variant="default" className="gap-1" onClick={triggerFileUpload}>
                <UploadCloud className="h-4 w-4 mr-1" />
                Upload images
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {uploadedImages.map((image, index) => (
                <div 
                  key={index} 
                  className={`relative group rounded-md border overflow-hidden flex items-center p-2 hover:bg-accent cursor-pointer ${selectedImage === image.preview ? 'bg-accent/60' : ''}`}
                  onClick={() => setSelectedImage(image.preview)}
                >
                  <div className="h-16 w-16 rounded overflow-hidden mr-3 flex-shrink-0">
                    <img
                      src={image.preview}
                      alt={`Evidence ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Evidence image {index + 1}</p>
                    <p className="text-xs text-muted-foreground">Image • Added {new Date().toLocaleDateString()}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="pt-3">
                {uploadedImages.length > 0 && (
                  <Button 
                    className="w-full" 
                    onClick={analyzeEvidence}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Microscope className="h-4 w-4 mr-2" />
                        Analyze Evidence
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Upload button at the bottom */}
          <div className="mt-auto p-4 border-t">
            <div className="flex items-center bg-muted/50 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Evidence summary</p>
                <p className="text-xs text-muted-foreground">{uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''}</p>
              </div>
              <Button size="sm" className="rounded-full w-8 h-8 p-0 flex-shrink-0" onClick={triggerFileUpload}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Generated Content - Middle */}
        <div className={`flex-1 flex flex-col ${activeTab === "studio" || activeTab === "chat" ? "block" : "hidden"}`}>
          {/* Tab Navigation - Always visible */}
          <div className="flex justify-between items-center p-4 border-b">
            <Tabs value={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value as "studio" | "chat")}>
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="studio" className="flex items-center gap-2">
                  <Microscope className="w-4 h-4" />
                  Studio
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === "studio" && caseReport && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => {
                  const blob = new Blob([caseReport], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `case-report-${caseId}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast({
                    title: "Report Downloaded",
                    description: "The case report has been downloaded successfully.",
                  });
                }}
              >
                <FileUp className="h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-card/40 w-full h-full overflow-y-auto relative">
            <div className="w-full max-w-4xl">
              {/* Content based on active tab */}
              {activeTab === "studio" ? (
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

                  {/* Evidence Guide */}
                  {evidenceGuide && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Evidence Collection Guide</h3>
                      <p className="text-sm whitespace-pre-wrap">{evidenceGuide}</p>
                    </div>
                  )}

                  {/* Case Report */}
                  {caseReport && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Case Report</h3>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          onClick={() => {
                            const blob = new Blob([caseReport], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `case-report-${caseId}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            toast({
                              title: "Report Downloaded",
                              description: "The case report has been downloaded successfully.",
                            });
                          }}
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
                  {fingerprintResults && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Fingerprint Analysis</h3>
                      <div className="space-y-2">
                        <p className="text-sm">Detected Fingerprints: {fingerprintResults.count}</p>
                        <p className="text-sm">Quality Score: {fingerprintResults.quality_score}</p>
                        {fingerprintResults.details && (
                          <p className="text-sm whitespace-pre-wrap">{fingerprintResults.details}</p>
                        )}
                      </div>
                    </div>
                  )}

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

                  {/* Pattern Recognition Results */}
                  {patternResults && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Pattern Analysis</h3>
                      <div className="space-y-2">
                        {patternResults.patterns.map((pattern: any, index: number) => (
                          <div key={index} className="mb-2">
                            <p className="text-sm font-medium">{pattern.type}</p>
                            <p className="text-sm text-muted-foreground">{pattern.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Confidence: {(pattern.confidence * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Default State */}
                  {!analysisResults && !evidenceGuide && !caseReport && (
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
              ) : (
                <div className="flex-1 overflow-hidden">
                  <ChatInterface 
                    selectedImage={selectedImage} 
                    analyzedImages={analyzedImages}
                  />
                </div>
              )}
            </div>
            {isProcessing && activeTab === "studio" && <LoadingOverlay />}
          </div>
        </div>

        {/* Tools Panel - Right Side */}
        <div className={`w-96 border-l overflow-y-auto flex flex-col ${activeTab === "studio" || activeTab === "chat" ? "block" : "hidden"}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Forensic Tools</h2>
            <Button variant="ghost" size="icon">
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center">
                  Image Analysis
                  <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
                    <Info className="w-3 h-3" />
                  </Button>
                </h3>
              </div>
              
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Microscope className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Crime Scene Analysis</h4>
                      <p className="text-xs text-muted-foreground">
                        {uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} available
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={analyzeEvidence}
                    disabled={isAnalyzing || uploadedImages.length === 0}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Microscope className="h-4 w-4 mr-2" />
                        Analyze Evidence
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Tools</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left" 
                  size="sm" 
                  onClick={handleFingerprintDetection}
                  disabled={uploadedImages.length === 0}
                >
                  <Fingerprint className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Fingerprint Detection</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left" 
                  size="sm" 
                  onClick={handleImageEnhancement}
                  disabled={uploadedImages.length === 0}
                >
                  <Camera className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Image Enhancement</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left" 
                  size="sm" 
                  onClick={fetchCaseReport}
                  disabled={uploadedImages.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Evidence Report</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left" 
                  size="sm" 
                  onClick={handlePatternRecognition}
                  disabled={uploadedImages.length === 0}
                >
                  <BarChart3 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Pattern Recognition</span>
                </Button>
              </div>
            </div>
                    </div>
                </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="grid grid-cols-3 divide-x">
          <button
            className={`flex flex-col items-center py-3 ${activeTab === "sources" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("sources")}
          >
            <Image className="h-5 w-5 mb-1" />
            <span className="text-xs">Images</span>
          </button>
          <button
            className={`flex flex-col items-center py-3 ${activeTab === "chat" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="h-5 w-5 mb-1" />
            <span className="text-xs">Chat</span>
          </button>
          <button
            className={`flex flex-col items-center py-3 ${activeTab === "studio" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("studio")}
          >
            <Microscope className="h-5 w-5 mb-1" />
            <span className="text-xs">Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Component for the Customize button
function Customize({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2H2v10h10V2z" />
      <path d="M22 12h-10v10h10V12z" />
      <path d="M12 12H2v10h10V12z" />
      <path d="M22 2h-10v10h10V2z" />
    </svg>
  );
}
