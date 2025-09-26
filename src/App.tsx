
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminDashboard from './components/admin/AdminDashboard';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import PublicProfile from './components/PublicProfile';
import DailyCheckin from './components/DailyCheckin';
import SanghaFeed from './components/SanghaFeed';
import PhotoAlbums from './components/PhotoAlbums';
import Analytics from './components/Analytics';
import Welcome from './components/Welcome';
import UXTestComponent from './components/UXTestComponent';
import TenantSetup from './components/TenantSetup';
import GroupsManager from './components/GroupsManager';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Welcome />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="/checkin" element={<DailyCheckin />} />
          <Route path="/sangha" element={<SanghaFeed />} />
          <Route path="/albums" element={<PhotoAlbums />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tenant/setup" element={<TenantSetup />} />
          <Route path="/groups" element={<GroupsManager />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/test-ux" element={<UXTestComponent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
