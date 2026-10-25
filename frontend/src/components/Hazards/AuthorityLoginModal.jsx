import React, { useState } from 'react';
import { ShieldCheck, Lock, X, Loader2, KeyRound } from 'lucide-react';
import { verifyAuthorityPasscodeApi } from '../../services/api';

export function AuthorityLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter the authority passcode.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await verifyAuthorityPasscodeApi(passcode.trim());
      if (data.success) {
        onLoginSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect passcode. Try "admin123" or "authority".');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Authority Verification</h3>
              <p className="text-[11px] text-slate-400">
                Municipal & Traffic Police Officer Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational description */}
        <p className="text-xs text-slate-300 leading-relaxed">
          Authority role grants clearance permissions to verify reported road conditions, clear roadblocks/potholes, and resolve active hazards across Indore.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs flex items-center space-x-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Authority Passcode / PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter authority passkey..."
                autoFocus
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 flex items-center space-x-1">
              <span>💡 Demo Key:</span>
              <button
                type="button"
                onClick={() => setPasscode('admin123')}
                className="underline text-indigo-400 hover:text-indigo-300 font-mono font-bold"
              >
                admin123
              </button>
              <span>or</span>
              <button
                type="button"
                onClick={() => setPasscode('authority')}
                className="underline text-indigo-400 hover:text-indigo-300 font-mono font-bold"
              >
                authority
              </button>
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 active:scale-95 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify Authority</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
