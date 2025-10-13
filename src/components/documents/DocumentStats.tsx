import { useState, useEffect } from "react";
import { FileText, CheckCircle, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface DocumentStats {
  totalDocuments: number;
  validDocuments: number;
  invalidDocuments: number;
  pendingDocuments: number;
  successRate: number;
}

export const DocumentStats = () => {
  const [stats, setStats] = useState<DocumentStats>({
    totalDocuments: 0,
    validDocuments: 0,
    invalidDocuments: 0,
    pendingDocuments: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get current user's issuer ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile to get issuer_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('issuer_id')
        .eq('id', user.id)
        .single();

      if (!profile?.issuer_id) return;

      // Get all proofs for this issuer
      const { data: proofs, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('issuer_id', profile.issuer_id);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      // Calculate stats
      const totalDocuments = proofs?.length || 0;
      const validDocuments = proofs?.filter(p => p.status === 'valid').length || 0;
      const invalidDocuments = proofs?.filter(p => p.status === 'invalid').length || 0;
      const pendingDocuments = proofs?.filter(p => p.status === 'pending').length || 0;
      const successRate = totalDocuments > 0 ? (validDocuments / totalDocuments) * 100 : 0;

      setStats({
        totalDocuments,
        validDocuments,
        invalidDocuments,
        pendingDocuments,
        successRate
      });
    } catch (error) {
      console.error('Error fetching document stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valid Documents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.validDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Invalid Documents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.invalidDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Document uploaded successfully</p>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">Valid</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Batch processing completed</p>
                  <p className="text-sm text-gray-500">1 hour ago</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">5 documents</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">Document invalidated</p>
                  <p className="text-sm text-gray-500">3 hours ago</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">Invalid</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
