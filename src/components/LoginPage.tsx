import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, AlertCircle, User, ArrowRight, WifiOff, HardDrive } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { loginAsGuest, isOnline } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setError(null);
    if (!isOnline) return;
    // Use the redirect-based OAuth flow from the working Project 2.
    window.location.href = '/api/auth/google';
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    onLoginSuccess?.();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950 px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/50 mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              OneNote PDF Studio
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xs">
              Notebook environment with freehand stylus drawing, PDF import, and complete offline support.
            </p>
          </div>

          {!isOnline && (
            <div className="mb-6 p-3.5 bg-amber-950/60 border border-amber-600/60 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">You are currently offline</p>
                <p className="text-amber-200/80 mt-0.5">
                  Internet is only needed for Google login or Google Drive sync. Click <strong>Continue as Guest</strong> below to work offline freely with full local features!
                </p>
              </div>
            </div>
          )}

          {/* Login Actions */}
          <div className="flex flex-col items-center w-full space-y-3.5">
            {isOnline ? (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full max-w-[320px] py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-900 font-semibold text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-md border border-slate-300"
              >
                <span className="font-bold text-lg">G</span>
                <span>Continue with Google</span>
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 text-xs text-center">
                Google Login requires internet connection
              </div>
            )}

            <div className="relative w-full flex items-center justify-center my-1">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider shrink-0">
                OR
              </span>
            </div>

            {/* Guest Login Fallback */}
            <button
              onClick={handleGuestLogin}
              className="w-full max-w-[320px] py-3 px-4 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-purple-950 border border-purple-400/30"
            >
              <User className="w-4 h-4" />
              <span>Continue as Guest (Offline Mode)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>All drawings & notebooks save automatically to Local Device</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} OneNote PDF Studio • Fully Offline PWA
        </p>
      </div>
    </div>
  );
};
