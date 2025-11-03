import { useState } from "react";
import { Upload, FileText, Info, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VerificationModal } from "@/components/ui/verification-modal";
import { verifyDocument } from "@/lib/verification";

interface VerifyDocProps {
  onVerify?: (file: File) => void;
}

export const VerifyDoc = ({ onVerify }: VerifyDocProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState({
    issuerName: "",
    issueDate: "",
    documentName: "",
    transactionHash: "",
    explorerUrl: ""
  });
  const [inlineNotification, setInlineNotification] = useState<any>(null);

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

    setIsLoading(true);
    setVerificationResult("Verifying document...");
    setInlineNotification({ type: 'info', message: "Verification started - Processing document..." });

    try {
      // Use the complete verification service (matches Real TrustDoc)
      const result = await verifyDocument(selectedFile);
      
      console.log('🔍 Verification result:', result);
      
      if (result.valid) {
        setIsValid(true);
        const newModalData = {
          issuerName: result.issuerName || "Unknown Issuer",
          issueDate: result.issueDate || new Date().toLocaleDateString(),
          documentName: selectedFile.name,
          transactionHash: result.transactionHash || "",
          explorerUrl: result.explorerUrl || ""
        };
        console.log('🔍 MODAL DATA SET:', newModalData);
        setModalData(newModalData);
        setShowModal(true);
        setVerificationResult(null);

        // Clear inline notification
        setInlineNotification(null);

        if (onVerify) {
          onVerify(selectedFile);
        }
      } else {
        // Show FAILED modal for invalid documents (matches Real TrustDoc)
        setIsValid(false);
        setModalData({
          issuerName: "Unknown Issuer",
          issueDate: new Date().toLocaleDateString(),
          documentName: selectedFile.name,
          transactionHash: "",
          explorerUrl: ""
        });
        setShowModal(true);
        setVerificationResult(null);
        setInlineNotification(null);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult(error.message || "Verification failed. Please try again.");
      setIsValid(false);
      // Don't set inlineNotification - only use verificationResult
    } finally {
      setIsLoading(false);
    }
  };

  // Note: File hashing is now handled in verification.ts using keccak256

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Verify Document
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Verify the authenticity of a document using its blockchain fingerprint
          </p>
        </div>

        {/* Main Verification Card */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
          <div className="px-6 py-6 sm:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Document Verification
            </h3>
            <p className="mt-2 text-blue-50">Upload a document to verify its authenticity</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {/* File Upload Section */}
            <div
              className={`relative mt-6 flex flex-col items-center justify-center px-8 py-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                isDragOver 
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 scale-[1.02] shadow-lg shadow-blue-500/20" 
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50/50 hover:shadow-md"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                isDragOver ? "bg-gradient-to-br from-blue-100/50 to-purple-100/50 opacity-100" : "opacity-0"
              }`} />
              <label htmlFor="file-input" className="relative z-10 space-y-3 text-center cursor-pointer w-full">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDragOver 
                    ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30 scale-110" 
                    : "bg-gradient-to-br from-blue-100 to-purple-100 hover:scale-105"
                }`}>
                  <Upload className={`h-8 w-8 transition-colors duration-300 ${
                    isDragOver ? "text-white" : "text-blue-600"
                  }`} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gray-800">
                    {isDragOver ? (
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Drop your document here
                      </span>
                    ) : (
                      <>
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Upload a document
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, DOC, DOCX, JSON, TXT, JPG, or PNG
                  </p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="sr-only"
                  accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/json,.json,text/plain,.txt,image/jpeg,.jpg,.jpeg,image/png,.png"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <div className="mt-6 flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleVerifyFile}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:transform-none"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify Document"
                  )}
                </button>
              </div>
            )}

            {/* Verification Result */}
            {verificationResult && (
              <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-xl shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">{verificationResult}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Notification */}
            {inlineNotification && (
              <div className={`mt-6 p-5 rounded-xl border shadow-md ${
                inlineNotification.type === 'info' 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' 
                  : inlineNotification.type === 'error'
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    inlineNotification.type === 'info' 
                      ? 'bg-blue-500' 
                      : inlineNotification.type === 'error'
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  }`}>
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      inlineNotification.type === 'info' 
                        ? 'text-blue-900' 
                        : inlineNotification.type === 'error'
                        ? 'text-red-900'
                        : 'text-green-900'
                    }`}>{inlineNotification.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isValid={isValid}
        issuerName={modalData.issuerName}
        issueDate={modalData.issueDate}
        documentName={modalData.documentName}
        transactionHash={modalData.transactionHash}
        explorerUrl={modalData.explorerUrl}
      />
    </div>
  );
};
