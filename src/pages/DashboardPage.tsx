import { useState, useEffect } from "react";
import { Search, FileText, AlertTriangle, CheckCircle, Plus, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";

interface Document {
  id: string;
  name: string;
  status: 'valid' | 'invalid' | 'expired';
  issuedDate: string;
  hash: string;
}

interface DashboardPageProps {
  issuerName?: string;
  issuerId?: string;
  publicKey?: string;
  documents?: Document[];
  onNavigate?: (page: string) => void;
  onViewDocument?: (documentId: string) => void;
  onUpload?: () => void;
}

export const DashboardPage = ({ 
  issuerName = "",
  issuerId = "",
  publicKey = "Key not available",
  documents: propDocuments = [],
  onNavigate,
  onViewDocument
}: DashboardPageProps) => {
  const { user, profile, userType } = useAuthContext();
  const { proofs, loading: documentsLoading, searchProofs, loadProofs } = useDocuments(profile?.issuer_id);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Debug logging
  console.log('Dashboard Debug:', {
    profile,
    issuerId: profile?.issuer_id,
    proofs,
    documentsLoading
  });

  // Convert proofs to document format for display
  const documents = proofs.map(proof => ({
    id: proof.id,
    name: proof.batch,
    status: proof.expiry_date && new Date(proof.expiry_date) < new Date() ? 'expired' : 'valid' as 'valid' | 'invalid' | 'expired',
    issuedDate: new Date(proof.created_at).toLocaleString(),
    hash: proof.merkle_root.substring(0, 12) + '...' + proof.merkle_root.substring(proof.merkle_root.length - 8)
  }));

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || 
                     (activeTab === "valid" && doc.status === "valid") ||
                     (activeTab === "invalid" && (doc.status === "invalid" || doc.status === "expired"));
    return matchesSearch && matchesTab;
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      searchProofs(value);
    } else {
      // If search is cleared, reload all proofs
      loadProofs();
    }
  };

  // Refresh documents (can be called from parent components)
  const refreshDocuments = () => {
    loadProofs();
  };

  // Refresh documents when component mounts or issuer_id changes
  useEffect(() => {
    if (profile?.issuer_id) {
      loadProofs();
    }
  }, [profile?.issuer_id, loadProofs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge variant="default" className="bg-success text-success-foreground">Valid</Badge>;
      case "invalid":
        return <Badge variant="destructive">Invalidated</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Issuer Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Issuer: <span className="font-medium">{profile?.name || issuerName}</span> • ID: <span className="font-medium">{profile?.issuer_id || issuerId}</span>
            </p>
          </div>
          <Button 
            onClick={() => onNavigate?.('issue')}
            className="mt-4 sm:mt-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Issue New Document
          </Button>
        </div>

        {/* Issued Documents Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Issued Documents</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage all documents issued by your account
                </p>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-full sm:w-80"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshDocuments}
                  disabled={documentsLoading}
                  title="Refresh documents"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="all">All Documents</TabsTrigger>
                <TabsTrigger value="valid">Valid</TabsTrigger>
                <TabsTrigger value="invalid">Invalid/Expired</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="tab-content">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No documents found" : "No documents uploaded yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? "Try adjusting your search terms" 
                        : "Get started by issuing your first document"
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => onNavigate?.('issue')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Issue New Document
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Hash</TableHead>
                          <TableHead className="w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc, index) => (
                          <TableRow key={doc.id} className="document-row" style={{ animationDelay: `${index * 0.1}s` }}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{doc.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(doc.status)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {doc.issuedDate}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {doc.hash}
                              </code>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onViewDocument?.(doc.id)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Issuer Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>Issuer Details</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your issuer information and cryptographic keys
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issuer Name</label>
                  <p className="text-foreground font-medium">{profile?.name || issuerName || "Not available"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issuer ID</label>
                  <p className="text-foreground font-medium font-mono">{profile?.issuer_id || issuerId || "Not available"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Public Key</label>
                  <p className="text-foreground font-mono text-sm break-all bg-muted p-2 rounded">
                    {profile?.public_key || publicKey}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};