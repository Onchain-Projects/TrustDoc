import { CheckCircle, XCircle, FileText, Calendar, User, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isValid: boolean;
  issuerName?: string;
  issueDate?: string;
  documentName?: string;
  transactionHash?: string;
  explorerUrl?: string;
}

export const VerificationModal = ({
  isOpen,
  onClose,
  isValid,
  issuerName,
  issueDate,
  documentName,
  transactionHash,
  explorerUrl
}: VerificationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 upload-modal-overlay">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4 upload-modal">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isValid ? (
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {isValid ? 'Document Verified' : 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isValid ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-success/5 rounded-lg">
                <FileText className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">{documentName}</p>
                  <p className="text-sm text-muted-foreground">Document verified successfully</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{issuerName}</p>
                  <p className="text-sm text-muted-foreground">Issuer</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{issueDate}</p>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                </div>
              </div>
              
              {transactionHash && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground font-mono text-xs">
                      {transactionHash.substring(0, 10)}...{transactionHash.substring(transactionHash.length - 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">Transaction Hash</p>
                  </div>
                </div>
              )}
              
              {explorerUrl && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <a 
                    href={explorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    🔗 View on Polygon Explorer
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                The document could not be verified. This could be due to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Document has been tampered with</li>
                <li>• Document was not issued through TrustDoc</li>
                <li>• Document has been invalidated</li>
                <li>• Invalid signature or transaction ID</li>
              </ul>
            </div>
          )}
          
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </div>
    </div>
  );
};