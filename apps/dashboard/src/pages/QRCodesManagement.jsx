import React, { useState, useEffect } from 'react';
import { QrCode, Eye, Ban, Calendar, User, Car, Clock } from 'lucide-react';
import { qrCodesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const QRCodesManagement = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchQRCodes();
    fetchStats();
  }, [filter, typeFilter]);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const params = { page: 1, limit: 100 };
      if (filter !== 'all') params.status = filter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const response = await qrCodesAPI.getQRCodes(params);
      setQrCodes(response.data.data.qr_codes);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast.error('Failed to fetch QR codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await qrCodesAPI.getQRStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching QR stats:', error);
    }
  };

  const handleInvalidate = async (qrCodeId) => {
    if (!confirm('Are you sure you want to invalidate this QR code?')) return;
    
    try {
      await qrCodesAPI.invalidateQR(qrCodeId);
      toast.success('QR code invalidated successfully');
      fetchQRCodes();
      fetchStats();
    } catch (error) {
      console.error('Error invalidating QR code:', error);
      toast.error('Failed to invalidate QR code');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'visitor':
        return <User className="h-4 w-4" />;
      case 'owner_gate':
        return <QrCode className="h-4 w-4" />;
      case 'owner_pool':
        return <QrCode className="h-4 w-4" />;
      case 'owner_facility':
        return <QrCode className="h-4 w-4" />;
      default:
        return <QrCode className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'visitor':
        return 'blue';
      case 'owner_gate':
        return 'green';
      case 'owner_pool':
        return 'purple';
      case 'owner_facility':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getStatusColor = (qrCode) => {
    const now = new Date();
    const validTo = new Date(qrCode.valid_to);
    
    if (!qrCode.is_active) return 'red';
    if (validTo < now) return 'red';
    return 'green';
  };

  const getStatusText = (qrCode) => {
    const now = new Date();
    const validTo = new Date(qrCode.valid_to);
    
    if (!qrCode.is_active) return 'Invalidated';
    if (validTo < now) return 'Expired';
    return 'Active';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">QR Codes Management</h1>
        <p className="mt-2 text-gray-600">Monitor and manage visitor QR codes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Codes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total_codes || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Codes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active_codes || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total_scans || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Scans</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.today_scans || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="visitor">Visitor</option>
              <option value="owner_gate">Owner Gate</option>
              <option value="owner_pool">Owner Pool</option>
              <option value="owner_facility">Owner Facility</option>
            </select>
          </div>
        </div>
      </div>

      {/* QR Codes Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {qrCodes.map((qrCode) => (
                <tr key={qrCode.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`p-2 bg-${getTypeColor(qrCode.type)}-100 rounded-lg mr-3`}>
                        {getTypeIcon(qrCode.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {qrCode.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {qrCode.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {qrCode.owner_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {qrCode.unit_number && `Unit ${qrCode.unit_number}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {qrCode.type === 'visitor' && (
                        <div>
                          <div className="flex items-center mb-1">
                            <User className="h-4 w-4 mr-1" />
                            {qrCode.visitor_name}
                          </div>
                          {qrCode.visitor_vehicle_plate && (
                            <div className="flex items-center mb-1">
                              <Car className="h-4 w-4 mr-1" />
                              {qrCode.visitor_vehicle_plate}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {qrCode.num_persons} person(s)
                          </div>
                        </div>
                      )}
                      {qrCode.type !== 'visitor' && (
                        <div className="text-sm text-gray-500">
                          Personal access code
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{format(new Date(qrCode.valid_from), 'MMM dd, yyyy')}</div>
                      <div>to {format(new Date(qrCode.valid_to), 'MMM dd, yyyy')}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(qrCode)}-100 text-${getStatusColor(qrCode)}-800`}>
                      {getStatusText(qrCode)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{qrCode.scan_count || 0} total</div>
                      {qrCode.last_scanned && (
                        <div className="text-xs">
                          Last: {format(new Date(qrCode.last_scanned), 'MMM dd')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {qrCode.is_active && new Date(qrCode.valid_to) > new Date() && (
                      <button
                        onClick={() => handleInvalidate(qrCode.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Invalidate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QRCodesManagement;