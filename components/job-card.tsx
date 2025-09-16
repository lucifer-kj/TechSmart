"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface JobMaterial {
  uuid: string;
  name: string;
  description: string;
  qty: number;
  cost_ex_tax: number;
  total_ex_tax: number;
  total_inc_tax: number;
}

interface JobAttachment {
  uuid: string;
  file_name: string;
  file_type: string;
  attachment_source: string;
  downloadUrl: string;
}

interface Job {
  uuid: string;
  job_number: string;
  job_description: string;
  status: 'Quote' | 'Work Order' | 'Invoice' | 'Complete' | 'Cancelled';
  generated_job_total: number;
  job_address: string;
  date_created: string;
  date_last_modified: string;
  date_completed?: string;
  materials?: JobMaterial[];
  attachments?: JobAttachment[];
}

interface JobCardProps {
  job: Job;
  onViewDetails?: (jobId: string) => void;
  onApproveQuote?: (jobId: string) => void;
  onDownloadDocument?: (attachmentId: string) => void;
}

export function JobCard({ 
  job, 
  onViewDetails, 
  onApproveQuote, 
  onDownloadDocument 
}: JobCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Quote': return 'warning';
      case 'Work Order': return 'secondary';
      case 'Invoice': return 'default';
      case 'Complete': return 'success';
      case 'Cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Quote': return '📋';
      case 'Work Order': return '🔧';
      case 'Invoice': return '💰';
      case 'Complete': return '✅';
      case 'Cancelled': return '❌';
      default: return '❓';
    }
  };

  const getPriorityActions = () => {
    const actions = [];
    
    if (job.status === 'Quote') {
      actions.push(
        <Button
          key="approve"
          size="sm"
          onClick={() => onApproveQuote?.(job.uuid)}
          className="bg-green-600 hover:bg-green-700"
        >
          Approve Quote
        </Button>
      );
    }
    
    if (job.attachments && job.attachments.length > 0) {
      const invoiceAttachment = job.attachments.find(
        att => att.attachment_source === 'Invoice'
      );
      if (invoiceAttachment) {
        actions.push(
          <Button
            key="invoice"
            size="sm"
            variant="outline"
            onClick={() => onDownloadDocument?.(invoiceAttachment.uuid)}
          >
            Download Invoice
          </Button>
        );
      }
    }
    
    return actions;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(job.status)}</span>
            <div>
              <CardTitle className="text-lg">Job #{job.job_number}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{job.job_address}</p>
            </div>
          </div>
          <Badge variant={getStatusColor(job.status) as 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Job Description */}
        <div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {job.job_description}
          </p>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Value:</span>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(job.generated_job_total)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <p className="font-medium">{formatDate(job.date_created)}</p>
          </div>
          {job.date_completed && (
            <div className="col-span-2">
              <span className="text-gray-500">Completed:</span>
              <p className="font-medium">{formatDate(job.date_completed)}</p>
            </div>
          )}
        </div>

        {/* Materials Preview */}
        {job.materials && job.materials.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Materials ({job.materials.length})
            </h4>
            <div className="space-y-1">
              {job.materials.slice(0, 2).map((material) => (
                <div key={material.uuid} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {material.qty}x {material.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(material.total_inc_tax)}
                  </span>
                </div>
              ))}
              {job.materials.length > 2 && (
                <p className="text-xs text-gray-500">
                  +{job.materials.length - 2} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Attachments Preview */}
        {job.attachments && job.attachments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Documents ({job.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {job.attachments.slice(0, 3).map((attachment) => (
                <span
                  key={attachment.uuid}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                >
                  {attachment.attachment_source}
                </span>
              ))}
              {job.attachments.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{job.attachments.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {getPriorityActions()}
          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(job.uuid)}
              className="flex-1 sm:flex-none"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
