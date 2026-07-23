import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLite } from '../contexts/LiteContext';
import { IconHome, IconZap, IconUser, IconLogOut, IconSparkles, IconMagic, IconChevronLeft, IconChevronRight } from '../icons';
import './Sidebar.css';

export default function Sidebar() {
    const { currentUser, logout, userTier, zaps, isOffline, addToast, sidebarCollapsed, toggleSidebar } = useLite();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            addToast('Logged out. Your local pictures remain safe.', 'success');
            navigate('/auth');
        } catch (err: any) {
            addToast(err.message || 'Logout failed.', 'error');
        }
    };

    const getInitials = () => {
        if (currentUser?.displayName) {
            return currentUser.displayName.slice(0, 2).toUpperCase();
        }
        if (currentUser?.email) {
            return currentUser.email.slice(0, 2).toUpperCase();
        }
        return 'DB';
    };

    const getUserName = () => {
        if (currentUser?.displayName) return currentUser.displayName;
        if (currentUser?.email) return currentUser.email.split('@')[0];
        return 'Guest User';
    };

    const getTierColorClass = (tier: string) => {
        switch (tier) {
            case 'pro': return 'tier-pro';
            case 'architect': return 'tier-architect';
            default: return 'tier-free';
        }
    };

    return (
        <aside className={`sidebar glass-immersive ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Logo Header */}
            <div className="sidebar-header">
                <div className="logo-box-group">
                    <div className="logo-box">
                        <IconSparkles size={20} className="logo-icon" />
                    </div>
                    <div className="brand-meta">
                        <span className="brand-title">DreamBees</span>
                        <span className="brand-version">Lite v1.4.11</span>
                    </div>
                </div>
                <button 
                    type="button" 
                    className="btn-sidebar-toggle" 
                    onClick={toggleSidebar}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {sidebarCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation links */}
            <nav className="sidebar-nav">
                <NavLink 
                    to="/studio" 
                    className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`} 
                    data-tooltip="Studio Canvas"
                >
                    <IconZap size={20} />
                    <span className="nav-label">Studio Canvas</span>
                    <div className="active-indicator" />
                </NavLink>

                <NavLink 
                    to="/models" 
                    className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`} 
                    data-tooltip="MLX Models"
                >
                    <IconMagic size={20} />
                    <span className="nav-label">MLX Models</span>
                    <div className="active-indicator" />
                </NavLink>

                <NavLink 
                    to="/gallery" 
                    className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`} 
                    data-tooltip="Local Gallery"
                >
                    <IconHome size={20} />
                    <span className="nav-label">Local Gallery</span>
                    <div className="active-indicator" />
                </NavLink>

                <NavLink 
                    to="/profile" 
                    className={({ isActive }) => `side-nav-item ${isActive ? 'active' : ''}`} 
                    data-tooltip="My Profile"
                    onMouseEnter={() => import('../pages/UserProfile')}
                >
                    <IconUser size={20} />
                    <span className="nav-label">My Profile</span>
                    <div className="active-indicator" />
                </NavLink>
            </nav>

            {/* Bottom Section */}
            <div className="sidebar-bottom">
                {/* Network sync state */}
                <div className={`network-status ${isOffline ? 'offline' : 'online'}`}>
                    <span className="status-dot animate-pulse" />
                    <span className="status-text">{isOffline ? 'Offline Mode' : 'Online Sync'}</span>
                </div>

                {currentUser ? (
                    <div className="user-profile-panel">
                        <div className="profile-details-row">
                            <div className="user-avatar">{getInitials()}</div>
                            <div className="user-info">
                                <span className="username">{getUserName()}</span>
                                <span className="user-email">{currentUser.email}</span>
                            </div>
                        </div>

                        {/* Subscription & zaps stats */}
                        <div className="stats-badges">
                            <span className={`tier-badge ${getTierColorClass(userTier)}`}>
                                {userTier === 'free' ? 'Dreamer' : userTier === 'pro' ? 'Alchemist' : 'Architect'}
                            </span>
                            <span className="zaps-count">
                                {zaps === 'unlimited' ? '∞' : `${zaps} zaps`}
                            </span>
                        </div>

                        <button type="button" className="btn-logout" onClick={handleLogout} title="Sign Out" data-tooltip="Sign Out">
                            <IconLogOut size={16} />
                            <span className="logout-text">Sign Out</span>
                        </button>
                    </div>
                ) : (
                    <div className="auth-prompt-panel">
                        <NavLink 
                            to="/auth" 
                            className="btn-sidebar-auth" 
                            data-tooltip="Sign In"
                            onMouseEnter={() => import('../pages/Auth')}
                        >
                            <IconUser size={16} />
                            <span>Sign in</span>
                        </NavLink>
                    </div>
                )}
            </div>
        </aside>
    );
}
