import { FileCheck, Shield, Link2, UserPlus, ArrowRight, Database, Key, FileX, Upload, Hash, TreePine, CheckCircle, Award, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage = ({ onNavigate }: HomePageProps) => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">TrustDoc</span>
          </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              A platform for decentralized verification of digital documents and transactions using blockchain technology.
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <button
              onClick={() => onNavigate('verify')}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium shadow-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Verify Documents
              </button>
              <button
              onClick={() => onNavigate('register')}
                className="px-6 py-3 rounded-lg bg-white text-blue-600 font-medium shadow-lg border border-blue-200 hover:bg-blue-50 transition-colors duration-200"
              >
                Issuer Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TrustDoc Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose TrustDoc?</h2>
            <p className="mt-4 text-base text-gray-500 max-w-3xl mx-auto">Built for organizations that demand speed, security, and scalability</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-lg hover:ring-2 hover:ring-violet-500 transition-all duration-200 select-none cursor-default">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Fast On-Chain Verification</h3>
                <p className="text-gray-600 text-sm">Verify documents instantly using lightweight Merkle-based cryptographic proofs.</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-lg hover:ring-2 hover:ring-violet-500 transition-all duration-200 select-none cursor-default">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
                </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Enterprise-Grade Security</h3>
                <p className="text-gray-600 text-sm">Cryptographic hashing and Merkle roots ensure tamper-proof document integrity.</p>
                </div>
                </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-start space-x-4 hover:shadow-lg hover:ring-2 hover:ring-violet-500 transition-all duration-200 select-none cursor-default">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-teal-600" />
                </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Scalable Batch Uploads</h3>
                <p className="text-gray-600 text-sm">Upload and verify thousands of documents efficiently using Merkle tree batching.</p>
                </div>
                </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">A step-by-step process for secure document lifecycle management</p>
          </div>
          <div className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">1. Upload</h3>
                <p className="text-gray-600 text-sm">Issuers upload documents through our secure portal with digital signatures.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <Hash className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">2. Hash</h3>
                <p className="text-gray-600 text-sm">Documents are cryptographically hashed to create unique digital fingerprints.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-teal-200">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-4">
                  <TreePine className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">3. Merkle Tree</h3>
                <p className="text-gray-600 text-sm">Hashes are grouped using Merkle trees for efficient, scalable blockchain anchoring.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-indigo-200">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">4. Verify</h3>
                <p className="text-gray-600 text-sm">Anyone can verify document authenticity using transaction IDs and cryptographic proofs.</p>
              </div>
            </div>
            
            {/* Merkle Tree Highlight */}
            <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-100">
              <div className="flex items-center justify-center mb-4">
                <TreePine className="w-8 h-8 text-green-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Efficient Merkle Tree Batching</h3>
              </div>
              <p className="text-gray-700 text-center max-w-3xl mx-auto">
                Documents are hashed and grouped using a Merkle tree structure, enabling secure, scalable blockchain anchoring. 
                This approach reduces gas costs and improves throughput while maintaining cryptographic security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Key Features</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">TrustDoc provides powerful tools for secure document management</p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Key className="w-5 h-5 mr-2 text-blue-500" />
                      Multi-Signature Security
                    </h3>
              <p className="text-gray-600">Advanced cryptographic protections ensure documents can only be issued, verified, or invalidated by authorized parties.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileX className="w-5 h-5 mr-2 text-blue-500" />
                Document Invalidation
              </h3>
              <p className="text-gray-600">Issuers can invalidate documents when necessary, with all changes recorded permanently on the blockchain.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-500" />
                Batch Processing
              </h3>
              <p className="text-gray-600">Efficient Merkle tree implementation allows for batched document processing, reducing costs and improving throughput.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Decentralized Trust
              </h3>
              <p className="text-gray-600">No central authority required - trust is established through blockchain consensus and cryptographic proofs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Issuers Love TrustDoc Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why Issuers Love TrustDoc</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">Built for organizations that need secure, scalable document management</p>
                  </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Once, Verify Forever</h3>
                  <p className="text-gray-600">Documents remain verifiable indefinitely without requiring ongoing maintenance or hosting costs.</p>
                </div>
                  </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <FileX className="w-5 h-5 text-red-600" />
                </div>
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900">Revoke Documents On-Chain</h3>
                  <p className="text-gray-600">Instantly invalidate documents when necessary, with all changes permanently recorded on the blockchain.</p>
                </div>
              </div>
                  </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dashboard for Batch Management</h3>
                  <p className="text-gray-600">Secure dashboard to manage document batches, track issuance, and monitor verification activity.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Decentralized Trust</h3>
                  <p className="text-gray-600">No need to host or maintain verification infrastructure - trust is established through blockchain consensus.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Trusted Across Industries</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">Secure document verification for any organization that values authenticity and trust</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Education & Training</h3>
              <p className="text-gray-600">Universities, schools, and training providers can issue verifiable certificates, diplomas, and credentials.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Legal & Compliance</h3>
              <p className="text-gray-600">Law firms, businesses, and regulatory bodies can create tamper-proof contracts and compliance documents.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">HR & Business</h3>
              <p className="text-gray-600">Organizations can issue verifiable employment documents, policies, and business agreements.</p>
            </div>
          </div>
          
          {/* Inclusive Message */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">And Many More...</h3>
              <p className="text-gray-600 mb-6">
                Whether you're in healthcare, finance, government, non-profit, or any other industry, 
                TrustDoc provides the tools you need to create verifiable, tamper-proof documents.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <span className="bg-gray-100 px-3 py-1 rounded-full">Healthcare Records</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">Financial Documents</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">Government Certificates</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">Non-Profit Credentials</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">Research Papers</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">And More...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">Join the future of secure document verification today</p>
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => onNavigate('register')}
              className="px-6 py-3 rounded-lg bg-white text-blue-600 font-medium shadow-lg hover:bg-blue-50 transition-colors duration-200"
            >
              Register as Issuer
            </button>
            <button
              onClick={() => onNavigate('verify')}
              className="px-6 py-3 rounded-lg bg-transparent text-white font-medium border border-white hover:bg-white/10 transition-colors duration-200"
            >
              Verify a Document
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};