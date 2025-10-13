import { useState } from "react";
import { Upload, FileText, Info, QrCode, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VerificationModal } from "@/components/ui/verification-modal";
import { verifyDocument, verifyByMerkleRoot } from "@/lib/verification";

interface VerifyDocProps {
  onVerify?: (file: File) => void;
  onManualVerify?: (signature: string) => void;
}

export const VerifyDoc = ({ onVerify, onManualVerify }: VerifyDocProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signature, setSignature] = useState("");
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

  const handleManualVerifySubmit = async () => {
    if (!signature.trim()) return;

    setIsLoading(true);
    setVerificationResult("Verifying Merkle root...");
    setInlineNotification({ type: 'info', message: "Manual verification started - Processing Merkle root..." });

    try {
      // Use the verification service for Merkle root verification
      const result = await verifyByMerkleRoot(signature.trim());
      
      console.log('🔍 Manual verification result:', result);
      
      if (result.valid) {
        setIsValid(true);
        setModalData({
          issuerName: result.issuerName || "Unknown Issuer",
          issueDate: result.issueDate || new Date().toLocaleDateString(),
          documentName: "Document via Merkle root",
          transactionHash: result.transactionHash || "",
          explorerUrl: result.explorerUrl || ""
        });
        setShowModal(true);
        setVerificationResult(null);

        // Clear inline notification
        setInlineNotification(null);

        if (onManualVerify) {
          onManualVerify(signature.trim());
        }
      } else {
        // Show FAILED modal for invalid Merkle root (matches Real TrustDoc)
        setIsValid(false);
        setModalData({
          issuerName: "Unknown Issuer",
          issueDate: new Date().toLocaleDateString(),
          documentName: "Document via Merkle root",
          transactionHash: "",
          explorerUrl: ""
        });
        setShowModal(true);
        setVerificationResult(null);
        setInlineNotification(null);
      }
    } catch (error: any) {
      console.error('Manual verification error:', error);
      setVerificationResult(error.message || "Verification failed. Please try again.");
      setIsValid(false);
      // Don't set inlineNotification - only use verificationResult
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verify Document</h1>
          <p className="mt-2 text-gray-600">Verify the authenticity of a document using its blockchain fingerprint</p>
        </div>

        {/* Main Verification Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Document Verification</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Upload a document or enter its verification details manually</p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {/* File Upload Section */}
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                isDragOver ? "border-blue-400 bg-blue-50" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <label htmlFor="file-input" className="space-y-1 text-center cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <span className="relative bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    Upload a document
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX, JSON, TXT, JPG, or PNG</p>
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
              <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleVerifyFile}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify Document"}
                </button>
              </div>
            )}

            {/* Manual Entry Divider */}
            <div className="mt-4 flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <button type="button" className="mx-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                Or enter details manually
              </button>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Manual Entry Section */}
            <div className="mt-4 space-y-4">
              <label htmlFor="signature" className="block text-sm font-medium text-gray-700">
                Transaction ID / Signature
              </label>
              <div className="flex space-x-2">
                <input
                  id="signature"
                  type="text"
                  placeholder="Enter the document's transaction ID or signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleManualVerifySubmit}
                  disabled={!signature.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">{verificationResult}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Notification */}
            {inlineNotification && (
              <div className={`mt-4 p-4 rounded-md border ${
                inlineNotification.type === 'info' 
                  ? 'bg-blue-50 border-blue-200' 
                  : inlineNotification.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex">
                  <Info className={`h-5 w-5 ${
                    inlineNotification.type === 'info' 
                      ? 'text-blue-400' 
                      : inlineNotification.type === 'error'
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`} />
                  <div className="ml-3">
                    <p className={`text-sm ${
                      inlineNotification.type === 'info' 
                        ? 'text-blue-700' 
                        : inlineNotification.type === 'error'
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}>{inlineNotification.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About the Signature (Transaction ID)</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>The signature field requires the Polygon transaction ID where the document was anchored. This ID should be provided by the document issuer along with the document, typically:</p>
                <ul className="list-disc ml-5 mt-2">
                  <li>In a QR code on the document</li>
                  <li>In an accompanying metadata file</li>
                  <li>In the document's digital signature</li>
                  <li>Or directly embedded in the document</li>
                </ul>
              </div>
            </div>
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
