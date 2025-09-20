"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type DocumentItem = {
  id: string;
  uuid: string;
  file_name: string;
  file_type: string;
  file_size: number;
  attachment_source: string;
  type: string;
  url?: string;
  date_created: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  job_id: string;
  job_number: string;
  job_description: string;
  job_status: string;
  download_url?: string;
  preview_url?: string;
  
  // Job material specific fields
  quantity?: string;
  price?: string;
  cost?: string;
  displayed_amount?: string;
};

type DocumentFilters = {
  status: string;
  documentType: string;
  customer: string;
};

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({
    status: '',
    documentType: '',
    customer: ''
  });

  const loadDocuments = useCallback(async (forceSync = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.documentType) params.append('documentType', filters.documentType);
      if (filters.customer) params.append('customer', filters.customer);
      
      // Force sync on first load or manual sync
      if (forceSync) {
        params.append('sync', 'true');
      }

      console.log('📡 Loading documents with params:', params.toString());
      const response = await fetch(`/api/admin/documents?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      
      console.log('📊 Documents API Response:', data);
      setDocuments(data.documents || []);
      
      // Log ServiceM8 status for debugging
      if (data.servicem8_status) {
        console.log('📊 ServiceM8 Status:', data.servicem8_status);
        if (!data.servicem8_status.available) {
          console.warn('⚠️ ServiceM8 not available:', data.servicem8_status.error);
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading documents");
      console.error('❌ Load documents error:', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const isFirstLoad = true;
    loadDocuments(isFirstLoad);
  }, [loadDocuments]); // ✅ react-hooks/exhaustive-deps resolved

  // Realtime: listen to document changes
  useRealtime<DocumentItem>({ table: 'documents' }, ({ eventType, new: newRow, old }) => {
    setDocuments(prev => {
      if (eventType === 'INSERT' && newRow) {
        return [newRow as unknown as DocumentItem, ...prev];
      }
      if (eventType === 'UPDATE' && newRow) {
        const updated = newRow as unknown as DocumentItem;
        return prev.map(d => d.id === updated.id ? updated : d);
      }
      if (eventType === 'DELETE' && old) {
        const deleted = old as unknown as DocumentItem;
        return prev.filter(d => d.id !== deleted.id);
      }
      return prev;
    });
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getDocumentTypeBadge = (type: string, source?: string) => {
    if (source === 'Job Material' || type === 'material') {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">Material</Badge>;
    }
    
    switch (type.toLowerCase()) {
      case 'quote':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Quote</Badge>;
      case 'invoice':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Invoice</Badge>;
      case 'contract':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">Contract</Badge>;
      case 'attachment':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Attachment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };


  const filteredDocuments = documents.filter(doc => {
    const matchesType = !filters.documentType || doc.type.toLowerCase() === filters.documentType.toLowerCase() || doc.attachment_source.toLowerCase().includes(filters.documentType.toLowerCase());
    const matchesCustomer = !filters.customer || 
      doc.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
      doc.customer_email.toLowerCase().includes(filters.customer.toLowerCase());
    
    return matchesType && matchesCustomer;
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
            Documents & Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage job documents and materials from ServiceM8
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Materials Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadDocuments(false)}
            disabled={loading}
          >
            🔄 Refresh Data
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadDocuments(true)}
            disabled={loading}
          >
            🔄 Sync ServiceM8
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
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {documents.filter(d => d.type === 'material').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {documents.filter(d => d.type === 'attachment').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${documents.reduce((sum, doc) => sum + (parseFloat(doc.displayed_amount || '0') || 0), 0).toFixed(2)}
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
                <option value="material">Job Materials</option>
                <option value="attachment">Attachments</option>
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
                      <div className="font-medium text-gray-900 dark:text-gray-100">{doc.file_name}</div>
                      {getDocumentTypeBadge(doc.type, doc.attachment_source)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Customer: {doc.customer_name} • Job: #{doc.job_number}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {formatDate(doc.date_created)}</span>
                      <span>Source: {doc.attachment_source}</span>
                      {doc.quantity && <span>Qty: {doc.quantity}</span>}
                      {doc.displayed_amount && <span>Amount: ${doc.displayed_amount}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.type === 'material' ? (
                      <>
                        <Button variant="outline" size="sm">
                          📊 Details
                        </Button>
                        {doc.price && (
                          <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 rounded text-sm font-medium text-green-800 dark:text-green-200">
                            ${doc.displayed_amount || doc.price}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm">
                          👁️ View
                        </Button>
                        <Button variant="outline" size="sm">
                          📥 Download
                        </Button>
                      </>
                    )}
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
