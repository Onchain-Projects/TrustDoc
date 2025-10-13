import { useState } from "react";
import { Upload, FileText, X, Plus, Calendar, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface UploadDocsProps {
  onUploadComplete?: () => void;
}

export const UploadDocs = ({ onUploadComplete }: UploadDocsProps) => {
  const { user, profile } = useAuthContext();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
  };

  const handleUpload = async () => {
    if (!user || !profile?.issuer_id) {
      setUploadStatus("Error: User not authenticated");
      return;
    }

    if (selectedFiles.length === 0) {
      setUploadStatus("Please select files to upload");
      return;
    }

    const finalBatchName = uploadMode === "single" 
      ? selectedFiles[0]?.name?.replace(/\.[^/.]+$/, "") || `document_${Date.now()}`
      : batchName || `batch_${Date.now()}`;

    setIsLoading(true);
    setUploadStatus("Processing files...");

    try {
      // Generate hashes for all files
      const fileHashes = await Promise.all(
        selectedFiles.map(file => generateFileHash(file))
      );

      // Create Merkle tree (simplified - in production use proper Merkle tree)
      const merkleRoot = fileHashes.join('');

      // Upload files to Supabase Storage
      const uploadedFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = `${profile.issuer_id}/${finalBatchName}/${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        uploadedFiles.push({
          name: file.name,
          hash: fileHashes[i],
          path: data.path
        });
      }

      // Store proof in database
      const { error: proofError } = await supabase
        .from('proofs')
        .insert({
          issuer_id: profile.issuer_id,
          merkle_root: merkleRoot,
          proof_json: {
            batchName: finalBatchName,
            files: uploadedFiles,
            description: description || null,
            expiryDate: expiryDate || null,
            uploadMode: uploadMode
          },
          status: 'valid',
          created_at: new Date().toISOString()
        });

      if (proofError) {
        throw new Error(`Failed to store proof: ${proofError.message}`);
      }

      setUploadStatus("Upload completed successfully!");
      
      // Clear form
      setSelectedFiles([]);
      setBatchName("");
      setDescription("");
      setExpiryDate("");

      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow overflow-hidden rounded-lg">
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg leading-6 font-medium text-gray-900">
            Document Details
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Issuance Mode:</span>
            <div className="flex items-center bg-gray-200 rounded-lg p-1 text-sm">
              <button
                type="button"
                onClick={() => setUploadMode("single")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  uploadMode === "single"
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("batch")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  uploadMode === "batch"
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Batch
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:p-6 space-y-6">
        {/* Document/Batch Name */}
        <div>
          <Label htmlFor="documentName" className="block text-sm font-medium text-gray-700">
            {uploadMode === "single" ? "Document Name" : "Batch Name"}
          </Label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <div className="relative flex items-stretch flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="documentName"
                type="text"
                placeholder={uploadMode === "single" ? "Enter document name" : "Enter batch name"}
                value={uploadMode === "single" ? selectedFiles[0]?.name?.replace(/\.[^/.]+$/, "") || "" : batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="pl-10"
                disabled={uploadMode === "single"}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            placeholder="Enter document or batch description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Expiry Date */}
        <div>
          <Label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
            Expiry Date (Optional)
          </Label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <div className="relative flex items-stretch flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            {uploadMode === "single" ? "Select Document" : "Select Documents"}
          </Label>
          <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
              isDragOver ? "border-blue-400 bg-blue-50" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <span className="relative bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                  Upload {uploadMode === "single" ? "a document" : "documents"}
                </span>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, JSON, TXT, JPG, or PNG</p>
              <input
                id="file-input"
                type="file"
                className="sr-only"
                multiple={uploadMode === "batch"}
                accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/json,.json,text/plain,.txt,image/jpeg,.jpg,.jpeg,image/png,.png"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          </div>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="block text-sm font-medium text-gray-700">
              Selected Files ({selectedFiles.length})
            </Label>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus && (
          <Alert className={uploadStatus.includes("success") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription className={uploadStatus.includes("success") ? "text-green-800" : "text-red-800"}>
              {uploadStatus}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={() => {
              setSelectedFiles([]);
              setBatchName("");
              setDescription("");
              setExpiryDate("");
              setUploadStatus("");
            }}
            variant="outline"
            disabled={isLoading}
          >
            Clear
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Uploading..." : "Upload Documents"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
