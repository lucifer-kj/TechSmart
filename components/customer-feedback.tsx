"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface CustomerFeedbackProps {
  jobId: string;
  jobNumber: string;
  onSubmit: (data: {
    jobId: string;
    feedback: string;
    rating: number;
    feedbackType: 'general' | 'complaint' | 'compliment' | 'suggestion';
  }) => Promise<boolean>;
}

export function CustomerFeedback({ jobId, jobNumber, onSubmit }: CustomerFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'general' | 'complaint' | 'compliment' | 'suggestion'>('general');

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      alert('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit({
        jobId,
        feedback: feedback.trim(),
        rating,
        feedbackType
      });

      if (success) {
        setIsOpen(false);
        setFeedback('');
        setRating(0);
        setFeedbackType('general');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setFeedback('');
    setRating(0);
    setFeedbackType('general');
  };

  const getRatingStars = (currentRating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setRating(i + 1)}
        className={`text-2xl ${
          i < currentRating ? 'text-yellow-400' : 'text-gray-300'
        } hover:text-yellow-400 transition-colors`}
      >
        ★
      </button>
    ));
  };

  return (
    <>
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                💬 Feedback
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Job #{jobNumber}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOpen(true)}
            >
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Help us improve our service by sharing your experience with Job #{jobNumber}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feedback Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Feedback Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'general', label: 'General', icon: '💬' },
                    { value: 'complaint', label: 'Complaint', icon: '😞' },
                    { value: 'compliment', label: 'Compliment', icon: '😊' },
                    { value: 'suggestion', label: 'Suggestion', icon: '💡' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value as 'complaint' | 'compliment' | 'suggestion')}
                      className={`p-3 border rounded-md text-left transition-colors ${
                        feedbackType === type.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Overall Rating</label>
                <div className="flex items-center space-x-1">
                  {getRatingStars(rating)}
                  <span className="ml-2 text-sm text-gray-500">
                    {rating > 0 ? `${rating}/5` : 'No rating'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Rate your overall experience with this job
                </p>
              </div>

              {/* Feedback Text */}
              <div className="space-y-2">
                <label htmlFor="feedback" className="text-sm font-medium">
                  Your Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Please share your thoughts about the service, work quality, communication, or any suggestions for improvement..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                  required
                />
                <p className="text-xs text-gray-500">
                  {feedback.length}/1000 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
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
