import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, KeyRound, Eye, EyeOff, ArrowLeft, Building2 } from 'lucide-react';
import { AppSettings } from '../types';

interface LoginViewProps {
  settings?: AppSettings;
  authConfig?: any;
  workshopName?: string;
  managerName?: string;
  onLoginSuccess?: () => void;
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  authConfig,
  workshopName,
  managerName,
  onLoginSuccess,
  onSuccess,
}) => {
  const effectiveAuthConfig = settings?.authConfig || authConfig;
  const effectiveWorkshopName = settings?.workshopName || workshopName || 'سامانه جامع مدیریت کارگاه';
  const effectiveManagerName = settings?.managerName || managerName || 'مدیر سامانه';

  const configuredUsername = effectiveAuthConfig?.username || 'admin';
  const configuredPassword = effectiveAuthConfig?.password || '123';
  const displayName = effectiveAuthConfig?.displayName || effectiveManagerName;

  const handleSuccessCallback = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else if (onSuccess) {
      onSuccess();
    }
  };

  const [username, setUsername] = useState<string>(configuredUsername);
  const [password, setPassword] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setUsername(configuredUsername);
  }, [configuredUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Validate credentials
      const validUsername = (username.trim().toLowerCase() === configuredUsername.trim().toLowerCase());
      const validPassword = (password === configuredPassword);

      if (validUsername && validPassword) {
        setIsLoading(false);
        handleSuccessCallback();
      } else {
        setIsLoading(false);
        setErrorMessage('نام کاربری یا رمز عبور وارد شده نادرست است.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
        {/* Top Workshop Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-3.5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {effectiveWorkshopName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ورود ایمن به سامانه مدیریت کارگران و کارکرد ماهانه
          </p>
        </div>

        {/* User Badge */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">{displayName}</div>
              <div className="text-[11px] text-slate-500 font-mono">حساب کاربری: {username}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingUsername(!isEditingUsername)}
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer px-1.5 py-1"
          >
            {isEditingUsername ? 'تأیید نام کاربری' : 'تغییر کاربر'}
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (Fixed by default, editable on toggle) */}
          {isEditingUsername && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام کاربری
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری"
                  className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                رمز عبور سامانه <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">فقط رمز عبور را وارد کنید</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                className="w-full bg-white text-slate-800 text-xs pr-9 pl-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                dir="ltr"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer p-0.5"
                title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-blue-500/20 transition duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>ورود به محیط کارگاه</span>
                <ArrowLeft className="w-4 h-4 mr-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer Hint */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            در صورتی که رمز عبور را تغییر نداده‌اید، رمز پیش‌فرض <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">123</span> می‌باشد.
          </p>
        </div>
      </div>

      {/* Workshop Security Note */}
      <div className="text-center mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5" />
        <span>اطلاعات در حافظه محلی سیستم شما محفوظ است</span>
      </div>
    </div>
  );
};
