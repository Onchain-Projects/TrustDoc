import { useState } from "react";
import { Upload, FileText, Info, QrCode, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VerificationModal } from "@/components/ui/verification-modal";
import { QRCodeScanner } from "@/components/ui/qr-code";
import { BatchVerification } from "@/components/ui/batch-verification";

interface VerifyPageProps {
  onVerify?: (file: File) => void;
  onManualVerify?: (signature: string) => void;
}

export const VerifyPage = ({ onVerify, onManualVerify }: VerifyPageProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signature, setSignature] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [modalData, setModalData] = useState({
    issuerName: "",
    issueDate: "",
    documentName: ""
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVerificationResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleVerifyFile = async () => {
    if (!selectedFile) return;
    
    setVerificationResult("Verification initiated...");
    
    try {
      // Generate file hash
      const fileHash = await generateFileHash(selectedFile);
      console.log('Generated file hash for verification:', fileHash);
      
      // Import document service
      const { documentService } = await import('@/lib/documents');
      
      // Search for proof by Merkle root (since single file = Merkle root)
      const verificationResult = await documentService.verifyDocument(fileHash);
      
      console.log('Verification result:', verificationResult);
      
      if (verificationResult.isValid && verificationResult.proof) {
        setIsValid(true);
        setModalData({
          issuerName: verificationResult.proof.proof_json?.issuerName || "Unknown Issuer",
          issueDate: new Date(verificationResult.proof.created_at).toLocaleDateString(),
          documentName: selectedFile.name
        });
        setVerificationResult("✅ Document verified successfully!");
      } else {
        setIsValid(false);
        setModalData({
          issuerName: "",
          issueDate: "",
          documentName: selectedFile.name
        });
        setVerificationResult("❌ Document not found or invalid");
      }
      
      setShowModal(true);
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult(`❌ Verification failed: ${error.message}`);
      setIsValid(false);
    }
  };

  // Helper function to generate file hash
  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
  };

  const handleManualVerifySubmit = async () => {
    if (!signature.trim()) return;
    
    setVerificationResult("Manual verification initiated...");
    
    try {
      // Import document service
      const { documentService } = await import('@/lib/documents');
      
      // Verify using the provided Merkle root
      const verificationResult = await documentService.verifyDocument(signature.trim());
      
      console.log('Manual verification result:', verificationResult);
      
      if (verificationResult.isValid && verificationResult.proof) {
        setIsValid(true);
        setModalData({
          issuerName: verificationResult.proof.proof_json?.issuerName || "Unknown Issuer",
          issueDate: new Date(verificationResult.proof.created_at).toLocaleDateString(),
          documentName: verificationResult.proof.proof_json?.documentName || "Document"
        });
        setVerificationResult("✅ Document verified successfully!");
      } else {
        setIsValid(false);
        setModalData({
          issuerName: "",
          issueDate: "",
          documentName: "Manual Verification"
        });
        setVerificationResult("❌ Document not found or invalid");
      }
      
      setShowModal(true);
    } catch (error: any) {
      console.error('Manual verification error:', error);
      setVerificationResult(`❌ Verification failed: ${error.message}`);
      setIsValid(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 page-enter">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Verify Document
          </h1>
          <p className="text-base text-muted-foreground">
            Verify the authenticity of a document using its blockchain fingerprint
          </p>
        </div>

        {/* Main Verification Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-primary" />
              <span>Document Verification</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload a document or enter its verification details manually
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Upload Document</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-primary">
                    Upload a document <span className="text-muted-foreground">or drag and drop</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, DOCX, JSON, TXT, JPG, or PNG
                  </p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.json,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleVerifyFile} className="ml-4">
                    Verify Document
                  </Button>
                </div>
              )}
            </div>

            {/* QR Code Scanner Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">QR Code Verification</Label>
              <QRCodeScanner
                onScan={(data) => {
                  try {
                    const qrData = JSON.parse(data)
                    if (qrData.merkleRoot) {
                      setSignature(qrData.merkleRoot)
                      handleManualVerifySubmit()
                    }
                  } catch (error) {
                    // If not JSON, treat as direct Merkle root
                    setSignature(data)
                    handleManualVerifySubmit()
                  }
                }}
                onError={(error) => {
                  setVerificationResult(`❌ QR Scan failed: ${error}`)
                }}
              />
            </div>

            {/* Manual Entry Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or enter details manually</span>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="space-y-4">
              <Label htmlFor="signature" className="text-base font-medium">
                Transaction ID / Signature
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="signature"
                  placeholder="Enter the document's transaction ID or signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleManualVerifySubmit}
                  disabled={!signature.trim()}
                >
                  Verify
                </Button>
              </div>
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{verificationResult}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Batch Verification Card */}
        <BatchVerification />

        {/* Information Card */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Info className="w-5 h-5" />
              <span>About the Signature (Transaction ID)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <p className="mb-4">
              The signature field requires the Polygon transaction ID where the document was anchored. This ID should be provided by the document issuer along with the document, typically:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <span>In a QR code on the document</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span>In an accompanying metadata file</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 flex-shrink-0" />
                <span>In the document's digital signature</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span>Or directly embedded in the document</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isValid={isValid}
        issuerName={modalData.issuerName}
        issueDate={modalData.issueDate}
        documentName={modalData.documentName}
      />
    </div>
  );
};