import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { Lock, Mail, User, Phone, ArrowRight, Shield, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';

interface LoginProps {
  onSuccess: () => void;
  onAdminSwitch: () => void;
}

export const CustomerLoginPage: React.FC<LoginProps> = ({ onSuccess, onAdminSwitch }) => {
  const { login } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'forgot' | 'reset-otp'>('form');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const [otpCode, setOtpCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [unverifiedAccount, setUnverifiedAccount] = useState<{ email: string; simulatedOtp?: string } | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Forgot / Reset Password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSimulatedOtp, setResetSimulatedOtp] = useState<string | null>(null);
  const [resetResendTimer, setResetResendTimer] = useState(60);
  const [canResetResend, setCanResetResend] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const location = useLocation();

  // Detect mode=register query param and toggle between Sign In and Sign Up
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('mode') === 'register') {
        setIsRegister(true);
        setStep('form');
        setError('');
      } else {
        setIsRegister(false);
        setStep('form');
        setError('');
      }
    } catch { }
}, [location.search]);

// Countdown timer for OTP resend
useEffect(() => {
  let interval: any = null;
  if (step === 'otp' && resendTimer > 0) {
    interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
  } else if (resendTimer === 0) {
    setCanResend(true);
    clearInterval(interval);
  }
  return () => clearInterval(interval);
}, [step, resendTimer]);

// Countdown timer for Reset Password OTP resend
useEffect(() => {
  let interval: any = null;
  if (step === 'reset-otp' && resetResendTimer > 0) {
    interval = setInterval(() => {
      setResetResendTimer((prev) => prev - 1);
    }, 1000);
  } else if (resetResendTimer === 0) {
    setCanResetResend(true);
    clearInterval(interval);
  }
  return () => clearInterval(interval);
}, [step, resetResendTimer]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccessMsg('');
  setUnverifiedAccount(null);
  setIsLoading(true);

  try {
    if (isRegister) {
      if (!formData.name.trim()) {
        const err = 'Please enter your full name.';
        setError(err);
        toast.warning(err);
        setIsLoading(false);
        return;
      }
      if (!formData.email.trim()) {
        const err = 'Please enter your email address.';
        setError(err);
        toast.warning(err);
        setIsLoading(false);
        return;
      }
      const cleanPhone = sanitizePhoneNumber(formData.phone);
      if (!isValidIndianPhone(cleanPhone)) {
        const err = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
        setError(err);
        toast.warning(err, 'Invalid Mobile Number');
        setIsLoading(false);
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        const err = 'Password is required and must be at least 6 characters.';
        setError(err);
        toast.warning(err);
        setIsLoading(false);
        return;
      }
      // Register user -> Triggers OTP email via Nodemailer
      const res = await api.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: cleanPhone
      });
      if (res.data?.requiresOtp) {
        setTargetEmail(res.data.email);
        if (res.data?.simulatedOtp) {
          setSimulatedOtp(res.data.simulatedOtp);
        }
        setStep('otp');
        setResendTimer(60);
        setCanResend(false);
        setSuccessMsg(res.data.message || 'OTP verification code sent to your email.');
        toast.info(`Verification code sent to ${res.data.email}`, 'OTP Sent');
      } else if (res.data?.token) {
        login(res.data.user, res.data.token);
        onSuccess();
      }
    } else {
      // Login user
      const res = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });
      if (res.data?.success) {
        login(res.data.user, res.data.token);
        onSuccess();
      } else {
        setError(res.data?.message || 'Authentication failed');
        toast.error(res.data?.message || 'Authentication failed', 'Login Failed');
      }
    }
  } catch (err: any) {
    const resp = err.response?.data;
    if (resp?.isUnverified) {
      // Stay on login form, do NOT jump screen automatically
      setUnverifiedAccount({
        email: resp.email || formData.email,
        simulatedOtp: resp.simulatedOtp
      });
      setError(resp.message || 'Account registration is pending email verification.');
      toast.warning('Account registration is pending email verification.', 'Verification Required');
    } else {
      const errorMsg = resp?.message || 'Invalid credentials or connection error';
      setError(errorMsg);
      toast.error(errorMsg, 'Login Error');
    }
  } finally {
    setIsLoading(false);
  }
};

const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccessMsg('');
  if (!otpCode || otpCode.trim().length < 6) {
    setError('Please enter the complete 6-digit OTP code.');
    toast.warning('Please enter the complete 6-digit OTP code.');
    return;
  }

  setIsLoading(true);
  try {
    const res = await api.post('/auth/verify-otp', {
      email: targetEmail,
      otp: otpCode.trim()
    });

    if (res.data?.token) {
      setSuccessMsg('Email verified successfully! Welcome to Novise.');
      toast.success('Email verified successfully! Welcome to Novise.', 'Account Verified');
      login(res.data.user, res.data.token, true); // silent since we already toasted
      setTimeout(() => {
        onSuccess();
      }, 600);
    } else {
      setError(res.data?.message || 'Verification failed. Please try again.');
      toast.error(res.data?.message || 'Verification failed', 'Error');
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Invalid or expired OTP. Please check your email.';
    setError(errorMsg);
    toast.error(errorMsg, 'OTP Verification');
  } finally {
    setIsLoading(false);
  }
};

const handleResendOtp = async () => {
  if (!canResend || isLoading) return;
  setError('');
  setSuccessMsg('');
  setIsLoading(true);

  try {
    const res = await api.post('/auth/resend-otp', { email: targetEmail });
    setSuccessMsg(res.data?.message || 'A new 6-digit OTP code has been sent to your email.');
    toast.success('A new 6-digit OTP code has been sent to your email.', 'Code Resent');
    setResendTimer(60);
    setCanResend(false);
    setOtpCode('');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Failed to resend OTP. Please try again later.';
    setError(errorMsg);
    toast.error(errorMsg, 'Resend Failed');
  } finally {
    setIsLoading(false);
  }
};

const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccessMsg('');
  if (!resetEmail || !resetEmail.trim()) {
    setError('Please enter your email address.');
    toast.warning('Please enter your email address.');
    return;
  }

  setIsLoading(true);
  try {
    const res = await api.post('/auth/forgot-password', { email: resetEmail.trim() });
    if (res.data?.success) {
      setTargetEmail(res.data.email || resetEmail.trim());
      if (res.data?.simulatedOtp) {
        setResetSimulatedOtp(res.data.simulatedOtp);
      }
      setStep('reset-otp');
      setResetResendTimer(60);
      setCanResetResend(false);
      setResetOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg(res.data.message || 'Password reset code sent to your email.');
      toast.info(`Recovery code sent to ${resetEmail.trim()}`, 'Code Sent');
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Failed to initiate password reset.';
    setError(errorMsg);
    toast.error(errorMsg, 'Reset Error');
  } finally {
    setIsLoading(false);
  }
};

const handleResetPasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccessMsg('');

  if (!resetOtpCode || resetOtpCode.trim().length < 6) {
    setError('Please enter the complete 6-digit recovery code.');
    toast.warning('Please enter the complete 6-digit recovery code.');
    return;
  }

  if (newPassword.length < 6) {
    setError('New password must be at least 6 characters long.');
    toast.warning('New password must be at least 6 characters long.');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setError('New password and confirm password do not match.');
    toast.warning('Passwords do not match.');
    return;
  }

  setIsLoading(true);
  try {
    const res = await api.post('/auth/reset-password', {
      email: targetEmail,
      otp: resetOtpCode.trim(),
      newPassword
    });

    if (res.data?.success) {
      setSuccessMsg('Password has been reset successfully! You can now sign in.');
      toast.success('Password has been reset successfully! Please sign in with your new password.', 'Password Updated');
      // Pre-fill email and switch back to sign in
      setFormData(prev => ({ ...prev, email: targetEmail, password: '' }));
      setStep('form');
      setIsRegister(false);
      setResetEmail('');
      setResetOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(res.data?.message || 'Failed to reset password.');
      toast.error(res.data?.message || 'Failed to reset password.', 'Reset Failed');
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Invalid or expired code. Please try again.';
    setError(errorMsg);
    toast.error(errorMsg, 'Reset Error');
  } finally {
    setIsLoading(false);
  }
};

const handleResendResetOtp = async () => {
  if (!canResetResend || isLoading) return;
  setError('');
  setSuccessMsg('');
  setIsLoading(true);

  try {
    const res = await api.post('/auth/forgot-password', { email: targetEmail });
    setSuccessMsg(res.data?.message || 'A new reset code has been sent to your email.');
    toast.success('A new reset code has been sent to your email.', 'Code Resent');
    if (res.data?.simulatedOtp) {
      setResetSimulatedOtp(res.data.simulatedOtp);
    }
    setResetResendTimer(60);
    setCanResetResend(false);
    setResetOtpCode('');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Failed to resend code. Please try again.';
    setError(errorMsg);
    toast.error(errorMsg, 'Resend Failed');
  } finally {
    setIsLoading(false);
  }
};

return (
  <div className="py-8 sm:py-16 w-full px-3.5 sm:px-6 max-w-md mx-auto">
    <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-luxury space-y-4 sm:space-y-6">

      {/* Brand Header */}
      <div className="text-center space-y-2">
        <img
          src="/novise-logo-transparent.png"
          alt="Novis Herbal"
          className="h-16 w-auto mx-auto object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.endsWith('/novise-logo-cream.png')) {
              target.src = '/novise-logo-cream.png';
            }
          }}
        />
        <h2 className="font-serif text-xl font-bold text-slate-800">
          {step === 'otp'
            ? 'Verify Your Email'
            : step === 'forgot'
              ? 'Forgot Password'
              : step === 'reset-otp'
                ? 'Set New Password'
                : isRegister
                  ? 'Create Your Account'
                  : 'Welcome Back'}
        </h2>
        <p className="text-xs text-slate-400">
          {step === 'otp'
            ? `We've sent a 6-digit security code to ${targetEmail}`
            : step === 'forgot'
              ? 'Enter your registered email address to receive a recovery code'
              : step === 'reset-otp'
                ? `Enter the 6-digit code sent to ${targetEmail} and your new password`
                : isRegister
                  ? 'Join Novise for genuine botanical care, quick checkout & order tracking'
                  : 'Sign in to access your saved orders, reviews, and wishlist'}
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {error}
          </div>

          {unverifiedAccount && !isRegister && step === 'form' && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 animate-fadeIn">
              <p className="text-[11px] text-amber-900 leading-snug font-medium">
                An account was registered with <strong>{unverifiedAccount.email}</strong>, but email verification is pending.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTargetEmail(unverifiedAccount.email);
                    if (unverifiedAccount.simulatedOtp) {
                      setSimulatedOtp(unverifiedAccount.simulatedOtp);
                    }
                    setStep('otp');
                    setResendTimer(60);
                    setCanResend(false);
                    setError('');
                  }}
                  className="px-3 py-1.5 bg-forest-900 text-gold-400 rounded-lg font-bold text-xs hover:bg-forest-950 transition shadow-sm"
                >
                  Enter 6-Digit OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setUnverifiedAccount(null);
                    setError('');
                  }}
                  className="px-3 py-1.5 bg-white border border-stone-300 text-stone-700 rounded-lg font-semibold text-xs hover:bg-stone-50 transition shadow-sm"
                >
                  Sign Up Fresh
                </button>
              </div>
            </div>
          )}

          {!isRegister && error.toLowerCase().includes('sign up') && !unverifiedAccount && (
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-forest-950 rounded-xl font-bold text-xs transition"
            >
              Create Account with {formData.email || 'this email'} →
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step 1: Login / Register Form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-600 font-semibold">Mobile Number <span className="text-rose-500">*</span></label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formData.phone ? `${formData.phone.length}/10 digits` : '10 digits required'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 font-semibold text-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitizePhoneNumber(e.target.value) })}
                    onKeyDown={handlePhoneKeyDown}
                    className="w-full pl-16 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono tracking-wider"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>
            {isRegister && (
              <p className="text-[10px] text-slate-400 mt-1">
                * A 6-digit OTP will be sent to this email for instant verification.
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-slate-600 font-semibold">Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(formData.email);
                    setStep('forgot');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] font-semibold text-amber-700 hover:text-forest-900 transition"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Please wait...' : isRegister ? 'Send Verification OTP' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step: Forgot Password Email Form */}
      {step === 'forgot' && (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-amber-900/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <KeyRound className="w-5 h-5" />
            </div>
            <p className="text-slate-600 text-xs">
              Enter your registered email address and we'll send you a 6-digit recovery OTP to reset your password.
            </p>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Registered Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !resetEmail}
            className="w-full py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Sending Recovery Code...' : 'Send Recovery Code'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step: Reset Password with OTP & New Password */}
      {step === 'reset-otp' && (
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-forest-900/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-slate-600 text-xs">
              Enter the 6-digit recovery code sent to <strong className="text-forest-900">{targetEmail}</strong> along with your new password.
            </p>
          </div>

          {resetSimulatedOtp && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5">
                  <span>🔑 Local Reset OTP:</span>
                  <span className="font-mono text-sm bg-amber-200/80 px-2 py-0.5 rounded-lg font-black tracking-widest text-amber-950">
                    {resetSimulatedOtp}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setResetOtpCode(resetSimulatedOtp)}
                  className="text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded-md font-extrabold uppercase hover:bg-amber-700 transition shadow-sm"
                >
                  Auto Fill
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-center text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
              6-Digit Recovery Code
            </label>
            <input
              type="text"
              maxLength={6}
              autoFocus
              required
              placeholder="• • • • • •"
              value={resetOtpCode}
              onChange={(e) => setResetOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full py-3 text-center text-2xl font-bold tracking-[8px] text-forest-950 border-2 border-forest-900/20 rounded-xl bg-[#FAF8F5] focus:outline-none focus:border-forest-900 font-mono shadow-inner"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Re-enter new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || resetOtpCode.length < 6 || newPassword.length < 6}
            className="w-full py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Resetting Password...' : 'Reset Password'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>

          {/* Resend Reset OTP & Back button */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError('');
                setSuccessMsg('');
              }}
              className="text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            <button
              type="button"
              disabled={!canResetResend || isLoading}
              onClick={handleResendResetOtp}
              className={`font-semibold flex items-center space-x-1 ${canResetResend ? 'text-forest-900 hover:underline' : 'text-slate-400 cursor-not-allowed'
                }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{canResetResend ? 'Resend Code' : `Resend in ${resetResendTimer}s`}</span>
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Email OTP Verification View */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-5 text-xs">
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-forest-900/10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-slate-600 text-xs">
              Enter the 6-digit code sent to <strong className="text-forest-900">{targetEmail}</strong>
            </p>
          </div>

          {simulatedOtp && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5">
                  <span>🔑 Local OTP Code:</span>
                  <span className="font-mono text-sm bg-amber-200/80 px-2 py-0.5 rounded-lg font-black tracking-widest text-amber-950">
                    {simulatedOtp}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(simulatedOtp)}
                  className="text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded-md font-extrabold uppercase hover:bg-amber-700 transition shadow-sm"
                >
                  Auto Fill
                </button>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                ℹ️ Note: Real inbox delivery requires your 16-character Google App Password in <code>server/.env</code>.
              </p>
            </div>
          )}

          <div>
            <label className="block text-center text-slate-700 font-bold mb-2 uppercase tracking-wider text-[11px]">
              6-Digit Security OTP
            </label>
            <input
              type="text"
              maxLength={6}
              autoFocus
              required
              placeholder="• • • • • •"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full py-3.5 text-center text-2xl font-bold tracking-[10px] text-forest-950 border-2 border-forest-900/20 rounded-xl bg-[#FAF8F5] focus:outline-none focus:border-forest-900 font-mono shadow-inner"
            />
            <p className="text-center text-[10px] text-slate-400 mt-2">
              Code expires in 10 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || otpCode.length < 6}
            className="w-full py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Resend OTP button */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError('');
                setSuccessMsg('');
              }}
              className="text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Email</span>
            </button>

            <button
              type="button"
              disabled={!canResend || isLoading}
              onClick={handleResendOtp}
              className={`font-semibold flex items-center space-x-1 ${canResend ? 'text-forest-900 hover:underline' : 'text-slate-400 cursor-not-allowed'
                }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}</span>
            </button>
          </div>
        </form>
      )}

      {/* Switch between Sign In & Sign Up */}
      {step === 'form' && (
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccessMsg('');
              setUnverifiedAccount(null);
            }}
            className="text-xs text-slate-600 hover:text-forest-900 font-semibold"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      )}

      {/* Back to Sign In when on Forgot Password screen */}
      {step === 'forgot' && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setError('');
              setSuccessMsg('');
            }}
            className="text-xs text-slate-600 hover:text-forest-900 font-semibold flex items-center justify-center space-x-1.5 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      )}

    </div>
  </div>
);
};
