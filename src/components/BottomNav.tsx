import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconHome, IconZap, IconUser, IconSparkles } from '../icons';
import { motion, AnimatePresence } from 'framer-motion';
import './BottomNav.css';

export default function BottomNav() {
    return (
        <nav className="bottom-nav-immersive glass-immersive">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon-box">
                    <IconHome size={22} />
                    <motion.div className="active-dot" layoutId="nav-dot" />
                </div>
                <span>Explore</span>
            </NavLink>

            <NavLink to="/generate" className={({ isActive }) => `nav-item-center ${isActive ? 'active' : ''}`}>
                <motion.div 
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    className="zap-jewel-v2"
                >
                    <IconZap size={28} fill="currentColor" />
                    <div className="zap-glow"></div>
                    <motion.div 
                        animate={{ opacity: [0, 1, 0], scale: [0.8, 1.3, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="zap-sparkle"
                    >
                        <IconSparkles size={14} />
                    </motion.div>
                </motion.div>
            </NavLink>
            
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon-box">
                    <IconUser size={22} />
                    <motion.div className="active-dot" layoutId="nav-dot-2" />
                </div>
                <span>You</span>
            </NavLink>
        </nav>
    );
}
