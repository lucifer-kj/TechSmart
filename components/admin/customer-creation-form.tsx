"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerCreationFormProps {
  onCustomerCreated: (customerId: string) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  servicem8_customer_uuid: string;
  createPortalAccess: boolean;
  generateCredentials: boolean;
  sendWelcomeEmail: boolean;
}

export function CustomerCreationForm({ onCustomerCreated, onError, onLoading }: CustomerCreationFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    servicem8_customer_uuid: '',
    createPortalAccess: true,
    generateCredentials: true,
    sendWelcomeEmail: true
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Customer name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onLoading(true);
    try {
      const endpoint = formData.servicem8_customer_uuid
        ? '/api/admin/customers/link'
        : '/api/admin/customers';
      const payload = formData.servicem8_customer_uuid
        ? {
            client_uuid: formData.servicem8_customer_uuid,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            createPortalAccess: formData.createPortalAccess
          }
        : formData;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const data = await response.json();
      onCustomerCreated(data.customer.id);
    } catch (error) {
      console.error('Customer creation error:', error);
      onError((error as Error).message || 'Failed to create customer');
    } finally {
      onLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Basic Information
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter customer name"
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="servicem8_customer_uuid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ServiceM8 Customer UUID
                </label>
                <input
                  id="servicem8_customer_uuid"
                  type="text"
                  value={formData.servicem8_customer_uuid}
                  onChange={(e) => handleInputChange('servicem8_customer_uuid', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  placeholder="Enter ServiceM8 UUID (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for new customers, or enter existing ServiceM8 UUID
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Contact Information
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="customer@example.com"
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 ${
                    validationErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="+61 400 000 000"
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                placeholder="Enter customer address"
              />
            </div>
          </div>

          {/* Portal Access Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Portal Access
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.createPortalAccess}
                  onChange={(e) => handleInputChange('createPortalAccess', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Create portal access account
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customer will be able to log into the portal to view jobs and manage their account
                  </p>
                </div>
              </label>

              {formData.createPortalAccess && (
                <div className="ml-6 space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.generateCredentials}
                      onChange={(e) => handleInputChange('generateCredentials', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Generate temporary credentials
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Create a temporary password that the customer can use for first login
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.sendWelcomeEmail}
                      onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Send welcome email
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Send login credentials and portal information via email
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              Create Customer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
