/**
 * [LAYER: INFRASTRUCTURE]
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPendingTimeRemaining } from '../lib/generationFlow';
import { useLite } from '../contexts/LiteContext';
import PictureThumb from '../components/PictureThumb';
import { IconRefresh, IconImage, IconLogOut, IconMagic, IconUser, IconZap } from '../icons';
import { observeElement } from '../lite-utils';
import './UserProfile.css';

function getDisplayName(email?: string | null, name?: string | null) {
    if (name) return name.split(' ')[0];
    if (email) return email.split('@')[0];
    return 'Friend';
}

export default function UserProfile() {
    const { currentUser, logout, displayHistory, pendingGeneration, dismissStuckPending, addToast, zaps, loadMoreHistory } = useLite();
    const [updateChecking, setUpdateChecking] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            addToast('You signed out. Your pictures stay on this device.', 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
        }
    };

    const checkUpdates = async () => {
        setUpdateChecking(true);
        try {
            let currentVersion = '1.4.11';
            const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
            if (isElectron && window.electronAPI?.lite?.health) {
                const health = await window.electronAPI.lite.health();
                currentVersion = health.appVersion || currentVersion;
            }

            const response = await fetch('https://dreambees-alchemist.firebaseapp.com/downloads/manifest.json');
            if (!response.ok) throw new Error('Could not connect to update servers');
            
            const manifest = await response.json();
            if (manifest.version && manifest.version !== currentVersion) {
                addToast(`Update available: v${manifest.version}! Please download the installer from our web portal.`, 'success');
            } else {
                addToast(`DreamBees Lite is up to date (v${currentVersion}).`, 'success');
            }
        } catch (err: any) {
            console.error(err);
            addToast('Unable to check for updates. Update server offline.', 'error');
        } finally {
            if (isMountedRef.current) {
                setUpdateChecking(false);
            }
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(24);

    const filteredPictures = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return displayHistory;
        return displayHistory.filter(item => 
            (typeof item.prompt === 'string' && item.prompt.toLowerCase().includes(query)) ||
            (typeof item.modelId === 'string' && item.modelId.toLowerCase().includes(query))
        );
    }, [displayHistory, searchQuery]);

    const visiblePictures = useMemo(() => {
        return filteredPictures.slice(0, visibleCount);
    }, [filteredPictures, visibleCount]);

    const [loadMoreEl, setLoadMoreEl] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!loadMoreEl) return;

        return observeElement(loadMoreEl, (isIntersecting) => {
            if (isIntersecting) {
                setVisibleCount((prev) => prev + 24);
                loadMoreHistory?.();
            }
        }, '400px');
    }, [loadMoreEl, loadMoreHistory]);

    const displayName = getDisplayName(currentUser?.email, currentUser?.displayName);
    const creditsLabel = zaps === 'unlimited' ? 'Unlimited' : String(zaps);
    const pendingTimeHint = pendingGeneration ? formatPendingTimeRemaining(pendingGeneration) : null;

    return (
        <div className="profile-simple fade-in">
            <header className="simple-header">
                <div className="simple-title">
                    <h1>Hi, {displayName}!</h1>
                    <p>Your pictures live here on this device.</p>
                </div>
            </header>

            <section className="simple-card account-card" aria-label="Your account">
                <div className="account-row">
                    <div className="avatar">
                        <IconUser size={28} />
                    </div>
                    <div>
                        <strong>{currentUser?.displayName || displayName}</strong>
                        <span>{currentUser?.email}</span>
                    </div>
                </div>

                <div className="simple-stats">
                    <div className="stat-box">
                        <span className="stat-label">Pictures</span>
                        <strong>{displayHistory.length}</strong>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Credits left</span>
                        <strong>{creditsLabel}</strong>
                    </div>
                </div>

                <div className="action-row">
                    <Link to="/generate" className="big-button primary">
                        <IconZap size={18} /> Make a picture
                    </Link>
                    <Link to="/" className="big-button">
                        <IconMagic size={18} /> Pick a style
                    </Link>
                    <button type="button" className="big-button" onClick={checkUpdates} disabled={updateChecking}>
                        <IconRefresh size={18} className={updateChecking ? 'spin' : ''} />
                        {updateChecking ? 'Checking...' : 'Check for Updates'}
                    </button>
                    <button type="button" className="big-button danger" onClick={handleLogout}>
                        <IconLogOut size={18} /> Sign out
                    </button>
                </div>
            </section>

            {pendingGeneration ? (
                <section className="simple-card pending-banner" aria-live="polite">
                    <p>
                        <strong>Still finishing:</strong>{' '}
                        {pendingGeneration.prompt.length > 60
                            ? `${pendingGeneration.prompt.slice(0, 60)}…`
                            : pendingGeneration.prompt}
                    </p>
                    <p className="pending-hint">
                        {pendingTimeHint
                            ? `It may appear automatically when ready (session ends in ${pendingTimeHint}).`
                            : 'It may appear here automatically when ready.'}
                    </p>
                    <button type="button" className="big-button inline dismiss-pending" onClick={dismissStuckPending}>
                        Start fresh
                    </button>
                </section>
            ) : null}

            <section className="simple-card" aria-label="Your pictures">
                <div className="pictures-header">
                    <strong>Your pictures</strong>
                    <span>{filteredPictures.length} {filteredPictures.length === displayHistory.length ? 'saved' : 'found'}</span>
                </div>

                {displayHistory.length > 0 && (
                    <div className="profile-search">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setVisibleCount(24);
                            }}
                            placeholder="Search your pictures by prompt or style..."
                            aria-label="Search pictures"
                        />
                    </div>
                )}

                {displayHistory.length === 0 ? (
                    <div className="empty-pictures">
                        <IconImage size={28} />
                        <p>No pictures yet.</p>
                        <Link to="/generate" className="big-button primary inline">
                            <IconZap size={18} /> Make your first picture
                        </Link>
                    </div>
                ) : filteredPictures.length === 0 ? (
                    <div className="empty-pictures">
                        <IconImage size={28} />
                        <p>No pictures match your search.</p>
                    </div>
                ) : (
                    <>
                        <div className="pictures-grid">
                            {visiblePictures.map((item) => (
                                <PictureThumb
                                    key={item.originalRequestId || item.firestoreImageId || item.id}
                                    item={item}
                                />
                            ))}
                        </div>
                        {filteredPictures.length > visibleCount && (
                            <div ref={setLoadMoreEl} className="load-more-container">
                                <button
                                    type="button"
                                    className="load-more-btn"
                                    onClick={() => setVisibleCount((prev) => prev + 24)}
                                >
                                    <span>Load more pictures</span>
                                    <span>({filteredPictures.length - visibleCount} remaining)</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
