import React, { useState, useEffect, useRef } from 'react';
import { useLite } from '../contexts/LiteContext';
import { useNavigate } from 'react-router-dom';
import { IconLoader, IconZap, IconSparkles, IconMagic } from '../icons';
import './Auth.css';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [birthday, setBirthday] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, loginWithGoogle, currentUser, addToast } = useLite();
    const navigate = useNavigate();

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (currentUser) navigate('/generate');
    }, [currentUser, navigate]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                addToast("Welcome back to the dream.", "success");
            } else {
                if (!birthday) throw new Error("A birth date is required for the archive.");
                await signup(email, password, birthday);
                addToast("Your creative journey begins now.", "success");
            }
            navigate('/generate');
        } catch (err: any) {
            addToast(err.message, "error");
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }

    return (
        <div className="lite-auth-immersive">
            {/* Dynamic Mesh Background */}
            <div className="mesh-gradient-container">
                <div className="mesh-ball mesh-1"></div>
                <div className="mesh-ball mesh-2"></div>
                <div className="mesh-ball mesh-3"></div>
            </div>

            <div
                className="auth-jewel-card glass-immersive"
            >
                <header className="auth-header">
                    <div className="brand-orb-visual auth-reveal">
                        <div className="orb-ring">
                            <IconSparkles size={24} className="ring-sparkle" />
                        </div>
                        <div className="orb-core">
                            <IconMagic size={32} fill="white" />
                        </div>
                    </div>
                    <h1 className="text-jeweled auth-reveal reveal-delay-1">
                        DreamBees<span>Lite</span>
                    </h1>
                    <p className="poetic-welcome auth-reveal reveal-delay-2">
                        {isLogin ? 'Reawaken your latent vision.' : 'Step into the garden of creation.'}
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="auth-form auth-reveal reveal-delay-3">
                    <div className="field-group">
                        <label>Identity</label>
                        <input 
                            type="email" 
                            placeholder="Email address" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                        />
                    </div>
                    <div className="field-group">
                        <label>Secret</label>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                        />
                    </div>
                    
                    {!isLogin && (
                        <div className="field-group signup-field">
                            <label>Date of Awakening</label>
                            <div className="date-input-wrapper">
                                <input
                                    type="date"
                                    required
                                    value={birthday}
                                    onChange={e => setBirthday(e.target.value)}
                                    className="date-input"
                                />
                            </div>
                        </div>
                    )}
                    
                    <button type="submit" disabled={loading} className="manifest-btn clickable">
                        {loading ? <IconLoader size={20} className="spin" /> : (isLogin ? 'Enter Studio' : 'Begin Journey')}
                    </button>
                </form>

                <div className="auth-divider auth-reveal reveal-delay-4">
                    <div className="line"></div>
                    <span>SECURE ACCESS</span>
                    <div className="line"></div>
                </div>

                <button
                    type="button" 
                    className="google-jewel-btn clickable" 
                    onClick={() => loginWithGoogle()}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <div className="creator-trust auth-reveal reveal-delay-5">
                    <div className="avatar-cluster">
                        <div className="mini-orb orb-gold"></div>
                        <div className="mini-orb orb-purple"></div>
                        <div className="mini-orb orb-amber"></div>
                        <div className="mini-plus">+12k</div>
                    </div>
                    <span>The collective is waiting for you</span>
                </div>

                <p className="auth-footer auth-reveal reveal-delay-6">
                    {isLogin ? "New to the archive? " : "Already a creator? "}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="toggle-auth-mode">
                        {isLogin ? 'Join now' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
