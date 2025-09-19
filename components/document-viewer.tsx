"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading';
import { DocumentAcknowledgment } from './document-acknowledgment';

interface Document {
  uuid: string;
  file_name: string;
  file_type: string;
  file_size: number;
  attachment_source: string;
  date_created: string;
  downloadUrl: string;
  previewUrl?: string;
  category: 'quote' | 'invoice' | 'photo' | 'document';
}

interface DocumentViewerProps {
  documents: Document[];
  onDownload: (documentId: string) => void;
  onPreview?: (documentId: string) => void;
  showAcknowledgment?: boolean;
  acknowledgments?: Record<string, { acknowledgedAt: string; acknowledgedBy: string }>;
}

export function DocumentViewer({ 
  documents, 
  onDownload, 
  onPreview, 
  showAcknowledgment = false,
  acknowledgments = {}
}: DocumentViewerProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'quote': return 'warning';
      case 'invoice': return 'success';
      case 'photo': return 'secondary';
      default: return 'default';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    return '📎';
  };

  const handlePreview = async (document: Document) => {
    setIsPreviewLoading(true);
    try {
      if (onPreview) {
        await onPreview(document.uuid);
      }
      setSelectedDocument(document);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = (document: Document) => {
    onDownload(document.uuid);
  };

  const handleAcknowledge = async (documentId: string, signature: string, notes?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/customer-portal/documents/${documentId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          signature,
          notes: notes || '',
          acknowledgedBy: 'Customer', // This should come from user context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge document');
      }

      return true;
    } catch (error) {
      console.error('Acknowledgment error:', error);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.uuid} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getFileIcon(document.file_type)}</span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm truncate">
                      {document.file_name}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(document.file_size)}
                    </p>
                  </div>
                </div>
                <Badge variant={getCategoryColor(document.category) as 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'}>
                  {document.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{new Date(document.date_created).toLocaleDateString()}</span>
                <span>{document.attachment_source}</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(document)}
                  className="flex-1"
                >
                  Download
                </Button>
                {document.file_type.includes('pdf') || document.file_type.includes('image') ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePreview(document)}
                    disabled={isPreviewLoading}
                    className="flex-1"
                  >
                    {isPreviewLoading ? <LoadingSpinner size="sm" /> : 'Preview'}
                  </Button>
                ) : null}
              </div>
              
              {/* Document Acknowledgment */}
              {showAcknowledgment && (
                <div className="mt-4">
                  <DocumentAcknowledgment
                    documentId={document.uuid}
                    documentName={document.file_name}
                    isAcknowledged={!!acknowledgments[document.uuid]}
                    acknowledgedAt={acknowledgments[document.uuid]?.acknowledgedAt}
                    onAcknowledge={handleAcknowledge}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl max-h-[90vh] w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedDocument.file_name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-auto">
              {selectedDocument.file_type.includes('pdf') ? (
                <iframe
                  src={selectedDocument.downloadUrl}
                  className="w-full h-96 border-0"
                  title={selectedDocument.file_name}
                />
              ) : selectedDocument.file_type.includes('image') ? (
                <div className="relative w-full h-96">
                  <Image
                    src={selectedDocument.downloadUrl}
                    alt={selectedDocument.file_name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Preview not available for this file type</p>
                  <Button
                    className="mt-4"
                    onClick={() => handleDownload(selectedDocument)}
                  >
                    Download File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
