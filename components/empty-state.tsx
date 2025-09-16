import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  icon = '📭', 
  action, 
  className = '' 
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed border-2 border-gray-200 dark:border-gray-700 ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">{icon}</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {description}
          </p>
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export function EmptyJobsState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      title="No jobs found"
      description="You don't have any jobs yet. Jobs will appear here once they're created in ServiceM8."
      icon="🔧"
      action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
    />
  );
}

export function EmptyDocumentsState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      title="No documents"
      description="No documents are available for this job yet. Documents will appear here once they're uploaded."
      icon="📄"
      action={onUpload ? { label: 'Upload Document', onClick: onUpload } : undefined}
    />
  );
}

export function EmptyPaymentsState() {
  return (
    <EmptyState
      title="No payment history"
      description="No payment records found. Payment history will appear here once invoices are generated and payments are made."
      icon="💳"
    />
  );
}
