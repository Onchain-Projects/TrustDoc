import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DocumentUploadCardProps {
  onFileSelect: (file: File) => void;
  uploadedFile: File | null;
  onClear: () => void;
}

export const DocumentUploadCard = ({
  onFileSelect,
  uploadedFile,
  onClear,
}: DocumentUploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload a PDF or DOCX file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    onFileSelect(file);
    toast.success("Document uploaded successfully!");
  };

  if (uploadedFile) {
    return (
      <div className="bg-card border-2 border-primary/20 rounded-xl p-6 shadow-card animate-scale-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-primary rounded-lg shadow-glow">
              <FileText className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-card-foreground truncate">
                {uploadedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="hover:bg-destructive/10 hover:text-destructive transition"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer group bg-card",
        isDragging
          ? "border-primary bg-primary/10 shadow-glow scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <label htmlFor="verify-file-upload" className="cursor-pointer block">
        <input
          id="verify-file-upload"
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept=".pdf,.docx"
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "p-4 bg-primary/10 rounded-full transition-transform duration-300",
              isDragging ? "scale-110" : "group-hover:scale-110"
            )}
          >
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">
              <span className="text-primary">Upload a document</span> or drag
              and drop
            </p>
            <p className="text-sm text-muted-foreground">PDF or DOCX</p>
          </div>
        </div>
      </label>
    </div>
  );
};

