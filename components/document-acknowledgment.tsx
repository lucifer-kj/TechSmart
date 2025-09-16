"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { SignaturePad } from './signature-pad';

interface DocumentAcknowledgmentProps {
  documentId: string;
  documentName: string;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  onAcknowledge: (data: {
    documentId: string;
    signature: string;
    notes?: string;
    acknowledgedBy: string;
  }) => Promise<boolean>;
  onCancel?: () => void;
}

export function DocumentAcknowledgment({
  documentId,
  documentName,
  isAcknowledged = false,
  acknowledgedAt,
  onAcknowledge,
  onCancel
}: DocumentAcknowledgmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [acknowledgedBy, setAcknowledgedBy] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!signature || !acknowledgedBy || !termsAccepted) {
      alert('Please fill in all required fields and accept the terms');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAcknowledge({
        documentId,
        signature,
        notes,
        acknowledgedBy
      });

      if (success) {
        setIsOpen(false);
        // Reset form
        setSignature('');
        setNotes('');
        setAcknowledgedBy('');
        setTermsAccepted(false);
      }
    } catch (error) {
      console.error('Acknowledgment failed:', error);
      alert('Failed to acknowledge document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSignature('');
    setNotes('');
    setAcknowledgedBy('');
    setTermsAccepted(false);
    if (onCancel) onCancel();
  };

  if (isAcknowledged) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                ✓ Acknowledged
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {acknowledgedAt && `on ${new Date(acknowledgedAt).toLocaleDateString()}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="warning" className="bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                ⚠ Awaiting Acknowledgment
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {documentName}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOpen(true)}
            >
              Acknowledge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Document Acknowledgment</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please review and acknowledge receipt of: <strong>{documentName}</strong>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Terms and Conditions */}
              <div className="space-y-2">
                <h4 className="font-medium">Terms & Conditions</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                  <p className="mb-2">
                    By acknowledging this document, I confirm that:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>I have received and reviewed the document</li>
                    <li>I understand the contents and implications</li>
                    <li>I agree to the terms outlined in the document</li>
                    <li>This acknowledgment is legally binding</li>
                  </ul>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I accept the terms and conditions
                  </label>
                </div>
              </div>

              {/* Acknowledged By */}
              <div className="space-y-2">
                <label htmlFor="acknowledgedBy" className="text-sm font-medium">
                  Acknowledged By <span className="text-red-500">*</span>
                </label>
                <input
                  id="acknowledgedBy"
                  type="text"
                  value={acknowledgedBy}
                  onChange={(e) => setAcknowledgedBy(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                  required
                />
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Digital Signature <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-md">
                  <SignaturePad
                    onSignatureChange={setSignature}
                    width={400}
                    height={150}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Please sign above to acknowledge receipt of this document
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional comments or questions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!signature || !acknowledgedBy || !termsAccepted || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Acknowledge Document'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
