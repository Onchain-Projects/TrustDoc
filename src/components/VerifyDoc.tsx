import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationModal } from "@/components/ui/verification-modal";
import { verifyDocument } from "@/lib/verification";
import { DocumentUploadCard } from "@/components/verify/DocumentUploadCard";
import { toast } from "sonner";

interface VerifyDocProps {
  onVerify?: (file: File) => void;
}

export const VerifyDoc = ({ onVerify }: VerifyDocProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasCompletedVerification, setHasCompletedVerification] = useState(false);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [modalData, setModalData] = useState({
    issuerName: "",
    issueDate: "",
    documentName: "",
    transactionHash: "",
    explorerUrl: ""
  });

  const resetState = () => {
    setUploadedFile(null);
    setIsValid(false);
    setIsSuccess(null);
    setHasCompletedVerification(false);
    setIsVerifying(false);
  };

  const handleVerifyFile = async () => {
    if (!uploadedFile) {
      toast.error("Please upload a document to verify.");
      return;
    }

    setIsVerifying(true);
    setHasCompletedVerification(false);
    setIsSuccess(null);

    try {
      const result = await verifyDocument(uploadedFile);
      
      console.log('🔍 Verification result:', result);

      if (result.valid) {
        setIsValid(true);
        setIsSuccess(true);
        setHasCompletedVerification(true);
        const newModalData = {
          issuerName: result.issuerName || "Unknown Issuer",
          issueDate: result.issueDate || new Date().toLocaleDateString(),
          documentName: uploadedFile.name,
          transactionHash: result.transactionHash || "",
          explorerUrl: result.explorerUrl || ""
        };
        console.log('🔍 MODAL DATA SET:', newModalData);
        setModalData(newModalData);
        setShowModal(true);

        if (onVerify) {
          onVerify(uploadedFile);
        }
      } else {
        setIsValid(false);
        setIsSuccess(false);
        setHasCompletedVerification(true);
        setModalData({
          issuerName: "Unknown Issuer",
          issueDate: new Date().toLocaleDateString(),
          documentName: uploadedFile.name,
          transactionHash: "",
          explorerUrl: ""
        });
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setIsValid(false);
      setIsSuccess(false);
      setHasCompletedVerification(false);
      const message = error.message || "Verification failed. Please try again.";
      setIsValid(false);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setIsValid(false);
    setIsSuccess(null);
    setHasCompletedVerification(false);
  };

  const handleClear = () => {
    resetState();
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Verify Document
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verify the authenticity of a document using its blockchain fingerprint
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border animate-scale-in">
          <div className="bg-gradient-primary rounded-t-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary-foreground">
                  Document Verification
                </h3>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  Upload a document to verify its authenticity
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <DocumentUploadCard
              uploadedFile={uploadedFile}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
            />

            {uploadedFile && !isVerifying && (
              <div className="flex justify-center animate-fade-in">
                <Button
                  onClick={handleVerifyFile}
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300 hover:scale-105 text-primary-foreground"
                  disabled={isVerifying}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Verify Document
                </Button>
              </div>
            )}

            <div className="flex justify-center min-h-[24px]">
              {isVerifying ? (
                <Button
                  size="lg"
                  disabled
                  className="bg-gradient-primary text-primary-foreground opacity-80 flex items-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying your document on the blockchain...
                </Button>
              ) : hasCompletedVerification && isSuccess ? (
                <div className="flex items-center gap-2 text-sm text-success animate-fade-in">
                  <Shield className="w-4 h-4" />
                  <span>Document verified successfully.</span>
                </div>
              ) : hasCompletedVerification && isSuccess === false ? (
                <div className="flex items-center gap-2 text-sm text-destructive animate-fade-in">
                  <Shield className="w-4 h-4" />
                  <span>Verification failed — fingerprint mismatch.</span>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </div>

      <VerificationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetState();
        }}
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
