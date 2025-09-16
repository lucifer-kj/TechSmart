"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading';
import { SignaturePad } from './signature-pad';

interface JobMaterial {
  uuid: string;
  name: string;
  description: string;
  qty: number;
  cost_ex_tax: number;
  total_ex_tax: number;
  total_inc_tax: number;
}

interface QuoteApprovalFormProps {
  jobNumber: string;
  jobDescription: string;
  materials: JobMaterial[];
  totalAmount: number;
  onApprove: (signature: string, notes: string) => Promise<void>;
  onReject?: () => void;
  isLoading?: boolean;
}

export function QuoteApprovalForm({
  jobNumber,
  jobDescription,
  materials,
  totalAmount,
  onApprove,
  onReject,
  isLoading = false
}: QuoteApprovalFormProps) {
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!signature.trim()) {
      alert('Please provide your signature before approving');
      return;
    }

    setIsSubmitting(true);
    try {
      await onApprove(signature, notes);
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quote Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Quote Approval</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Job #{jobNumber}</p>
            </div>
            <Badge variant="warning">Pending Approval</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">{jobDescription}</p>
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {materials.map((material) => (
              <div key={material.uuid} className="flex justify-between items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {material.name}
                  </h4>
                  {material.description && (
                    <p className="text-sm text-gray-500 mt-1">{material.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Qty: {material.qty} × {formatCurrency(material.cost_ex_tax)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(material.total_inc_tax)}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(material.total_ex_tax)} ex. tax
                  </p>
                </div>
              </div>
            ))}
            
            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold">Total Amount</h3>
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalAmount)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Signature</CardTitle>
          <p className="text-sm text-gray-500">
            Please sign below to approve this quote. Your signature indicates your agreement to the terms and pricing.
          </p>
        </CardHeader>
        <CardContent>
          <SignaturePad
            onSignatureChange={setSignature}
            width={400}
            height={150}
            className="mb-4"
          />
          
          {/* Notes Section */}
          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any comments or special instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            {onReject && (
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isSubmitting || isLoading}
                className="sm:w-auto w-full"
              >
                Request Changes
              </Button>
            )}
            <Button
              onClick={handleApprove}
              disabled={isSubmitting || isLoading || !signature.trim()}
              className="sm:w-auto w-full"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Approving...
                </>
              ) : (
                'Approve Quote'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Terms and Conditions
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            By approving this quote, you agree to the terms and conditions outlined. 
            Work will commence upon approval and payment terms as specified. 
            Any changes to the scope of work may result in additional charges.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
