import { useState } from "react";
import { FileText, Calendar, Shield, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IssuePageProps {
  onIssueDocument?: (data: {
    name: string;
    description?: string;
    expiryDate?: string;
    mode: 'single' | 'batch';
  }) => void;
  onUpload?: () => void;
}

export const IssuePage = ({ onIssueDocument, onUpload }: IssuePageProps) => {
  const [issuanceMode, setIssuanceMode] = useState<'single' | 'batch'>('single');
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [issueMessage, setIssueMessage] = useState("");

  const handleIssueDocument = () => {
    if (!documentName.trim()) {
      setIssueMessage("Please enter a document name");
      return;
    }

    if (onUpload) {
      onUpload();
    }

    if (onIssueDocument) {
      onIssueDocument({
        name: documentName,
        description: description.trim() || undefined,
        expiryDate: expiryDate || undefined,
        mode: issuanceMode
      });
    }
    
    setIssueMessage("Document issuance initiated successfully!");
  };

  return (
    <div className="min-h-screen bg-background py-8 page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Issue New Document
          </h1>
          <p className="text-lg text-muted-foreground">
            Create a new document anchored securely on the blockchain
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Document Details</span>
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Issuance Mode:</span>
                  <Tabs value={issuanceMode} onValueChange={(value) => setIssuanceMode(value as 'single' | 'batch')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="single" className="text-xs">Single</TabsTrigger>
                      <TabsTrigger value="batch" className="text-xs">Batch</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Document Name */}
                <div className="space-y-2">
                  <Label htmlFor="document-name">Document Name</Label>
                  <Input
                    id="document-name"
                    placeholder="Enter document name or title"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter a description of this document"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry-date" className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Expiry Date (Optional)</span>
                  </Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    After this date, the document will be marked as expired.
                  </p>
                </div>

                {/* Document Authenticity Info */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Document Authenticity</strong><br />
                    This document will be signed with your private key and anchored to the blockchain, ensuring it cannot be tampered with.
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleIssueDocument}
                    className="flex-1"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Issue Document
                  </Button>
                  <Button variant="outline" className="flex-1" size="lg">
                    Cancel
                  </Button>
                </div>

                {/* Issue Message */}
                {issueMessage && (
                  <Alert className={issueMessage.includes("success") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                    <AlertDescription className={issueMessage.includes("success") ? "text-green-800" : "text-red-800"}>
                      {issueMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Issuance Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Single Document</h4>
                    <p className="text-muted-foreground text-xs">
                      Issue individual documents one at a time. Each document gets its own blockchain transaction.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-1">Batch Processing</h4>
                    <p className="text-muted-foreground text-xs">
                      Issue multiple documents together using Merkle trees for cost-efficient blockchain anchoring.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-1">Blockchain Network</h4>
                    <p className="text-muted-foreground text-xs">
                      Documents are anchored on the Polygon blockchain for fast, low-cost transactions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-1">Security</h4>
                    <p className="text-muted-foreground text-xs">
                      All documents are cryptographically signed and hashed before blockchain anchoring.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2 text-xs">Process Overview</h4>
                    <ol className="text-xs text-muted-foreground space-y-1">
                      <li>1. Document details are hashed</li>
                      <li>2. Hash is signed with your private key</li>
                      <li>3. Signature is anchored on blockchain</li>
                      <li>4. Verification metadata is generated</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};