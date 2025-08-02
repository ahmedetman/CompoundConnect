import React from 'react';
import { CreditCard, DollarSign, AlertCircle } from 'lucide-react';

const PaymentsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
        <p className="mt-2 text-gray-600">Track and manage unit payments and fees</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Collected</p>
              <p className="text-2xl font-semibold text-gray-900">$125,000</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">$15,000</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">$5,000</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Management</h3>
        <p className="text-gray-600">
          This section will allow you to manage unit payments, track payment status, 
          and generate payment reports. Full implementation coming soon.
        </p>
      </div>
    </div>
  );
};

export default PaymentsManagement;