import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, Shield, Star, Rocket } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { width: '0%', color: 'bg-border', label: '' };
    if (password.length < 6) return { width: '25%', color: 'bg-danger', label: 'Weak' };
    if (password.length < 10) return { width: '50%', color: 'bg-warning', label: 'Fair' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 10) return { width: '100%', color: 'bg-success', label: 'Strong' };
    return { width: '75%', color: 'bg-info', label: 'Good' };
  };
  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const text = await resp.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      setStep(2); // Move to verification step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      navigate('/login', { state: { message: 'Registration successful! You can now sign in.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: Rocket, text: 'Start automating in under 2 minutes' },
    { icon: Shield, text: 'No credit card required' },
    { icon: Star, text: 'Full access to all features' },
  ];

  return (
    <div className="min-h-screen w-full bg-bg-primary flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] bg-accent/8 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] bg-primary/6 rounded-full blur-[130px]" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-center w-[48%] p-16 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">AutoReach</span>
          </div>
          
          <h2 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Start growing your
            <br />
            <span className="gradient-text">network today</span>
          </h2>
          <p className="text-text-secondary text-lg mb-12 leading-relaxed">
            Join thousands of professionals who use AutoReach to build meaningful connections and close deals faster.
          </p>

          <div className="space-y-5">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
                  <perk.icon className="w-5 h-5 text-success" />
                </div>
                <span className="text-text-secondary font-medium">{perk.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-14 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {['S', 'M', 'E', 'J'].map((letter, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border-2 border-bg-primary flex items-center justify-center text-xs font-bold text-primary-light">
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />)}
              </div>
              <p className="text-xs text-text-muted">Trusted by 2,000+ sales professionals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Register Form */}
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
            {step === 1 ? (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Create Account</h1>
                  <p className="text-text-secondary">Set up your automation workspace</p>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between animate-fade-in">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="hover:text-danger/70 ml-3 text-lg">&times;</button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-secondary block">Full Name</label>
                    <div className="relative group">
                      <User className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors z-10" />
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        className="input !pl-12 w-full !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

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
                    <label className="text-sm font-medium text-text-secondary block">Password</label>
                    <div className="relative group">
                      <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors z-10" />
                      <input
                        type="password"
                        required
                        minLength="6"
                        autoComplete="new-password"
                        className="input !pl-12 w-full !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {/* Password strength indicator */}
                    {password && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} rounded-full transition-all duration-500`} style={{ width: strength.width }} />
                        </div>
                        <span className={`text-xs font-medium ${
                          strength.label === 'Weak' ? 'text-danger' :
                          strength.label === 'Fair' ? 'text-warning' :
                          strength.label === 'Good' ? 'text-info' : 'text-success'
                        }`}>{strength.label}</span>
                      </div>
                    )}
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
                        Create Account
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                  <p className="text-text-secondary text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-light hover:text-primary font-semibold transition-colors">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              // Verification Step
              <>
                <div className="mb-8 text-center pt-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Check your email</h1>
                  <p className="text-text-secondary leading-relaxed">
                    We sent a 6-digit verification code to
                    <br />
                    <span className="text-text-primary font-medium">{email}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-8 text-sm flex items-center justify-between animate-fade-in">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="hover:text-danger/70 ml-3 text-lg">&times;</button>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6" autoComplete="off">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary block text-center mb-6">Enter Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      autoComplete="off"
                      className="input text-center text-3xl tracking-[0.4em] !py-4 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary font-mono placeholder:text-text-muted/30"
                      placeholder="------"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white text-base
                      bg-gradient-to-r from-primary via-primary to-accent
                      hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                      active:translate-y-0 transition-all duration-200
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                      mt-4"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verify Account
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                  <button onClick={() => setStep(1)} className="text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2 font-medium">
                    ← Back to Registration
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-text-muted text-xs mt-6">
            By creating an account, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
