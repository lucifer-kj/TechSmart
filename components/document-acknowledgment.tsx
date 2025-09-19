"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/signature-pad";

interface DocumentAcknowledgmentProps {
  documentId: string;
  documentName: string;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  onAcknowledge: (documentId: string, signature: string, notes?: string) => void;
  isLoading?: boolean;
}

export function DocumentAcknowledgment({
  documentId,
  documentName,
  isAcknowledged = false,
  acknowledgedAt,
  acknowledgedBy,
  onAcknowledge,
  isLoading = false
}: DocumentAcknowledgmentProps) {
  const [showAcknowledgmentForm, setShowAcknowledgmentForm] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signature.trim()) {
      alert("Please provide a signature to acknowledge this document.");
      return;
    }

    setSubmitting(true);
    try {
      await onAcknowledge(documentId, signature, notes);
      setShowAcknowledgmentForm(false);
      setSignature("");
      setNotes("");
    } catch (error) {
      console.error("Acknowledgment error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (isAcknowledged) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Document Acknowledged
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Acknowledged on {acknowledgedAt ? new Date(acknowledgedAt).toLocaleDateString() : 'Unknown date'}
                {acknowledgedBy && ` by ${acknowledgedBy}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showAcknowledgmentForm) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-lg">Acknowledge Document</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please review and acknowledge that you have received: <strong>{documentName}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Digital Signature <span className="text-red-500">*</span>
            </label>
            <SignaturePad
              onSignatureChange={setSignature}
              width={400}
              height={150}
              className="border border-gray-300 rounded-md bg-white"
            />
            {signature && (
              <p className="text-xs text-gray-500 mt-1">
                Signature captured. Please review before submitting.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              placeholder="Any additional comments about this document..."
            />
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleSubmit}
              disabled={!signature.trim() || submitting || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "Acknowledging..." : "Acknowledge Document"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAcknowledgmentForm(false);
                setSignature("");
                setNotes("");
              }}
              disabled={submitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">!</span>
            </div>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Document Requires Acknowledgment
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Please acknowledge receipt of: <strong>{documentName}</strong>
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAcknowledgmentForm(true)}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Acknowledge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}