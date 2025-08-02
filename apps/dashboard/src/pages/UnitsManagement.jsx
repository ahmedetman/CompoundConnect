import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, MoreHorizontal } from 'lucide-react';
import { unitsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const UnitsManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await unitsAPI.getUnits();
      setUnits(response.data.units || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
      // Mock data for demonstration
      setUnits([
        {
          id: 1,
          unit_number: '1A',
          users: [
            { id: 1, name: 'John Doe', relationship: 'owner' },
            { id: 2, name: 'Jane Doe', relationship: 'spouse' }
          ],
          payment_status: 'paid',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          unit_number: '2B',
          users: [
            { id: 3, name: 'Mike Smith', relationship: 'owner' }
          ],
          payment_status: 'due',
          created_at: '2024-01-20T14:30:00Z'
        },
        {
          id: 3,
          unit_number: '3C',
          users: [],
          payment_status: 'overdue',
          created_at: '2024-02-01T09:15:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (unitData) => {
    try {
      await unitsAPI.createUnit(unitData);
      toast.success('Unit created successfully');
      fetchUnits();
      setShowCreateModal(false);
    } catch (error) {
      toast.error('Failed to create unit');
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    
    try {
      await unitsAPI.deleteUnit(unitId);
      toast.success('Unit deleted successfully');
      fetchUnits();
    } catch (error) {
      toast.error('Failed to delete unit');
    }
  };

  const filteredUnits = units.filter(unit =>
    unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'due': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading units..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Units Management</h1>
          <p className="mt-2 text-gray-600">Manage compound units and their residents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Unit {unit.unit_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {unit.users?.length || 0} residents
                      </span>
                    </div>
                    {unit.users?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {unit.users.map(user => user.name).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(unit.payment_status)}`}>
                      {unit.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(unit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUnit(unit);
                          setShowAssignModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Assign Users"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedUnit(unit)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Unit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Unit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUnits.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No units found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new unit.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Unit Modal */}
      {showCreateModal && (
        <CreateUnitModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUnit}
        />
      )}

      {/* Assign Users Modal */}
      {showAssignModal && selectedUnit && (
        <AssignUsersModal
          unit={selectedUnit}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedUnit(null);
          }}
          onSuccess={fetchUnits}
        />
      )}
    </div>
  );
};

// Create Unit Modal Component
const CreateUnitModal = ({ onClose, onSubmit }) => {
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitNumber.trim()) return;

    setLoading(true);
    await onSubmit({ unit_number: unitNumber.trim() });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Unit</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Number
              </label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="input"
                placeholder="e.g., 1A, 2B, 3C"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Unit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Assign Users Modal Component
const AssignUsersModal = ({ unit, onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Users to Unit {unit.unit_number}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            This feature will allow you to assign users to units. Implementation coming soon.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitsManagement;