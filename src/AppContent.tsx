import React, { Suspense, useEffect, useState } from 'react';
import { useLite } from './contexts/LiteContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

const LazyToaster = React.lazy(() =>
  import('react-hot-toast').then((module) => ({ default: module.Toaster }))
);

export default function AppContent() {
  const { sidebarCollapsed, currentUser } = useLite();
  const [showToaster, setShowToaster] = useState(false);

  useEffect(() => {
    const load = () => setShowToaster(true);
    const requestIdle = window.requestIdleCallback;
    const cancelIdle = window.cancelIdleCallback;

    if (typeof requestIdle === 'function' && typeof cancelIdle === 'function') {
      const idleId = requestIdle(load, { timeout: 2000 });
      return () => cancelIdle(idleId);
    }

    const timer = globalThis.setTimeout(load, 1200);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const prefetchRoutes = () => {
      void import('./pages/UserProfile');
    };

    const requestIdle = window.requestIdleCallback;
    const cancelIdle = window.cancelIdleCallback;

    if (typeof requestIdle === 'function' && typeof cancelIdle === 'function') {
      const idleId = requestIdle(prefetchRoutes, { timeout: 2500 });
      return () => cancelIdle(idleId);
    }

    const timer = globalThis.setTimeout(prefetchRoutes, 1800);
    return () => globalThis.clearTimeout(timer);
  }, [currentUser]);
  
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
    if (!isElectron) return;

    const checkUpdatesSilently = async () => {
      try {
        let currentVersion = '1.4.11';
        if (window.electronAPI?.lite?.health) {
          const health = await window.electronAPI.lite.health();
          currentVersion = health.appVersion || currentVersion;
        }

        const response = await fetch('https://dreambees-alchemist.firebaseapp.com/downloads/manifest.json?cb=' + Date.now());
        if (!response.ok) return;

        const manifest = await response.json();
        if (manifest.version && manifest.version !== currentVersion) {
          const { default: toast } = await import('./utils/lazyToast');
          toast.success(
            `Update available: v${manifest.version}! Please download the latest installer from our web portal.`,
            { duration: 10000, id: 'electron-update-notifier' }
          );
        }
      } catch (err) {
        console.warn('[Update Check] Silent check failed:', err);
      }
    };

    const timer = setTimeout(checkUpdatesSilently, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <main className="app-main">
        <AnimatedRoutes />
      </main>
      <BottomNav />
      {showToaster ? (
        <Suspense fallback={null}>
          <LazyToaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(24, 24, 27, 0.8)',
                backdropFilter: 'blur(20px)',
                color: '#fff',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 24px',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                maxWidth: '400px',
              },
              success: {
                iconTheme: {
                  primary: '#8b5cf6',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
