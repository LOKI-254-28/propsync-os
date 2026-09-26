import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import AdminLayout from '@/components/AdminLayout';
import TenantLayout from '@/components/TenantLayout';
import GuestLayout from '@/components/GuestLayout';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Landlord pages
import Dashboard from '@/pages/landlord/Dashboard';
import Properties from '@/pages/landlord/Properties';
import PropertyDetail from '@/pages/landlord/PropertyDetail';
import Units from '@/pages/landlord/Units';
import Tenants from '@/pages/landlord/Tenants';
import Applications from '@/pages/landlord/Applications';
import Tenancies from '@/pages/landlord/Tenancies';
import RentPayments from '@/pages/landlord/RentPayments';
import Arrears from '@/pages/landlord/Arrears';
import Maintenance from '@/pages/landlord/Maintenance';
import Inspections from '@/pages/landlord/Inspections';
import Notices from '@/pages/landlord/Notices';
import Documents from '@/pages/landlord/Documents';
import Expenses from '@/pages/landlord/Expenses';
import Contractors from '@/pages/landlord/Contractors';
import Reports from '@/pages/landlord/Reports';
import PropertyComparison from '@/pages/landlord/PropertyComparison';
import Notifications from '@/pages/landlord/Notifications';
import StaffPermissions from '@/pages/landlord/StaffPermissions';
import Settings from '@/pages/landlord/Settings';
import Feedback from '@/pages/landlord/Feedback';
import VacationRequests from '@/pages/landlord/VacationRequests';
import Listings from '@/pages/landlord/Listings';
import Sales from '@/pages/landlord/Sales';
import Leases from '@/pages/landlord/Leases';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagement from '@/pages/admin/UserManagement';

// Tenant pages
import TenantDashboard from '@/pages/tenant/TenantDashboard';
import BrowseUnits from '@/pages/tenant/BrowseUnits';
import MyApplications from '@/pages/tenant/MyApplications';
import BrowseListings from '@/pages/tenant/BrowseListings';
import ListingDetail from '@/pages/tenant/ListingDetail';
import MyProperties from '@/pages/tenant/MyProperties';
import MyTenancy from '@/pages/tenant/MyTenancy';
import MyRent from '@/pages/tenant/MyRent';
import MyMaintenance from '@/pages/tenant/MyMaintenance';
import MyInspections from '@/pages/tenant/MyInspections';
import MyNotices from '@/pages/tenant/MyNotices';
import MyDocuments from '@/pages/tenant/MyDocuments';
import MyFeedback from '@/pages/tenant/MyFeedback';
import MyVacation from '@/pages/tenant/MyVacation';
import MyProfile from '@/pages/tenant/MyProfile';

// Guest pages
import GuestDashboard from '@/pages/guest/GuestDashboard';
import GuestProfile from '@/pages/guest/GuestProfile';
import GuestExplore from '@/pages/guest/GuestExplore';
import GuestApplications from '@/pages/guest/GuestApplications';
import GuestNotifications from '@/pages/guest/GuestNotifications';

// Public pages
import HowItWorks from '@/pages/HowItWorks';

const LandlordRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/units" element={<Units />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/tenancies" element={<Tenancies />} />
      <Route path="/rent" element={<RentPayments />} />
      <Route path="/arrears" element={<Arrears />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/inspections" element={<Inspections />} />
      <Route path="/notices" element={<Notices />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/contractors" element={<Contractors />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/comparison" element={<PropertyComparison />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/staff" element={<StaffPermissions />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/vacation-requests" element={<VacationRequests />} />
      <Route path="/listings" element={<Listings />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/leases" element={<Leases />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>
);

const AdminRoutes = () => (
  <AdminLayout>
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/units" element={<Units />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/tenancies" element={<Tenancies />} />
      <Route path="/rent" element={<RentPayments />} />
      <Route path="/arrears" element={<Arrears />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/inspections" element={<Inspections />} />
      <Route path="/notices" element={<Notices />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/contractors" element={<Contractors />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/comparison" element={<PropertyComparison />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/staff" element={<StaffPermissions />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/vacation-requests" element={<VacationRequests />} />
      <Route path="/listings" element={<Listings />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/leases" element={<Leases />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AdminLayout>
);

const TenantRoutes = () => (
  <TenantLayout>
    <Routes>
      <Route path="/portal" element={<TenantDashboard />} />
      <Route path="/portal/units" element={<BrowseUnits />} />
      <Route path="/portal/listings" element={<BrowseListings />} />
      <Route path="/portal/listings/:id" element={<ListingDetail />} />
      <Route path="/portal/applications" element={<MyApplications />} />
      <Route path="/portal/my-properties" element={<MyProperties />} />
      <Route path="/portal/tenancy" element={<MyTenancy />} />
      <Route path="/portal/rent" element={<MyRent />} />
      <Route path="/portal/maintenance" element={<MyMaintenance />} />
      <Route path="/portal/inspections" element={<MyInspections />} />
      <Route path="/portal/notices" element={<MyNotices />} />
      <Route path="/portal/documents" element={<MyDocuments />} />
      <Route path="/portal/feedback" element={<MyFeedback />} />
      <Route path="/portal/vacation" element={<MyVacation />} />
      <Route path="/portal/profile" element={<MyProfile />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  </TenantLayout>
);

const GuestRoutes = () => (
  <GuestLayout>
    <Routes>
      <Route path="/guest" element={<GuestDashboard />} />
      <Route path="/guest/explore" element={<GuestExplore />} />
      <Route path="/guest/applications" element={<GuestApplications />} />
      <Route path="/guest/profile" element={<GuestProfile />} />
      <Route path="/guest/notifications" element={<GuestNotifications />} />
      <Route path="*" element={<Navigate to="/guest" replace />} />
    </Routes>
  </GuestLayout>
);

const TestProfileRoutes = () => (
  <GuestLayout>
    <Routes>
      <Route path="/test-profile" element={<GuestDashboard />} />
      <Route path="/test-profile/explore" element={<GuestExplore />} />
      <Route path="/test-profile/applications" element={<GuestApplications />} />
      <Route path="/test-profile/profile" element={<GuestProfile />} />
      <Route path="/test-profile/notifications" element={<GuestNotifications />} />
      <Route path="*" element={<Navigate to="/test-profile" replace />} />
    </Routes>
  </GuestLayout>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const isAdmin = user?.account_type === 'admin' || (!user?.account_type && user?.role === 'admin');
  const isLandlord = user?.account_type === 'landowner';
  const isGuest = user?.account_type === 'guest';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/test-profile/*" element={<TestProfileRoutes />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/admin" element={isAdmin ? <AdminLayout><AdminDashboard /></AdminLayout> : <Navigate to={isLandlord ? "/" : isGuest ? "/guest" : "/portal"} replace />} />
        <Route path="/*" element={isAdmin ? <AdminRoutes /> : isLandlord ? <LandlordRoutes /> : isGuest ? <GuestRoutes /> : <TenantRoutes />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App