import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLite } from '../contexts/LiteContext';
import { IconHome, IconUser, IconSparkles, IconMagic, IconZap, IconChevronLeft, IconChevronRight } from '../icons';
import './Sidebar.css';

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLite();

  return (
    <aside className={`sidebar glass-immersive ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Header */}
      <div className="sidebar-header">
        <div className="logo-box-group">
          <div className="logo-box">
            <IconSparkles size={20} className="logo-icon" />
          </div>
          <div className="brand-meta">
            <span className="brand-title">DreamBees Studio</span>
            <span className="brand-version text-purple-400">Private Studio</span>
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
          data-tooltip="Model Styles"
        >
          <IconMagic size={20} />
          <span className="nav-label">Model Styles</span>
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
          data-tooltip="Settings & Storage"
        >
          <IconUser size={20} />
          <span className="nav-label">Settings & Storage</span>
          <div className="active-indicator" />
        </NavLink>
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        <button
          onClick={() => {
            localStorage.removeItem('dreambees_touchless_setup_done');
            window.location.reload();
          }}
          style={{
            width: '100%',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '12px',
            padding: '8px 12px',
            color: '#c084fc',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          title="Re-run Setup Wizard"
        >
          <IconSparkles size={14} />
          {!sidebarCollapsed && <span>Setup Wizard</span>}
        </button>

        <div className="network-status online">
          <span className="status-dot animate-pulse bg-purple-400" />
          <span className="status-text text-purple-300 font-medium text-xs">Ready & Private</span>
        </div>
      </div>
    </aside>
  );
}
