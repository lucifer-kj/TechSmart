"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";

type PortalDocument = {
  uuid: string;
  related_object_uuid: string;
  file_name: string;
  file_type: string;
  attachment_source: "Quote" | "Invoice" | "Photo" | "Document";
  date_created: string;
  file_size: number;
  downloadUrl?: string;
  previewUrl?: string;
  category: "quote" | "invoice" | "photo" | "document";
};

type Filters = {
  type: "" | "quote" | "invoice" | "photo" | "document";
  search: string;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ type: "", search: "" });

  const loadDocuments = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (opts?.refresh) params.append("refresh", "true");
      const res = await fetch(`/api/customer-portal/documents?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load documents");
      setDocs((data.documents || []) as PortalDocument[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const matchesType = !filters.type || d.category === filters.type;
      const s = filters.search.trim().toLowerCase();
      const matchesSearch = !s || d.file_name.toLowerCase().includes(s) || d.file_type.toLowerCase().includes(s);
      return matchesType && matchesSearch;
    });
  }, [docs, filters]);

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

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
              <Button className="mt-4" onClick={() => loadDocuments()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and download your job-related documents</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDocuments({ refresh: true })}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value as Filters["type"] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All</option>
                <option value="quote">Quote</option>
                <option value="invoice">Invoice</option>
                <option value="photo">Photo</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                placeholder="Search by name or type (e.g., pdf, jpg)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No documents found.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => (
                <div key={d.uuid} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[70%]" title={d.file_name}>
                      {d.file_name}
                    </div>
                    <span className="text-xs text-gray-500 uppercase">{d.category}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Type: {d.file_type}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Created: {formatDate(d.date_created)}</div>
                  <div className="flex gap-2 mt-3">
                    {d.previewUrl && (
                      <a
                        href={d.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Preview
                      </a>
                    )}
                    <a
                      href={d.downloadUrl || `/api/servicem8/attachments/${d.uuid}`}
                      className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Download
                    </a>
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


