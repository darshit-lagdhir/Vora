import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SecureLockdown from './ui/SecureLockdown.jsx';

/**
 * Route protection gate for Vora panels.
 * Restricts access based on user session status and platform roles (RBAC).
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      }
    }
  }, [user, isLoading, navigate]);

  // Render minimal loading state during hydration check
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
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
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Verifying Session Identity...
          </span>
        </div>
      </div>
    );
  }

  // Prevent layout flashes while redirect triggers execute
  if (!user) {
    return null;
  }

  if (allowedRoles) {
    const userRoleNormalized = (user.role || user.platform_role || '').toLowerCase();
    const hasRole = allowedRoles.some(
      (role) => role.toLowerCase() === userRoleNormalized
    );
    if (!hasRole) {
      return (
        <SecureLockdown
          userRole={user.role || user.platform_role}
          email={user.email}
          userId={user.id}
        />
      );
    }
  }

  return children;
}
