import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';

// Import all dashboard pages
import DashboardHome from '../pages/DashboardHome';
import UnitsManagement from '../pages/UnitsManagement';
import UsersManagement from '../pages/UsersManagement';
import PaymentsManagement from '../pages/PaymentsManagement';
import PersonnelManagement from '../pages/PersonnelManagement';
import SeasonsManagement from '../pages/SeasonsManagement';
import NewsManagement from '../pages/NewsManagement';
import ServicesManagement from '../pages/ServicesManagement';
import QRCodesManagement from '../pages/QRCodesManagement';
import FeedbackManagement from '../pages/FeedbackManagement';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

const Dashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/units" element={<UnitsManagement />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/payments" element={<PaymentsManagement />} />
        <Route path="/personnel" element={<PersonnelManagement />} />
        <Route path="/seasons" element={<SeasonsManagement />} />
        <Route path="/news" element={<NewsManagement />} />
        <Route path="/services" element={<ServicesManagement />} />
        <Route path="/qr-codes" element={<QRCodesManagement />} />
        <Route path="/feedback" element={<FeedbackManagement />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default Dashboard;