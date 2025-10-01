import { FileCheck, Shield, Link2, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage = ({ onNavigate }: HomePageProps) => {
  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            TrustDoc
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Ready to get started? Join the future of secure document verification today
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="hero"
              size="xl"
              onClick={() => onNavigate('verify')}
              className="w-full sm:w-auto"
            >
              <FileCheck className="w-5 h-5" />
              Verify Document
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="hero"
              size="xl"
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto"
            >
              <UserPlus className="w-5 h-5" />
              Register as Issuer
            </Button>
          </div>
        </div>
      </section>

      {/* Visual Elements Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center bg-blue-50 shadow-card border-0">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Document</div>
                  <div className="text-sm text-muted-foreground">Upload & Verify</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center bg-green-50 shadow-card border-0">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Blockchain</div>
                  <div className="text-sm text-muted-foreground">Verification</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center bg-purple-50 shadow-card border-0">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Tamper-Proof</div>
                  <div className="text-sm text-muted-foreground">Security</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            Our blockchain-powered platform ensures tamper-proof document verification
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Document Issuance */}
            <Card className="text-left bg-blue-50 border-0">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Document Issuance
                </h3>
                <p className="text-sm text-muted-foreground">
                  Issuers create and digitally sign documents which are then hashed and stored on the blockchain using Merkle tree for efficiency.
                </p>
              </CardContent>
            </Card>

            {/* Blockchain Anchoring */}
            <Card className="text-left bg-purple-50 border-0">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Blockchain Anchoring
                </h3>
                <p className="text-sm text-muted-foreground">
                  Document fingerprints are securely anchored on the Polygon blockchain, creating an immutable record of their existence and authenticity.
                </p>
              </CardContent>
            </Card>

            {/* Tamper-Proof Verification */}
            <Card className="text-left bg-green-50 border-0">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Tamper-Proof Verification
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verifiers can instantly check document authenticity by comparing cryptographic proofs against the blockchain record.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            TrustDoc provides powerful tools for secure document management
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Multi-Signature Security */}
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Link2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Multi-Signature Security
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced cryptographic protections ensure documents can only be issued, verified, or invalidated by authorized parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Invalidation */}
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <FileCheck className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Document Invalidation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Issuers can invalidate documents when necessary, with all changes recorded permanently on the blockchain.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Batch Processing */}
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <FileCheck className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Batch Processing
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Efficient Merkle tree implementation allows for batched document processing, reducing costs and improving throughput.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tamper-Proof Verification */}
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Tamper-Proof Verification
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Document authenticity can be verified by anyone without requiring access to the original issuer's systems.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary to-primary/80">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8">
            Join the future of secure document verification today
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="secondary"
              size="xl"
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto"
            >
              Register as Issuer
            </Button>
            <Button
              variant="secondary"
              size="xl"
              onClick={() => onNavigate('verify')}
              className="w-full sm:w-auto bg-white text-primary border-white hover:bg-white/90"
            >
              Verify a Document
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};