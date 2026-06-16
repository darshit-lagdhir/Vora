import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import PageWrapper from './components/layout/PageWrapper.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ToastContainer from './components/ui/Toast.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

import { 
  DiscoverySkeleton, 
  DashboardSkeleton, 
  EventDetailSkeleton, 
  GeneralPageSkeleton 
} from './components/ui/Skeleton.jsx';

const withSuspense = (LazyComponent, Fallback) => {
  return (props) => (
    <Suspense fallback={<Fallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// ─── Route-Based Lazy Loading (Code Splitting) ──────────────────────────────
const Landing = withSuspense(lazy(() => import('./pages/Landing.jsx')), GeneralPageSkeleton);
const Auth = withSuspense(lazy(() => import('./pages/auth/Auth.jsx')), GeneralPageSkeleton);
const Onboarding = withSuspense(lazy(() => import('./pages/Onboarding.jsx')), GeneralPageSkeleton);
const Organizer = lazy(() => import('./pages/Organizer.jsx')); // Layout container
const Dashboard = withSuspense(lazy(() => import('./pages/organizer/Dashboard.jsx')), DashboardSkeleton);
const Events = withSuspense(lazy(() => import('./pages/organizer/Events.jsx')), GeneralPageSkeleton);
const Attendees = withSuspense(lazy(() => import('./pages/organizer/Attendees.jsx')), GeneralPageSkeleton);
const Resources = withSuspense(lazy(() => import('./pages/organizer/Resources.jsx')), GeneralPageSkeleton);
const CreateEvent = withSuspense(lazy(() => import('./pages/organizer/CreateEvent.jsx')), GeneralPageSkeleton);
const EventDashboard = withSuspense(lazy(() => import('./pages/organizer/EventDashboard.jsx')), DashboardSkeleton);
const Financials = withSuspense(lazy(() => import('./pages/organizer/Financials.jsx')), DashboardSkeleton);
const FinancialSettings = withSuspense(lazy(() => import('./pages/organizer/FinancialSettings.jsx')), GeneralPageSkeleton);
const Attendee = withSuspense(lazy(() => import('./pages/Attendee.jsx')), GeneralPageSkeleton);
const AttendeeDashboard = withSuspense(lazy(() => import('./pages/attendee/Dashboard.jsx')), DiscoverySkeleton);
const TicketWallet = withSuspense(lazy(() => import('./pages/attendee/TicketWallet.jsx')), GeneralPageSkeleton);
const CheckoutFunnel = withSuspense(lazy(() => import('./pages/attendee/CheckoutFunnel.jsx')), GeneralPageSkeleton);
const LiveDashboard = withSuspense(lazy(() => import('./pages/organizer/LiveDashboard.jsx')), GeneralPageSkeleton);
const EventDetail = withSuspense(lazy(() => import('./pages/public/EventDetail.jsx')), EventDetailSkeleton);
const LiveGateway = withSuspense(lazy(() => import('./pages/attendee/LiveGateway.jsx')), GeneralPageSkeleton);
const ResourceVault = withSuspense(lazy(() => import('./pages/shared/ResourceVault.jsx')), GeneralPageSkeleton);
const Settings = withSuspense(lazy(() => import('./pages/shared/Settings.jsx')), GeneralPageSkeleton);
const Communications = withSuspense(lazy(() => import('./pages/organizer/Communications.jsx')), GeneralPageSkeleton);
const SecurityPosture = withSuspense(lazy(() => import('./pages/organizer/SecurityPosture.jsx')), GeneralPageSkeleton);
const NotFound = withSuspense(lazy(() => import('./pages/NotFound.jsx')), GeneralPageSkeleton);

// ─── Suspense Fallback: Minimal Loading Spinner ─────────────────────────────
const PageLoader = () => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-background-root">
    <div className="flex flex-col items-center space-y-4">
      <svg
        className="animate-spin h-8 w-8 text-primary-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
        Loading Module...
      </span>
    </div>
  </div>
);

/**
 * Root Application router console shell.
 * Maps URL routing states to macro-level view page containers.
 * The application chassis is applied globally by wrapping routes inside Layout.
 */
function AppContent() {
  const location = useLocation();

  return (
    <Layout>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
            <Route path="/event/:id" element={<PageWrapper><ErrorBoundary><EventDetail /></ErrorBoundary></PageWrapper>} />
            <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
            <Route path="/onboarding" element={<PageWrapper><Onboarding /></PageWrapper>} />

            {/* Attendee Hub Routes */}
            <Route 
              path="/attendee" 
              element={
                <ProtectedRoute allowedRoles={['ATTENDEE']}>
                  <PageWrapper><ErrorBoundary><AttendeeDashboard /></ErrorBoundary></PageWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendee/:id" 
              element={
                <ProtectedRoute allowedRoles={['ATTENDEE']}>
                  <PageWrapper><Attendee /></PageWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendee/wallet" 
              element={
                <ProtectedRoute allowedRoles={['ATTENDEE']}>
                  <PageWrapper><TicketWallet /></PageWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/event/:id/live" 
              element={
                <ProtectedRoute allowedRoles={['ATTENDEE']}>
                  <PageWrapper><ErrorBoundary><LiveGateway /></ErrorBoundary></PageWrapper>
                </ProtectedRoute>
              } 
            />
            <Route path="/checkout/:id" element={<PageWrapper><CheckoutFunnel /></PageWrapper>} />

            {/* Secured Organizer Dashboard Panel Layout */}
            <Route 
              path="/organizer" 
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER']}>
                  <Organizer />
                </ProtectedRoute>
              }
            >
              <Route index element={<PageWrapper><ErrorBoundary><Dashboard /></ErrorBoundary></PageWrapper>} />
              <Route path="dashboard" element={<PageWrapper><ErrorBoundary><Dashboard /></ErrorBoundary></PageWrapper>} />
              <Route path="events" element={<PageWrapper><Events /></PageWrapper>} />
              <Route path="events/schedule/:id" element={<PageWrapper><Events /></PageWrapper>} />
              <Route path="events/:id" element={<PageWrapper><EventDashboard /></PageWrapper>} />
              <Route path="attendees" element={<PageWrapper><Attendees /></PageWrapper>} />
              <Route path="resources" element={<PageWrapper><Resources /></PageWrapper>} />
              <Route path="financials" element={<PageWrapper><Financials /></PageWrapper>} />
              <Route path="financials/settings" element={<PageWrapper><FinancialSettings /></PageWrapper>} />
              <Route path="live" element={<PageWrapper><LiveDashboard /></PageWrapper>} />
              <Route path="communications" element={<PageWrapper><ErrorBoundary><Communications /></ErrorBoundary></PageWrapper>} />
              <Route path="security" element={<PageWrapper><ErrorBoundary><SecurityPosture /></ErrorBoundary></PageWrapper>} />
            </Route>

            {/* Focus Mode Event Creation Stepper (layout-isolated) */}
            <Route 
              path="/organizer/events/create" 
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER']}>
                  <PageWrapper><CreateEvent /></PageWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Shared Route accessible by both Attendee and Organizer (JWT authenticated) */}
            <Route 
              path="/event/:eventId/vault" 
              element={
                <ProtectedRoute>
                  <PageWrapper><ErrorBoundary><ResourceVault /></ErrorBoundary></PageWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/events/:eventId/vault" 
              element={
                <ProtectedRoute>
                  <PageWrapper><ErrorBoundary><ResourceVault /></ErrorBoundary></PageWrapper>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <PageWrapper><ErrorBoundary><Settings /></ErrorBoundary></PageWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Catch-all Wildcard Route Interception */}
            <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}

function App() {
  React.useEffect(() => {
    const preloader = document.getElementById('vora-preload-screen');
    if (preloader) {
      preloader.style.transition = 'opacity 0.4s ease';
      preloader.style.opacity = '0';
      const timer = setTimeout(() => {
        preloader.remove();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
