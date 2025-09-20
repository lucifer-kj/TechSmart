"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type AdminQuote = {
  id: string;
  uuid: string;
  attachment_name: string;
  file_type: string;
  photo_width?: string;
  photo_height?: string;
  attachment_source: string;
  tags: string;
  extracted_info: string;
  is_favourite: string;
  created_by_staff_uuid: string;
  timestamp: string;
  edit_date: string;
  related_object: string;
  related_object_uuid: string;
  active: number;
  
  // Related job and customer info
  job_id?: string;
  job_number?: string;
  job_description?: string;
  job_status?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  
  // ServiceM8 data
  servicem8_data?: {
    uuid: string;
    metadata: Record<string, unknown>;
  };
};

type QuoteFilters = {
  status: string;
  customer: string;
  dateRange: string;
  fileType: string;
  sortBy: 'date' | 'name' | 'customer' | 'size';
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuoteFilters>({
    status: '',
    customer: '',
    dateRange: '',
    fileType: '',
    sortBy: 'date'
  });

  const loadQuotes = useCallback(async (forceSync = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customer) params.append('customer', filters.customer);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.fileType) params.append('fileType', filters.fileType);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (forceSync) params.append('sync', 'true');

      const response = await fetch(`/api/admin/quotes?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load quotes: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Admin quotes API response:', data);
      console.log('🔧 ServiceM8 status:', data.servicem8_status);
      
      setQuotes(data.quotes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
      console.error('❌ Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const isFirstLoad = true;
    loadQuotes(isFirstLoad);
  }, [loadQuotes]);

  // Realtime: listen to quote changes
  useRealtime<AdminQuote>({ table: 'documents' }, ({ eventType, new: newRow }) => {
    setQuotes(prev => {
      if (eventType === 'INSERT' && newRow) {
        return [newRow as unknown as AdminQuote, ...prev];
      }
      if (eventType === 'UPDATE' && newRow) {
        const updated = newRow as unknown as AdminQuote;
        return prev.map(q => q.id === updated.id ? updated : q);
      }
      if (eventType === 'DELETE' && newRow) {
        const deleted = newRow as unknown as AdminQuote;
        return prev.filter(q => q.id !== deleted.id);
      }
      return prev;
    });
  });

  const handleSyncServiceM8 = async () => {
    await loadQuotes(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeBadge = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif')) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Image</Badge>;
    }
    if (type.includes('pdf')) {
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">PDF</Badge>;
    }
    if (type.includes('doc')) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Document</Badge>;
    }
    return <Badge variant="outline">{fileType}</Badge>;
  };

  const getFavouriteBadge = (isFavourite: string) => {
    if (isFavourite === '1') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">⭐ Favourite</Badge>;
    }
    return null;
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesStatus = !filters.status || quote.active.toString() === filters.status;
    const matchesFileType = !filters.fileType || quote.file_type.toLowerCase().includes(filters.fileType.toLowerCase());
    const matchesCustomer = !filters.customer || 
      quote.customer_name?.toLowerCase().includes(filters.customer.toLowerCase()) ||
      quote.customer_email?.toLowerCase().includes(filters.customer.toLowerCase());
    
    return matchesStatus && matchesFileType && matchesCustomer;
  });

  if (loading) {
    return <LoadingCard message="Loading quotes..." />;
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={() => loadQuotes()}>Try Again</Button>
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
            Quotes & Attachments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage job attachments and quotes from ServiceM8
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Attachments Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadQuotes(false)}
            disabled={loading}
          >
            🔄 Refresh
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleSyncServiceM8}
            disabled={loading}
          >
            🔄 Sync ServiceM8
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {quotes.filter(q => q.file_type.toLowerCase().includes('jpg') || q.file_type.toLowerCase().includes('png')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              PDFs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {quotes.filter(q => q.file_type.toLowerCase().includes('pdf')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Favourites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {quotes.filter(q => q.is_favourite === '1').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File Type
              </label>
              <select
                value={filters.fileType}
                onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Types</option>
                <option value="jpg">Images (JPG/PNG)</option>
                <option value="pdf">PDF Documents</option>
                <option value="doc">Word Documents</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer
              </label>
              <input
                type="text"
                placeholder="Search customers..."
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as QuoteFilters['sortBy'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="customer">Customer</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments & Quotes ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No attachments found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {quote.attachment_name || 'Unnamed Attachment'}
                      </div>
                      {getFileTypeBadge(quote.file_type)}
                      {getFavouriteBadge(quote.is_favourite)}
                      {quote.active === 1 ? 
                        <Badge variant="success" className="bg-green-100 text-green-800">Active</Badge> : 
                        <Badge variant="secondary">Inactive</Badge>
                      }
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {quote.customer_name ? `Customer: ${quote.customer_name}` : 'No customer'} • 
                      {quote.job_number ? ` Job: #${quote.job_number}` : ' No job linked'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {formatDate(quote.timestamp)}</span>
                      <span>Modified: {formatDate(quote.edit_date)}</span>
                      {quote.photo_width && quote.photo_height && (
                        <span>Size: {quote.photo_width}x{quote.photo_height}</span>
                      )}
                      {quote.tags && <span>Tags: {quote.tags}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      👁️ View
                    </Button>
                    <Button variant="outline" size="sm">
                      📥 Download
                    </Button>
                    {quote.is_favourite === '0' && (
                      <Button variant="outline" size="sm">
                        ⭐ Favourite
                      </Button>
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
