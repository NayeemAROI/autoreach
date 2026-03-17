import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ArrowLeft, Target, Users, Briefcase, BarChart3, Rocket, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    id: 'goal',
    title: "What's your main goal?",
    subtitle: 'This helps us tailor your workspace',
    options: [
      { value: 'lead_gen', label: 'Lead Generation', desc: 'Find and connect with potential customers', icon: Target, color: 'from-primary/20 to-primary/5', border: 'border-primary/30' },
      { value: 'networking', label: 'Networking', desc: 'Build meaningful professional relationships', icon: Users, color: 'from-accent/20 to-accent/5', border: 'border-accent/30' },
      { value: 'recruiting', label: 'Recruiting', desc: 'Source and engage top talent', icon: Briefcase, color: 'from-info/20 to-info/5', border: 'border-info/30' },
      { value: 'sales', label: 'Sales Pipeline', desc: 'Convert prospects into paying customers', icon: BarChart3, color: 'from-success/20 to-success/5', border: 'border-success/30' },
    ]
  },
  {
    id: 'volume',
    title: 'How many leads per day?',
    subtitle: "We'll set safe daily limits based on your needs",
    options: [
      { value: '1-10', label: '1 – 10', desc: 'Starting slow and steady', icon: null, emoji: '🌱' },
      { value: '10-25', label: '10 – 25', desc: 'Growing consistently', icon: null, emoji: '📈' },
      { value: '25-50', label: '25 – 50', desc: 'Scaling up outreach', icon: null, emoji: '🚀' },
      { value: '50+', label: '50+', desc: 'Full-throttle automation', icon: null, emoji: '⚡' },
    ]
  },
  {
    id: 'industry',
    title: 'What industry are you in?',
    subtitle: "We'll personalize your templates and suggestions",
    options: [
      { value: 'tech', label: 'Technology', desc: 'SaaS, AI, Dev Tools', icon: null, emoji: '💻' },
      { value: 'finance', label: 'Finance', desc: 'Banking, FinTech, Insurance', icon: null, emoji: '💰' },
      { value: 'healthcare', label: 'Healthcare', desc: 'MedTech, Pharma, Wellness', icon: null, emoji: '🏥' },
      { value: 'marketing', label: 'Marketing & Sales', desc: 'Agencies, Consulting, Growth', icon: null, emoji: '📣' },
      { value: 'education', label: 'Education', desc: 'EdTech, Training, Coaching', icon: null, emoji: '🎓' },
      { value: 'other', label: 'Other', desc: "I'll tell you later", icon: null, emoji: '🌐' },
    ]
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleSelect = (value) => {
    setAnswers(prev => ({ ...prev, [step.id]: value }));
  };

  const handleNext = async () => {
    if (isLastStep) {
      // Save onboarding answers
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/settings/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(answers)
        });
        completeOnboarding();
      } catch (err) {
        console.error('Failed to save onboarding:', err);
      }
      navigate('/');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSkip = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({}) // Empty payload just flags completion
      });
      completeOnboarding();
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-primary/6 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">AutoReach</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted font-medium">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-xs text-text-muted font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="glass-card p-8 lg:p-10 rounded-3xl border border-white/[0.06] shadow-2xl shadow-black/20 hover:transform-none animate-fade-in" key={currentStep}>
          <div className="text-center mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2 tracking-tight">{step.title}</h1>
            <p className="text-text-secondary">{step.subtitle}</p>
          </div>

          <div className={`grid gap-3 ${step.options.length > 4 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {step.options.map((option) => {
              const isSelected = answers[step.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all duration-200 group
                    ${isSelected
                      ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-accent/5 shadow-lg shadow-primary/10'
                      : 'border-border/60 bg-bg-surface/30 hover:border-border-light hover:bg-bg-surface/50'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-primary-light" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    {option.icon ? (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center border ${option.border}`}>
                        <option.icon className="w-5 h-5 text-text-primary" />
                      </div>
                    ) : option.emoji ? (
                      <div className="w-10 h-10 rounded-xl bg-bg-elevated/80 flex items-center justify-center text-xl border border-border/50">
                        {option.emoji}
                      </div>
                    ) : null}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{option.label}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{option.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!answers[step.id]}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-white text-sm
                bg-gradient-to-r from-primary to-accent
                hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                active:translate-y-0 transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isLastStep ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch Dashboard
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip */}
        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
