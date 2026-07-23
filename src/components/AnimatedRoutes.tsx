import React, { Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import RouteErrorBoundary from './RouteError';
import { lazyRetry } from '../lite-utils';
import { ModelHub } from './ModelHub';
import { StudioCanvas } from './StudioCanvas';
import { GalleryView } from './GalleryView';
import './AnimatedRoutes.css';

const UserProfile = lazyRetry(() => import('../pages/UserProfile'));
const GenerationDetail = lazyRetry(() => import('../pages/GenerationDetail'));
const NotFound = lazyRetry(() => import('../pages/NotFound'));

const PageLoader = () => (
  <div className="page-route-loader">
    <div className="lite-loader-brand font-bold text-indigo-400 text-xl tracking-wider">DREAMBEES MLX</div>
    <div className="shimmer-container">
      <div className="shimmer-bar" />
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div className="page-wrapper" key={location.pathname}>
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<StudioCanvas />} />
            <Route path="/studio" element={<StudioCanvas />} />
            <Route path="/gallery" element={<GalleryView />} />
            <Route path="/models" element={<ModelHub />} />
            <Route path="/generate" element={<StudioCanvas />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/generation/:id" element={<GenerationDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </div>
  );
};

export default AnimatedRoutes;
