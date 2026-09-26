import React from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { TestModeProvider, useTestMode } from "@/components/TestModeProvider";
import { clearAllTestStores } from "@/lib/testStore";
import { clearTestProfile } from "@/lib/testProfile";
import { cn } from "@/lib/utils";

// Tenant pages
import TenantLayout from "@/components/TenantLayout";
import TenantDashboard from "@/pages/tenant/TenantDashboard";
import BrowseUnits from "@/pages/tenant/BrowseUnits";
import BrowseListings from "@/pages/tenant/BrowseListings";
import ListingDetail from "@/pages/tenant/ListingDetail";
import MyApplications from "@/pages/tenant/MyApplications";
import MyProperties from "@/pages/tenant/MyProperties";
import MyTenancy from "@/pages/tenant/MyTenancy";
import MyRent from "@/pages/tenant/MyRent";
import MyMaintenance from "@/pages/tenant/MyMaintenance";
import MyInspections from "@/pages/tenant/MyInspections";
import MyNotices from "@/pages/tenant/MyNotices";
import MyDocuments from "@/pages/tenant/MyDocuments";
import MyFeedback from "@/pages/tenant/MyFeedback";
import MyVacation from "@/pages/tenant/MyVacation";
import MyProfile from "@/pages/tenant/MyProfile";

// Landlord pages
import Layout from "@/components/Layout";
import Dashboard from "@/pages/landlord/Dashboard";
import Properties from "@/pages/landlord/Properties";
import PropertyDetail from "@/pages/landlord/PropertyDetail";
import Units from "@/pages/landlord/Units";
import Tenants from "@/pages/landlord/Tenants";
import Applications from "@/pages/landlord/Applications";
import Tenancies from "@/pages/landlord/Tenancies";
import RentPayments from "@/pages/landlord/RentPayments";
import Arrears from "@/pages/landlord/Arrears";
import Maintenance from "@/pages/landlord/Maintenance";
import Inspections from "@/pages/landlord/Inspections";
import Notices from "@/pages/landlord/Notices";
import Documents from "@/pages/landlord/Documents";
import Expenses from "@/pages/landlord/Expenses";
import Contractors from "@/pages/landlord/Contractors";
import Reports from "@/pages/landlord/Reports";
import PropertyComparison from "@/pages/landlord/PropertyComparison";
import Notifications from "@/pages/landlord/Notifications";
import StaffPermissions from "@/pages/landlord/StaffPermissions";
import Settings from "@/pages/landlord/Settings";
import Feedback from "@/pages/landlord/Feedback";
import VacationRequests from "@/pages/landlord/VacationRequests";
import Listings from "@/pages/landlord/Listings";
import Sales from "@/pages/landlord/Sales";
import Leases from "@/pages/landlord/Leases";

function TestBar() {
  const { role, setRole, resetData } = useTestMode();
  const exit = () => {
    clearAllTestStores();
    clearTestProfile();
    window.location.href = "/login";
  };
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm text-amber-950 shadow-md">
      <span className="font-medium">⚠️ Test Mode — randomized sample data, nothing here is saved</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium opacity-80">Testing as:</span>
        <button onClick={() => setRole("tenant")} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", role === "tenant" ? "bg-amber-950 text-amber-50" : "bg-amber-100 hover:bg-amber-200")}>Tenant</button>
        <button onClick={() => setRole("landlord")} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", role === "landlord" ? "bg-amber-950 text-amber-50" : "bg-amber-100 hover:bg-amber-200")}>Landlord</button>
        <button onClick={resetData} className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium hover:bg-amber-200">↻ Reset Data</button>
        <button onClick={exit} className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium hover:bg-amber-200">Exit</button>
      </div>
    </div>
  );
}

function TenantRouter() {
  return (
    <MemoryRouter key="tenant" initialEntries={["/portal"]}>
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
    </MemoryRouter>
  );
}

function LandlordRouter() {
  return (
    <MemoryRouter key="landlord" initialEntries={["/"]}>
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
    </MemoryRouter>
  );
}

function TestModeContent() {
  const { role } = useTestMode();
  return (
    <div className="min-h-screen bg-slate-50">
      <TestBar />
      {role === "tenant" ? <TenantRouter /> : <LandlordRouter />}
    </div>
  );
}

export default function TestProfileApp() {
  return (
    <TestModeProvider>
      <TestModeContent />
    </TestModeProvider>
  );
}