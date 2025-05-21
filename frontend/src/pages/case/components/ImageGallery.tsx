import { Trash, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageFile {
  file: File;
  preview: string;
}

interface ImageGalleryProps {
  images: ImageFile[];
  selectedImage: string | null;
  onSelectImage: (preview: string) => void;
  onDeleteImage: (index: number) => void;
}

export function ImageGallery({
  images,
  selectedImage,
  onSelectImage,
  onDeleteImage,
}: ImageGalleryProps) {
  const { toast } = useToast();

  // Add console logs for debugging
  console.log("ImageGallery - images:", images.length);
  console.log("ImageGallery - selectedImage:", selectedImage);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-muted-foreground">
        <div className="p-6 bg-muted/50 rounded-lg mb-6">
          <FileUp className="w-12 h-12" />
        </div>
        <h3 className="font-medium text-lg">Upload evidence images</h3>
        <p className="text-sm mt-2 max-w-xs mb-8">
          Upload images from the crime scene or other evidence to analyze patterns and generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {images.map((image, index) => (
        <div 
          key={index} 
          className={`relative group rounded-md border overflow-hidden flex items-center p-2 hover:bg-accent cursor-pointer ${selectedImage === image.preview ? 'bg-accent/60' : ''}`}
          onClick={() => {
            console.log("Selecting image:", image.preview);
            onSelectImage(image.preview);
          }}
        >
          <div className="h-16 w-16 rounded overflow-hidden mr-3 flex-shrink-0">
            <img
              src={image.preview}
              alt={`Evidence ${index + 1}`}
              className="h-full w-full object-cover"
              style={{ 
                width: "64px", 
                height: "64px",
                objectFit: "cover"
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">Evidence image {index + 1}</p>
            <p className="text-xs text-muted-foreground">Image • Added {new Date().toLocaleDateString()}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteImage(index);
            }}
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
} 
