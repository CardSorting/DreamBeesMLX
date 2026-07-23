import React from 'react';
import { Link } from 'react-router-dom';
import { IconHome, IconZap } from '../icons';
import './NotFound.css';

export default function NotFound() {
    return (
        <div className="lite-notfound-immersive">
            <div className="mesh-gradient-container">
                <div className="mesh-ball mesh-1"></div>
                <div className="mesh-ball mesh-2"></div>
            </div>

            <div className="notfound-card glass-warm">
                <div className="icon-box-glow">
                    <IconZap size={48} fill="#8b5cf6" />
                </div>
                <h1>Lost in the<span>Latent Space?</span></h1>
                <p>This coordinate doesn't exist yet, but your next masterpiece does.</p>
                
                <Link to="/" className="primary-btn-warm">
                    <IconHome size={20} />
                    <span>Return to Studio</span>
                </Link>
            </div>
        </div>
    );
}
