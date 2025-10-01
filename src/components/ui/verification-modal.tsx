import { CheckCircle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isValid: boolean;
  issuerName?: string;
  issueDate?: string;
  documentName?: string;
}

export const VerificationModal = ({
  isOpen,
  onClose,
  isValid,
  issuerName,
  issueDate,
  documentName
}: VerificationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isValid ? (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                <span className="text-success">Document is Valid</span>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                <span className="text-destructive">Document is Invalid or Tampered</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isValid ? (
            <div className="space-y-3">
              {documentName && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Document: </span>
                  <span className="text-foreground">{documentName}</span>
                </div>
              )}
              {issuerName && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Issued by: </span>
                  <span className="text-foreground">{issuerName}</span>
                </div>
              )}
              {issueDate && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Issued at: </span>
                  <span className="text-foreground">{issueDate}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                This document has been successfully verified on the Polygon blockchain.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-foreground">
                The submitted document could not be verified on the blockchain.
              </p>
              <p className="text-sm text-muted-foreground">
                It may not have been issued through TrustDoc or may have been altered.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};