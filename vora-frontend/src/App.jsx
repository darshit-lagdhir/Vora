import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';

// ─── Route-Based Lazy Loading (Code Splitting) ──────────────────────────────
// Each page component is dynamically imported only when the user navigates
// to its route, producing smaller initial bundle sizes and faster first paint.
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Auth = lazy(() => import('./pages/Auth.jsx'));
const Organizer = lazy(() => import('./pages/Organizer.jsx'));
const Dashboard = lazy(() => import('./pages/organizer/Dashboard.jsx'));
const Events = lazy(() => import('./pages/organizer/Events.jsx'));
const Attendees = lazy(() => import('./pages/organizer/Attendees.jsx'));
const Resources = lazy(() => import('./pages/organizer/Resources.jsx'));
const Attendee = lazy(() => import('./pages/Attendee.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// ─── Suspense Fallback: Minimal Loading Spinner ─────────────────────────────
const PageLoader = () => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-brand-dark">
    <div className="flex flex-col items-center space-y-4">
      <svg
        className="animate-spin h-8 w-8 text-accent-violet"
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
      <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
        Loading Module...
      </span>
    </div>
  </div>
);

/**
 * Root Application router console shell.
 * Maps URL routing states to macro-level view page containers.
 * All route components are lazy-loaded for optimal bundle splitting.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Landing View */}
            <Route path="/" element={<Landing />} />

            {/* Authentication Gateway */}
            <Route path="/auth" element={<Auth />} />

            {/* Secured Organizer Dashboard Panel Layout */}
            <Route path="/organizer" element={<Organizer />}>
              <Route index element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="attendees" element={<Attendees />} />
              <Route path="resources" element={<Resources />} />
            </Route>

            {/* Secured Attendee Explorer Hub */}
            <Route path="/attendee" element={<Attendee />} />

            {/* Catch-all Wildcard Route Interception */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
