import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  QrCode,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { managementAPI, feedbackAPI, qrCodesAPI, healthAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center mt-1">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RecentActivity = ({ activities }) => (
  <div className="card p-6">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${activity.type === 'success' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            {activity.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{activity.message}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [feedbackStats, setFeedbackStats] = useState({});
  const [qrStats, setQrStats] = useState({});

  // Mock data for demonstration
  const mockStats = {
    total_units: 45,
    total_users: 128,
    active_visitors: 12,
    pending_payments: 8,
    total_revenue: 125000,
    payment_compliance: 85,
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('DashboardHome: Starting to fetch dashboard data');

      // First, check API health
      try {
        await healthAPI.check();
        console.log('DashboardHome: API health check passed');
      } catch (healthError) {
        console.warn('DashboardHome: API health check failed:', healthError.message);
        toast.error('API server is not responding. Using demo data.');
        // Continue with mock data
        setStats(mockStats);
        setFeedbackStats({ total: 15, pending: 3, resolved: 12 });
        setQrStats({ active: 25, expired: 8, total: 33 });
        setLoading(false);
        return;
      }

      // Use Promise.allSettled to handle API failures gracefully
      const [dashboardResponse, feedbackResponse, qrResponse] = await Promise.allSettled([
        managementAPI.getDashboardStats().catch(err => {
          console.warn('Dashboard stats API not available:', err.message);
          return { data: null };
        }),
        feedbackAPI.getFeedbackStats().catch(err => {
          console.warn('Feedback stats API not available:', err.message);
          return { data: null };
        }),
        qrCodesAPI.getQRStats().catch(err => {
          console.warn('QR stats API not available:', err.message);
          return { data: null };
        }),
      ]);

      console.log('DashboardHome: API responses received', {
        dashboard: dashboardResponse.status,
        feedback: feedbackResponse.status,
        qr: qrResponse.status
      });

      // Handle successful responses or use mock data
      if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value?.data) {
        console.log('DashboardHome: Using real dashboard stats');
        setStats(dashboardResponse.value.data);
      } else {
        console.log('DashboardHome: Using mock dashboard stats');
        setStats(mockStats);
      }

      if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value?.data) {
        console.log('DashboardHome: Using real feedback stats');
        setFeedbackStats(feedbackResponse.value.data);
      } else {
        console.log('DashboardHome: Using mock feedback stats');
        setFeedbackStats({ total: 15, pending: 3, resolved: 12 });
      }

      if (qrResponse.status === 'fulfilled' && qrResponse.value?.data) {
        console.log('DashboardHome: Using real QR stats');
        setQrStats(qrResponse.value.data);
      } else {
        console.log('DashboardHome: Using mock QR stats');
        setQrStats({ active: 25, expired: 8, total: 33 });
      }

      console.log('DashboardHome: Dashboard data loaded successfully');

    } catch (error) {
      console.error('DashboardHome: Error fetching dashboard data:', error);
      // Use mock data as fallback
      setStats(mockStats);
      setFeedbackStats({ total: 15, pending: 3, resolved: 12 });
      setQrStats({ active: 25, expired: 8, total: 33 });
      toast.error('Using demo data - API server may be unavailable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const mockActivities = [
    {
      type: 'success',
      message: 'New user registered for Unit 12A',
      time: '2 minutes ago',
    },
    {
      type: 'warning',
      message: 'Payment overdue for Unit 5B',
      time: '1 hour ago',
    },
    {
      type: 'success',
      message: 'QR code validated at main gate',
      time: '2 hours ago',
    },
    {
      type: 'success',
      message: 'Season 2024 created successfully',
      time: '1 day ago',
    },
  ];

  const displayStats = stats || mockStats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's what's happening in your compound today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Units"
          value={displayStats.total_units || 0}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Users"
          value={displayStats.total_users || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Active Visitors"
          value={displayStats.active_visitors || 0}
          icon={QrCode}
          color="purple"
        />
        <StatCard
          title="Pending Payments"
          value={displayStats.pending_payments || 0}
          icon={CreditCard}
          color="red"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${(displayStats.total_revenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+12% from last month"
          color="green"
        />
        <StatCard
          title="Payment Compliance"
          value={`${displayStats.payment_compliance || 0}%`}
          icon={CheckCircle}
          trend="up"
          trendValue="+5% from last month"
          color="blue"
        />
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={mockActivities} />
        
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-primary py-3 text-left">
              <Building2 className="h-5 w-5 inline mr-2" />
              Add New Unit
            </button>
            <button className="w-full btn-secondary py-3 text-left">
              <Users className="h-5 w-5 inline mr-2" />
              Invite Personnel
            </button>
            <button className="w-full btn-secondary py-3 text-left">
              <FileText className="h-5 w-5 inline mr-2" />
              Create News Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;