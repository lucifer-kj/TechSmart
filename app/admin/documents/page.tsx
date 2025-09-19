"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type DocumentApproval = {
  id: string;
  document_id: string;
  document_name: string;
  document_type: string;
  job_id: string;
  job_number: string;
  customer_id: string;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
};

type DocumentFilters = {
  status: string;
  documentType: string;
  customer: string;
};

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({
    status: '',
    documentType: '',
    customer: ''
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.documentType) params.append('documentType', filters.documentType);
      if (filters.customer) params.append('customer', filters.customer);

      const response = await fetch(`/api/admin/documents?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading documents");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]); // ✅ react-hooks/exhaustive-deps resolved

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">Pending</Badge>;
      case 'approved':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quote':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Quote</Badge>;
      case 'invoice':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Invoice</Badge>;
      case 'contract':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">Contract</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleDocumentAction = async (documentId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          notes: notes || undefined
        })
      });

      if (!response.ok) throw new Error(`Failed to ${action} document`);
      
      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Document action error:', error);
      alert(`Failed to ${action} document`);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = !filters.status || doc.status === filters.status;
    const matchesType = !filters.documentType || doc.document_type.toLowerCase() === filters.documentType.toLowerCase();
    const matchesCustomer = !filters.customer || 
      doc.customer_name.toLowerCase().includes(filters.customer.toLowerCase());
    
    return matchesStatus && matchesType && matchesCustomer;
  });

  if (loading) {
    return <LoadingCard message="Loading documents..." />;
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <Button 
                className="mt-4" 
                onClick={() => loadDocuments()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Document Approvals
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve customer documents
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Approval Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              const params = new URLSearchParams();
              if (filters.status) params.append('status', filters.status);
              if (filters.documentType) params.append('documentType', filters.documentType);
              if (filters.customer) params.append('customer', filters.customer);
              params.append('refresh', 'true');
              setLoading(true);
              try {
                const res = await fetch(`/api/admin/documents?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Refresh failed');
                setDocuments(data.documents || []);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            🔄 Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {documents.filter(d => d.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {documents.filter(d => d.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {documents.filter(d => d.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Type
              </label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Types</option>
                <option value="quote">Quote</option>
                <option value="invoice">Invoice</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Search by customer name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({ status: '', documentType: '', customer: '' })}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No documents found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{doc.document_name}</div>
                      {getDocumentTypeBadge(doc.document_type)}
                      {getStatusBadge(doc.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Customer: {doc.customer_name} • Job: #{doc.job_number}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Submitted: {formatDate(doc.submitted_at)}</span>
                      {doc.reviewed_at && <span>Reviewed: {formatDate(doc.reviewed_at)}</span>}
                      {doc.review_notes && <span>Notes: {doc.review_notes}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDocumentAction(doc.id, 'approve')}
                        >
                          ✅ Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const notes = prompt('Enter rejection reason (optional):');
                            if (notes !== null) {
                              handleDocumentAction(doc.id, 'reject', notes);
                            }
                          }}
                        >
                          ❌ Reject
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm">
                      👁️ View
                    </Button>
                    <Button variant="outline" size="sm">
                      📥 Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
