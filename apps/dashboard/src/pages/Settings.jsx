import React, { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Bell, Shield, Clock, Globe } from 'lucide-react';
import { managementAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultSettings = {
    compound_name: { value: '', type: 'string', description: 'Compound name' },
    compound_timezone: { value: 'UTC', type: 'string', description: 'Compound timezone' },
    qr_code_expiry_hours: { value: 24, type: 'number', description: 'Default QR code expiry in hours' },
    visitor_qr_max_duration: { value: 168, type: 'number', description: 'Maximum visitor QR duration in hours (7 days)' },
    personnel_invite_expiry_hours: { value: 72, type: 'number', description: 'Personnel invite expiry in hours' },
    enable_notifications: { value: true, type: 'boolean', description: 'Enable push notifications' },
    enable_email_alerts: { value: true, type: 'boolean', description: 'Enable email alerts' },
    auto_expire_qr_codes: { value: true, type: 'boolean', description: 'Automatically expire QR codes' },
    require_vehicle_plate: { value: false, type: 'boolean', description: 'Require vehicle plate for visitor QR codes' },
    max_visitors_per_qr: { value: 5, type: 'number', description: 'Maximum visitors per QR code' },
    season_end_warning_days: { value: 30, type: 'number', description: 'Days before season end to show warning' },
    backup_frequency: { value: 'daily', type: 'string', description: 'Database backup frequency' },
    log_retention_days: { value: 90, type: 'number', description: 'Log retention period in days' }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await managementAPI.getSettings();
      const fetchedSettings = response.data.data;
      
      // Merge with defaults
      const mergedSettings = { ...defaultSettings };
      Object.keys(fetchedSettings).forEach(key => {
        if (mergedSettings[key]) {
          mergedSettings[key] = fetchedSettings[key];
        }
      });
      
      setSettings(mergedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default settings if fetch fails
      setSettings(defaultSettings);
      toast.error('Failed to fetch settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await managementAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: value
      }
    }));
  };

  const renderSettingInput = (key, setting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleInputChange(key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {setting.description}
            </label>
          </div>
        );
      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {setting.description}
            </label>
            <input
              type="number"
              value={setting.value}
              onChange={(e) => handleInputChange(key, parseInt(e.target.value) || 0)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
      case 'string':
        if (key === 'backup_frequency') {
          return (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {setting.description}
              </label>
              <select
                value={setting.value}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          );
        }
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {setting.description}
            </label>
            <input
              type="text"
              value={setting.value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  const settingCategories = {
    general: {
      title: 'General Settings',
      icon: SettingsIcon,
      settings: ['compound_name', 'compound_timezone']
    },
    qr_codes: {
      title: 'QR Code Settings',
      icon: Globe,
      settings: ['qr_code_expiry_hours', 'visitor_qr_max_duration', 'auto_expire_qr_codes', 'require_vehicle_plate', 'max_visitors_per_qr']
    },
    notifications: {
      title: 'Notifications',
      icon: Bell,
      settings: ['enable_notifications', 'enable_email_alerts']
    },
    security: {
      title: 'Security & Personnel',
      icon: Shield,
      settings: ['personnel_invite_expiry_hours', 'season_end_warning_days']
    },
    system: {
      title: 'System Settings',
      icon: Clock,
      settings: ['backup_frequency', 'log_retention_days']
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure system settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(settingCategories).map(([categoryKey, category]) => (
          <div key={categoryKey} className="card p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <category.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">{category.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {category.settings.map(settingKey => (
                <div key={settingKey}>
                  {renderSettingInput(settingKey, settings[settingKey] || defaultSettings[settingKey])}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* System Information */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Version:</span>
            <span className="ml-2 text-gray-600">1.0.0</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Environment:</span>
            <span className="ml-2 text-gray-600">Production</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;