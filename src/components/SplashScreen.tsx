import React, { useEffect, useRef, useState } from 'react';
import { IconZap, IconSparkles } from '../icons';
import './SplashScreen.css';

export default function SplashScreen() {
    const [isMounted, setIsMounted] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    const exitStartedRef = useRef(false);
    const exitTimerRef = useRef<number | null>(null);

    const dismissSplash = () => {
        if (exitStartedRef.current) return;
        exitStartedRef.current = true;
        setIsExiting(true);
        exitTimerRef.current = window.setTimeout(() => setIsMounted(false), 260);
    };

    useEffect(() => {
        const timer = window.setTimeout(() => dismissSplash(), 650);
        return () => {
            clearTimeout(timer);
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
            }
        };
    }, []);

    if (!isMounted) return null;

    return (
        <div 
            className={`splash-screen ${isExiting ? 'splash-exit' : ''}`}
            onClick={dismissSplash}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    dismissSplash();
                }
            }}
            aria-label="Skip splash screen"
        >
            <div className="mesh-gradient-container">
                <div className="mesh-ball mesh-1"></div>
                <div className="mesh-ball mesh-2"></div>
                <div className="mesh-ball mesh-3"></div>
                <div className="mesh-ball mesh-4"></div>
            </div>

            <div className="splash-content">
                <div className="splash-logo-container">
                    <div className="splash-logo">
                        <IconZap size={96} fill="var(--color-accent)" />
                        <div className="logo-sparkle">
                            <IconSparkles size={40} />
                        </div>
                    </div>
                </div>
                
                <h1 className="text-jeweled">
                    DreamBees<span>LITE</span>
                </h1>
                
                <p className="splash-sub">Harmonizing the creative latent...</p>
                
                <div className="loading-track">
                    <div className="loading-fill" />
                </div>

                <div className="skip-hint">
                    Click anywhere to skip
                </div>
            </div>
        </div>
    );
}
