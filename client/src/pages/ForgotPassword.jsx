import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Lock } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      navigate('/login', { state: { message: 'Password reset successfully! You can now sign in.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] bg-primary/6 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[20%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">AutoReach</span>
        </div>

        <div className="glass-card p-8 lg:p-10 rounded-3xl border border-white/[0.06] shadow-2xl shadow-black/20 hover:transform-none">
          {step === 1 ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Reset Password</h1>
                <p className="text-text-secondary">Enter your email and we'll send you a verification code</p>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between animate-fade-in">
                  <span>{error}</span>
                  <button onClick={() => setError('')} className="hover:text-danger/70 ml-3 text-lg">&times;</button>
                </div>
              )}

              <form onSubmit={handleRequestCode} className="space-y-5" autoComplete="off">
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

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white text-base
                    bg-gradient-to-r from-primary via-primary to-accent
                    hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                    active:translate-y-0 transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Reset Code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center pt-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Create New Password</h1>
                <p className="text-text-secondary leading-relaxed">
                  Enter the 6-digit code sent to
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

              <form onSubmit={handleResetPassword} className="space-y-5" autoComplete="off">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary block">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    className="input text-center text-2xl tracking-[0.4em] !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary font-mono placeholder:text-text-muted/30"
                    placeholder="------"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary block">New Password</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors z-10" />
                    <input
                      type="password"
                      required
                      minLength="6"
                      autoComplete="new-password"
                      className="input !pl-12 w-full !py-3.5 !rounded-xl !bg-bg-primary/60 !border-border/80 focus:!border-primary/50 focus:!bg-bg-primary"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6 || newPassword.length < 6}
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
                      Reset Password
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <button onClick={() => setStep(1)} className="text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2 font-medium">
                  ← Back
                </button>
              </div>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2 font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
