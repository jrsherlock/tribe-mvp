import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import AdminDashboard from './components/admin/AdminDashboard';
import { AdminTreeView } from './components/admin/AdminTreeView';
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
import AcceptInvite from './components/AcceptInvite';
import TribePage from './components/tribe/TribePage';
import { useAuth } from './hooks/useAuth';
// import { AuthDebugPanel } from './components/AuthDebugPanel';
import DevModePanel from './components/DevModePanel';
import { useUserStreaks } from './hooks/useUserStreaks';

// Wrapper component for PublicProfile to handle route params
function PublicProfileWrapper() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  if (!userId) {
    return <Navigate to="/" replace />;
  }

  return <PublicProfile userId={userId} onClose={() => navigate(-1)} />;
}

function App() {
  const { user, loading } = useAuth();
  const { recordActivity } = useUserStreaks();

  // Record user activity when they load the app (engagement streak)
  useEffect(() => {
    if (user && !loading) {
      recordActivity();
    }
  }, [user, loading, recordActivity]);

  return (
    <Router>
      {/* Auth Debug Panel - only visible in development */}
      {/* <AuthDebugPanel /> */}

      {/* Dev Mode Panel - diagnostic info for authenticated users */}
      <DevModePanel />

      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <Routes>
          {/* Public routes when not authenticated */}
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<Welcome />} />
        </Routes>
      ) : (
        <Routes>
          {/* Public route - no layout needed */}
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Protected routes with layout */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/profile/:userId" element={<PublicProfileWrapper />} />
                <Route path="/checkin" element={<DailyCheckin />} />
                <Route path="/mytribe" element={<SanghaFeed />} />
                <Route path="/albums" element={<PhotoAlbums />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/tenant/setup" element={<TenantSetup />} />
                <Route path="/groups" element={<GroupsManager />} />
                <Route path="/tribe/:groupId" element={<TribePage />} />
                <Route path="/admin" element={<Navigate to="/admin/tree" replace />} />
                <Route path="/admin/tree" element={<AdminTreeView />} />
                <Route path="/admin/legacy" element={<AdminDashboard />} />
                <Route path="/test-ux" element={<UXTestComponent />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      )}
    </Router>
  );
}

export default App;
