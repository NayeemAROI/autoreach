import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Sparkles, Shield, Users, BarChart3 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: 'Smart Lead Discovery', desc: 'Find and connect with your ideal prospects automatically' },
    { icon: Sparkles, title: 'AI-Powered Sequences', desc: 'Create personalized outreach campaigns that convert' },
    { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track every interaction and optimize your pipeline' },
    { icon: Shield, title: 'Safe & Compliant', desc: 'Human-like behavior patterns that protect your account' },
  ];

  return (
    <div className="min-h-screen w-full bg-bg-primary flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent/6 rounded-full blur-[130px]" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-info/5 rounded-full blur-[100px]" style={{ animationDelay: '2s', animationDuration: '5s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Left Panel — Feature Showcase */}
      <div className="hidden lg:flex flex-col justify-center w-[48%] p-16 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">AutoReach</span>
          </div>
          
          <h2 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Automate your LinkedIn
            <br />
            <span className="gradient-text">growth engine</span>
          </h2>
          <p className="text-text-secondary text-lg mb-12 leading-relaxed">
            Connect, engage, and convert prospects on autopilot with intelligent automation that feels personal.
          </p>

          <div className="space-y-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-bg-surface/30 backdrop-blur-sm hover:border-primary/30 hover:bg-bg-surface/50 transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-primary-light" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-0.5">{f.title}</h3>
                  <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">AutoReach</span>
          </div>

          <div className="glass-card p-8 lg:p-10 rounded-3xl border border-white/[0.06] shadow-2xl shadow-black/20 hover:transform-none">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Welcome back</h1>
              <p className="text-text-secondary">Sign in to your automation workspace</p>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between animate-fade-in">
                <span>{error}</span>
                <button onClick={() => setError('')} className="hover:text-danger/70 ml-3 text-lg">&times;</button>
              </div>
            )}

            {successMsg && (
              <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
                <button onClick={() => setSuccessMsg('')} className="hover:text-success/70 ml-auto text-lg">&times;</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary block">Email Address</label>
                <div className="relative group">
                  <Mail className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors z-10" />
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    className="input !pl-12 w-full !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-secondary block">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-light hover:text-primary transition-colors font-medium">Forgot password?</Link>
                </div>
                <div className="relative group">
                  <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors z-10" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input !pl-12 w-full !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white text-base
                  bg-gradient-to-r from-primary via-primary to-accent
                  hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                  active:translate-y-0 transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                  mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <p className="text-text-secondary text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-light hover:text-primary font-semibold transition-colors">
                  Create one free
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-text-muted text-xs mt-6">
            Protected by enterprise-grade encryption
          </p>
        </div>
      </div>
    </div>
  );
}
