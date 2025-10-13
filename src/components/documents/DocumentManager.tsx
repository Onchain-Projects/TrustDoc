import { useState, useEffect } from "react";
import { Search, FileText, Eye, Download, Trash2, MoreHorizontal, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Document {
  id: string;
  batch_name: string;
  merkle_root: string;
  files: string[];
  status: 'valid' | 'invalid' | 'pending';
  created_at: string;
  description?: string;
  expiry_date?: string;
  transaction_hash?: string;
  explorer_url?: string;
}

export const DocumentManager = () => {
  const { user, profile } = useAuthContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, activeTab]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      if (!user || !profile?.issuer_id) return;

      const { data: proofs, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('issuer_id', profile.issuer_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      const formattedDocuments: Document[] = (proofs || []).map(proof => ({
        id: proof.id,
        batch_name: proof.proof_json?.batchName || 'Unknown',
        merkle_root: proof.merkle_root,
        files: proof.proof_json?.files?.map((f: any) => f.name) || [],
        status: proof.status || 'pending',
        created_at: proof.created_at,
        description: proof.proof_json?.description,
        expiry_date: proof.proof_json?.expiryDate,
        transaction_hash: proof.transaction_hash,
        explorer_url: proof.explorer_url
      }));

      setDocuments(formattedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.batch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.files.some(file => file.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by tab
    if (activeTab === "single") {
      filtered = filtered.filter(doc => doc.files.length === 1);
    } else if (activeTab === "batch") {
      filtered = filtered.filter(doc => doc.files.length > 1);
    }

    setFilteredDocuments(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
      case 'invalid':
        return <Badge className="bg-red-100 text-red-800">Invalid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'invalid':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleViewDocument = (document: Document) => {
    // Open document details modal or navigate to document view
    console.log('View document:', document);
  };

  const handleDownloadDocument = (document: Document) => {
    // Download document from Supabase Storage
    console.log('Download document:', document);
  };

  const handleInvalidateDocument = async (document: Document) => {
    try {
      const { error } = await supabase
        .from('proofs')
        .update({ status: 'invalid' })
        .eq('id', document.id);

      if (error) {
        console.error('Error invalidating document:', error);
        return;
      }

      // Refresh documents
      fetchDocuments();
    } catch (error) {
      console.error('Error invalidating document:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Management</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="single">Single Documents</TabsTrigger>
              <TabsTrigger value="batch">Batch Documents</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? "Try adjusting your search terms." : "Get started by uploading your first document."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((document) => (
                        <TableRow key={document.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(document.status)}
                              <div>
                                <p className="font-medium text-gray-900">{document.batch_name}</p>
                                {document.description && (
                                  <p className="text-sm text-gray-500">{document.description}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {document.files.slice(0, 2).map((file, index) => (
                                <p key={index} className="text-sm text-gray-900">{file}</p>
                              ))}
                              {document.files.length > 2 && (
                                <p className="text-sm text-gray-500">
                                  +{document.files.length - 2} more files
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(document.status)}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-900">
                              {new Date(document.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(document.created_at).toLocaleTimeString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadDocument(document)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInvalidateDocument(document)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Invalidate
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
    </div>
  );
};
