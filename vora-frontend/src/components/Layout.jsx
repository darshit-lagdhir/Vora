import React from 'react';
import { useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette.jsx';

/**
 * Master layout shell for the entire application.
 * Establishes a responsive flex-column chassis and centers the content
 * with a maximum layout boundary suitable for large desktop displays.
 */
export default function Layout({ children }) {
  const location = useLocation();
  const isCheckout = location.pathname.startsWith('/checkout/');
  const isLiveStage = location.pathname.endsWith('/live');
  const isOrganizer = location.pathname.startsWith('/organizer');

  if (isLiveStage || isCheckout) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-white antialiased">
        <div className="flex-grow w-full flex flex-col">
          {children}
        </div>
        <CommandPalette />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-root text-white antialiased">
      <main className={`flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col ${isOrganizer ? '' : 'pt-24'}`}>
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
