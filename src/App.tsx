import React, { Suspense } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';

// Lazy load the database-bound context provider and app layout content
const LazyLiteProvider = React.lazy(() => 
  import('./contexts/LiteContext').then((module) => ({ default: module.LiteProvider }))
);
const LazyAppContent = React.lazy(() => import('./AppContent'));

const AppLoadingFallback = () => (
  <div
    aria-hidden="true"
    style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#060608',
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
    }}
  >
    <aside
      style={{
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.025)',
      }}
    />
    <main style={{ padding: 24 }}>
      <div style={{ width: 220, height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 18 }} />
      <div style={{ width: 'min(520px, 80%)', height: 52, borderRadius: 18, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            style={{
              aspectRatio: '4 / 3',
              borderRadius: 22,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <SplashScreen />
      <Suspense fallback={<AppLoadingFallback />}>
        <LazyLiteProvider>
          <LazyAppContent />
        </LazyLiteProvider>
      </Suspense>
    </Router>
  );
}

export default App;
