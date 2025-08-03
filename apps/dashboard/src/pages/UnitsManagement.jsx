import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, MoreHorizontal, Building2, X } from 'lucide-react';
import { unitsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const UnitsManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitUsers, setUnitUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, []);

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

  // Edit Unit Modal Component
  const EditUnitModal = ({ unit, onClose, onSubmit }) => {
    const [unitNumber, setUnitNumber] = useState(unit.unit_number);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!unitNumber.trim()) return;

      setLoading(true);
      await onSubmit(unit.id, { unit_number: unitNumber.trim() });
      setLoading(false);
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Unit</h3>
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
                  {loading ? 'Updating...' : 'Update Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Users Modal Component
  const UsersModal = ({ unit, users, loading, onClose, onRemoveUser }) => {
    const getRelationshipText = (relationship) => {
      switch (relationship) {
        case 'owner': return 'Owner';
        case 'tenant': return 'Tenant';
        case 'family_member': return 'Family Member';
        default: return relationship;
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Unit {unit.unit_number} - Residents
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner text="Loading residents..." />
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No residents assigned to this unit.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-500">{getRelationshipText(user.relationship)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveUser(unit.id, user.id, user.name)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove user"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await unitsAPI.getUnits();
      const unitsData = response.data.data.units || [];

      // Transform API data to match component expectations
      const transformedUnits = unitsData.map(unit => ({
        id: unit.id,
        unit_number: unit.unit_number,
        created_at: unit.created_at,
        payment_status: unit.payment_status,
        owner_count: unit.owner_count,
        paid_services: unit.paid_services,
        total_services: unit.total_services
      }));

      setUnits(transformedUnits);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error(error.response?.data?.message || 'Failed to load units');
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
      toast.error(error.response?.data?.message || 'Failed to create unit');
    }
  };

  const handleUpdateUnit = async (unitId, unitData) => {
    try {
      await unitsAPI.updateUnit(unitId, unitData);
      toast.success('Unit updated successfully');
      fetchUnits();
      setShowEditModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update unit');
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit? This action cannot be undone.')) return;
    
    try {
      await unitsAPI.deleteUnit(unitId);
      toast.success('Unit deleted successfully');
      fetchUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete unit');
    }
  };

  const handleViewUsers = async (unit) => {
    try {
      setSelectedUnit(unit);
      setLoadingUsers(true);
      setShowUsersModal(true);

      const response = await unitsAPI.getUnitUsers(unit.id);
      const users = response.data.data.users || [];

      // Map the response to ensure we have the correct user ID
      // The API returns uu.* (unit_users fields) + user fields
      // We need to use user_id from unit_users, not the relationship id
      const transformedUsers = users.map(user => ({
        ...user,
        id: user.user_id, // Use the actual user ID from unit_users.user_id
        relationship: user.relationship || 'owner',
        name: user.name,
        email: user.email,
        profile_picture_url: user.profile_picture_url
      }));

      console.log('Loaded unit users:', transformedUsers);
      setUnitUsers(transformedUsers);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load unit users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRemoveUser = async (unitId, userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this unit?`)) return;

    console.log('Removing user from unit:', { unitId, userId, userName });

    try {
      await unitsAPI.removeUserFromUnit(unitId, userId);
      toast.success('User removed from unit successfully');

      // Refresh users list if modal is open
      if (showUsersModal && selectedUnit?.id === unitId) {
        const response = await unitsAPI.getUnitUsers(unitId);
        const users = response.data.data.users || [];

        // Use consistent user data mapping
        const transformedUsers = users.map(user => ({
          ...user,
          id: user.user_id, // Use the actual user ID from unit_users.user_id
          relationship: user.relationship || 'owner',
          name: user.name,
          email: user.email,
          profile_picture_url: user.profile_picture_url
        }));

        console.log('Updated unit users after removal:', transformedUsers);
        setUnitUsers(transformedUsers);
      }

      // Refresh units list
      fetchUnits();
    } catch (error) {
      console.error('Error removing user from unit:', error);
      toast.error(error.response?.data?.message || 'Failed to remove user from unit');
    }
  };

  const filteredUnits = units.filter(unit =>
    unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'fully_paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'no_services': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Unpaid';
      case 'no_services': return 'No Services';
      default: return status;
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
                        {unit.owner_count || 0} residents
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(unit.payment_status)}`}>
                      {getPaymentStatusText(unit.payment_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(unit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewUsers(unit)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View residents"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUnit(unit);
                          setShowEditModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit unit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete unit"
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
      </div>

      {/* Create Unit Modal */}
      {showCreateModal && (
        <CreateUnitModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUnit}
        />
      )}

      {/* Edit Unit Modal */}
      {showEditModal && selectedUnit && (
        <EditUnitModal
          unit={selectedUnit}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUnit(null);
          }}
          onSubmit={handleUpdateUnit}
        />
      )}

      {/* Users Modal */}
      {showUsersModal && selectedUnit && (
        <UsersModal
          unit={selectedUnit}
          users={unitUsers}
          loading={loadingUsers}
          onClose={() => {
            setShowUsersModal(false);
            setSelectedUnit(null);
            setUnitUsers([]);
          }}
          onRemoveUser={handleRemoveUser}
        />
      )}
    </div>
  );
};
export default UnitsManagement;