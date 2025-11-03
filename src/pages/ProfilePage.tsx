import { useState } from "react";
import { Shield, Key, Download, RotateCcw, LogOut, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { KeyManagement } from "@/components/crypto/KeyManagement";

interface ProfilePageProps {
  issuerName?: string;
  issuerId?: string;
  publicKey?: string;
  privateKey?: string;
  onShowPrivateKey?: () => void;
  onDownloadKeypair?: () => void;
  onRotateKeys?: () => void;
  onLogout?: () => void;
}

export const ProfilePage = ({ 
  onShowPrivateKey,
  onDownloadKeypair,
  onRotateKeys,
  onLogout
}: ProfilePageProps) => {
  const { user, profile, signOut } = useAuthContext();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  // Get data from authentication context
  const issuerName = profile?.name || "Unknown Issuer";
  const issuerId = profile?.issuerId || "Unknown ID";
  const publicKey = profile?.publicKey || "No public key available";
  const privateKey = profile?.privateKey || "No private key available";

  const handleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
    if (onShowPrivateKey) {
      onShowPrivateKey();
    }
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      toast({
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Issuer Profile
          </h1>
          <p className="text-lg text-muted-foreground">
            Your issuer information and cryptographic keys
          </p>
        </div>

        <div className="space-y-6">
          {/* Issuer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Issuer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Issuer Name</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-foreground font-medium">{issuerName}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Issuer ID</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-foreground font-mono text-sm">{issuerId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(issuerId, "Issuer ID")}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === "Issuer ID" ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cryptographic Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-primary" />
                <span>Cryptographic Keys</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your cryptographic key pair used for document signing and verification
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Public Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Public Key</label>
                <div className="flex items-start space-x-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all text-foreground">
                      {publicKey}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToClipboard(publicKey, "Public Key")}
                  >
                    {copiedField === "Public Key" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Private Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Private Key</label>
                <div className="flex items-start space-x-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all text-foreground">
                      {showPrivateKey ? privateKey : "•••••••••••••••••••••••••••••••••"}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowPrivateKey}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    {showPrivateKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(privateKey, "Private Key")}
                      >
                        {copiedField === "Private Key" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span className="text-primary cursor-pointer" onClick={handleShowPrivateKey}>
                    {showPrivateKey ? "Hide" : "Show"} Private Key
                  </span>
                </div>
              </div>

              {/* Security Warning */}
              <Alert className="bg-yellow-50 border-yellow-200">
                <Key className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Important:</strong> Keep your private key secure and never share it with anyone. 
                  This key is used to sign your documents and proves your identity as an issuer.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Key Management */}
          {profile?.issuer_id && (
            <KeyManagement 
              issuerId={profile.issuer_id}
              onKeyRotated={() => {
                // Reload profile data after key rotation
                window.location.reload()
              }}
            />
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your issuer account and security settings
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={onDownloadKeypair}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Key Pair</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onRotateKeys}
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rotate Keys</span>
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={onLogout || signOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};