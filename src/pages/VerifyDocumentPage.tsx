import React, { useState } from 'react'
import { DocumentVerifier } from '@/components/documents/DocumentVerifier'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  FileText,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const VerifyDocumentPage: React.FC = () => {
  const navigate = useNavigate()
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerificationComplete = (result: any) => {
    setVerificationResult(result)
    setIsVerifying(false)
  }

  const handleVerificationStart = () => {
    setIsVerifying(true)
    setVerificationResult(null)
  }

  const handleNewVerification = () => {
    setVerificationResult(null)
    setIsVerifying(false)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-foreground">Verify Document</h1>
            <p className="text-muted-foreground">
              Verify the authenticity of your documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Verifier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Document Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentVerifier
                  onVerificationComplete={handleVerificationComplete}
                  onVerificationStart={handleVerificationStart}
                  disabled={isVerifying}
                />
              </CardContent>
            </Card>

            {/* Verification Result */}
            {verificationResult && (
              <Card className={verificationResult.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                <CardHeader>
                  <CardTitle className={`flex items-center space-x-2 ${verificationResult.valid ? "text-green-800" : "text-red-800"}`}>
                    {verificationResult.valid ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span>
                      {verificationResult.valid ? 'Document Verified' : 'Document Invalid'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Document Name</p>
                      <p className="font-medium">{verificationResult.document?.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Document Hash</p>
                      <p className="font-mono text-sm bg-muted p-2 rounded">
                        {verificationResult.document?.hash}
                      </p>
                    </div>
                  </div>

                  {/* Proof Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Issuer</p>
                      <p className="font-medium">{verificationResult.proof?.issuerName}</p>
                      <p className="text-sm text-muted-foreground">ID: {verificationResult.proof?.issuerId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Batch</p>
                      <p className="font-medium">{verificationResult.proof?.batch}</p>
                    </div>
                  </div>

                  {/* Blockchain Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Merkle Root</p>
                      <p className="font-mono text-sm bg-muted p-2 rounded">
                        {verificationResult.proof?.merkleRoot}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Blockchain Status</p>
                      <p className="font-medium">
                        {verificationResult.blockchain?.rootExists ? 'Anchored' : 'Not Found'}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Link */}
                  {verificationResult.proof?.txHash && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Transaction</p>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${verificationResult.proof.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:text-primary/80"
                      >
                        <span className="font-mono text-sm mr-1">
                          {verificationResult.proof.txHash.slice(0, 10)}...
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Button onClick={handleNewVerification} variant="outline">
                      Verify Another Document
                    </Button>
                    <Button onClick={() => navigate('/')}>
                      Go to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>How It Works</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">1. Upload Document</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload the document you want to verify. The system will hash the file content.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">2. Find Proof</h4>
                  <p className="text-sm text-muted-foreground">
                    The system searches for the document hash in the database of issued documents.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">3. Verify Merkle Proof</h4>
                  <p className="text-sm text-muted-foreground">
                    Verifies the cryptographic proof that the document was part of the original batch.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">4. Check Blockchain</h4>
                  <p className="text-sm text-muted-foreground">
                    Confirms the Merkle root exists on the blockchain and verifies the issuer signature.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Security Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Cryptographic Hashing</p>
                    <p className="text-xs text-muted-foreground">SHA-256 hashing ensures document integrity</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Merkle Tree Proofs</p>
                    <p className="text-xs text-muted-foreground">Efficient verification of document membership</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Blockchain Anchoring</p>
                    <p className="text-xs text-muted-foreground">Immutable storage on Polygon blockchain</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Digital Signatures</p>
                    <p className="text-xs text-muted-foreground">ECDSA signatures verify issuer authenticity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supported Formats */}
            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>PDF</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>DOC/DOCX</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span>TXT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>XLS/XLSX</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>JPG/JPEG</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>PNG</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
