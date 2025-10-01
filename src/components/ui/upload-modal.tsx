import { Loader2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: 'building' | 'anchoring' | 'complete';
}

export const UploadModal = ({ isOpen, onClose, stage }: UploadModalProps) => {
  const getStageContent = () => {
    switch (stage) {
      case 'building':
        return {
          icon: <Loader2 className="w-12 h-12 text-primary animate-spin" />,
          title: "Building Merkle Tree...",
          description: "Processing your documents and creating cryptographic proofs"
        };
      case 'anchoring':
        return {
          icon: <Link2 className="w-12 h-12 text-primary animate-pulse" />,
          title: "Anchoring to Blockchain...",
          description: "Securing your document fingerprints on the Polygon network"
        };
      case 'complete':
        return {
          icon: <Link2 className="w-12 h-12 text-success" />,
          title: "Complete!",
          description: "Your documents have been successfully anchored to the blockchain"
        };
    }
  };

  const content = getStageContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md upload-modal">
        <div className="flex flex-col items-center py-8 text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            {content.icon}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {content.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {content.description}
            </p>
          </div>

          {stage !== 'complete' && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Powered by Polygon Blockchain</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};