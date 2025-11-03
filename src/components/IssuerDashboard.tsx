import { useState, useEffect } from "react";
import { Plus, LogOut, FileText, Search, Download, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ToastNotifications, useToasts } from "@/components/ui/toast-notifications";

interface Document {
  id: string;
  batch: string;
  merkleRoot: string;
  files: string[];
  filePaths?: string[];
  status: 'uploaded' | 'processing' | 'failed';
  timestamp: string;
  txHash?: string;
  signature?: string;
  proofJson?: any;
}

interface IssuerDashboardProps {
  onLogout?: () => void;
  onNavigate?: (page: string) => void;
}

export const IssuerDashboard = ({ onLogout, onNavigate }: IssuerDashboardProps) => {
  const { user, profile, signOut } = useAuthContext();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToasts();
  const [uploadedBatches, setUploadedBatches] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Document | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchIssuerDocuments();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDownloadProof = async (issuerId: string, batch: string) => {
    try {
      showInfo('Download Started', `Downloading proof for batch: ${getDisplayBatchName(batch)}`);
      console.log('Download proof for:', { issuerId, batch });
      
      // Find the document in our local state
      const doc = uploadedBatches.find(doc => doc.batch === batch);
      if (!doc) {
        throw new Error('Document not found');
      }
      
      // Create proof data structure (like the real working TrustDoc)
      const proofData = {
        issuer_id: issuerId,
        batch: getDisplayBatchName(batch),
        merkle_root: doc.merkleRoot,
        signature: doc.signature || null,
        created_at: doc.timestamp,
        expiry_date: null,
        description: null,
        proof_json: doc.proofJson || {
          proofs: [
            {
              merkleRoot: doc.merkleRoot,
              leaves: [], // Will be populated from stored data
              files: doc.files,
              proofs: [], // Will be populated from stored data
              signature: doc.signature || null,
              timestamp: doc.timestamp
            }
          ],
          network: 'amoy',
          explorerUrl: doc.txHash ? `https://amoy.polygonscan.com/tx/${doc.txHash}` : null,
          issuerPublicKey: profile?.publicKey || null
        }
      };
      
      // Create JSON blob
      const jsonString = JSON.stringify(proofData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proof_${issuerId}_${getDisplayBatchName(batch)}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Download Complete', 'Proof file has been downloaded successfully');
    } catch (error) {
      console.error('Error downloading proof:', error);
      showError('Download Failed', 'Failed to download proof. Please try again.');
    }
  };

  const handleViewDetails = (batch: Document) => {
    setSelectedBatch(batch);
    setShowDetailsModal(true);
  };

  // Helper function to extract user-friendly batch name (remove timestamp)
  const getDisplayBatchName = (batchName: string) => {
    // Remove the timestamp part (everything after the last underscore followed by numbers)
    const lastUnderscoreIndex = batchName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const afterUnderscore = batchName.substring(lastUnderscoreIndex + 1);
      // Check if it's a timestamp (all digits and 13 characters long)
      if (/^\d{13}$/.test(afterUnderscore)) {
        return batchName.substring(0, lastUnderscoreIndex);
      }
    }
    return batchName;
  };

  const fetchIssuerDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      
      if (!user || !profile?.issuerId) {
        console.log('No user or issuerId found:', { user: !!user, issuerId: profile?.issuerId });
        return;
      }

      console.log('Fetching documents for issuer:', profile.issuerId);

      // Add retry logic for network issues
      let proofs, error;
      let retries = 3;
      
      while (retries > 0) {
        try {
          const result = await supabase
            .from('proofs')
            .select('*')
            .eq('issuer_id', profile.issuerId)
            .order('created_at', { ascending: false });
          
          proofs = result.data;
          error = result.error;
          break; // Success, exit retry loop
        } catch (networkError) {
          console.log(`Network error, retries left: ${retries - 1}`, networkError);
          retries--;
          if (retries === 0) {
            throw networkError;
          }
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      console.log('Fetched documents:', proofs);

      const documents: Document[] = (proofs || []).map(proof => ({
        id: proof.id,
        batch: proof.batch || 'Unknown',
        merkleRoot: proof.merkle_root,
        files: proof.proof_json?.proofs?.[0]?.files || [],
        filePaths: proof.file_paths || [],
        status: proof.status === 'valid' ? 'uploaded' : 'failed',
        timestamp: proof.created_at,
        txHash: proof.proof_json?.explorerUrl ? proof.proof_json.explorerUrl.split('/').pop() : null,
        signature: proof.signature,
        proofJson: proof.proof_json
      }));

      setUploadedBatches(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleIssueDocument = () => {
    if (onNavigate) {
      onNavigate('issue');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge className="bg-green-100 text-green-800">Uploaded</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const filteredDocuments = uploadedBatches.filter(batch => {
    const matchesSearch = batch.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.files.some(file => file.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesTab = true;
    if (activeTab === "single") {
      matchesTab = batch.files.length === 1;
    } else if (activeTab === "batch") {
      matchesTab = batch.files.length > 1;
    }
    
    return matchesSearch && matchesTab;
  });

  return (
    <main className="flex-grow">
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Issuer Dashboard
              </h2>
              <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="font-medium text-gray-800 mr-1">Issuer:</span>
                  <span>{profile?.name || user?.email || "Not set"}</span>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="font-medium text-gray-800 mr-1">ID:</span>
                  <span>{profile?.issuerId || "Not set"}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button
                onClick={handleIssueDocument}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue New Document
              </Button>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>


          {/* Issued Documents Section */}
          <div className="mt-6 bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Issued Documents</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage all documents issued by your account
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-4 py-2 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={fetchIssuerDocuments}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingDocuments}
                    className="whitespace-nowrap"
                  >
                    {isLoadingDocuments ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <Search className="h-4 w-4 mr-1" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="mt-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "all"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("all")}
                  >
                    All Documents
                  </button>
                  <button
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "single"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("single")}
                  >
                    Single Documents
                  </button>
                  <button
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "batch"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("batch")}
                  >
                    Batch Documents
                  </button>
                </nav>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {isLoadingDocuments ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading documents...</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No documents found" : "No documents uploaded yet"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Get started by issuing your first document"
                    }
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleIssueDocument}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Issue New Document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDocuments.map((batch) => (
                    <div
                      key={batch.id}
                      className={`p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-gray-50 ${
                        batch.files.length === 1 ? 'border-gray-200' : 'border-blue-200 bg-blue-50'
                      }`}
                      onClick={() => {
                        handleViewDetails(batch);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg ${
                          batch.files.length === 1 ? 'bg-blue-100' : 'bg-blue-50'
                        }`}>
                          {batch.files.length === 1 ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-500">
                              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                              <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                              <path d="M10 9H8"></path>
                              <path d="M16 13H8"></path>
                              <path d="M16 17H8"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-500">
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {batch.files.length === 1 ? batch.files[0] : `Batch ${getDisplayBatchName(batch.batch)}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {batch.files.length === 1 ? 'Single Document' : `${batch.files.length} documents`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(batch.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions - Download and Eye buttons like real working TrustDoc */}
                      <div className="mt-3 flex justify-end space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (profile?.issuerId) {
                              handleDownloadProof(profile.issuerId, batch.batch);
                            }
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500 bg-transparent border-none cursor-pointer flex items-center justify-center"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(batch);
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500 bg-transparent border-none cursor-pointer flex items-center justify-center"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal - like real working TrustDoc */}
      {showDetailsModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Document Details - Batch {getDisplayBatchName(selectedBatch.batch)}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issuer ID</label>
                      <p className="text-sm text-gray-900 mt-1">{profile?.issuerId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Batch</label>
                      <p className="text-sm text-gray-900 mt-1">{getDisplayBatchName(selectedBatch.batch)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upload Date</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(selectedBatch.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                      <div className="mt-1">
                        <Badge className="bg-green-100 text-green-800">Valid</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Documents</h4>
                  <div className="space-y-2">
                    {selectedBatch.files.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-5 w-5 text-blue-600">
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                            <path d="M10 9H8"></path>
                            <path d="M16 13H8"></path>
                            <path d="M16 17H8"></path>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded: {new Date(selectedBatch.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blockchain Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Blockchain Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Merkle Root</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-mono text-gray-900 break-all">
                          {selectedBatch.merkleRoot || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Network</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">amoy</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contract Address</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-mono text-gray-900 break-all">
                          0x1253369dab29F77692bF84DB759583ac47F66532
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (profile?.issuerId) {
                    handleDownloadProof(profile.issuerId, selectedBatch.batch);
                  }
                  setShowDetailsModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Proof
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
    </main>
  );
};
