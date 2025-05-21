import { useRef, ChangeEvent } from "react";
import { UploadCloud, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ImageFile {
  file: File;
  preview: string;
}

interface ImageUploadProps {
  onUpload: (images: ImageFile[]) => void;
}

export function ImageUpload({ onUpload }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
            
            if (newImages.length === files.length) {
              onUpload(newImages);
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
    
    if (e.target) {
      e.target.value = "";
    }
  };

  return (
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
  );
} 