
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import BookingDetail from './components/BookingDetail';
import PassiveInvoices from './components/PassiveInvoices';
import CityTax from './components/CityTax';
import { 
  HomeIcon,
  BuildingOfficeIcon, 
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  UserIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// --- COMPONENTE PROTEZIONE ROTTE ---
const PrivateRoute = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

// --- COMPONENTE LAYOUT PRINCIPALE ---
const Layout = ({ handleLogout }: { handleLogout: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto z-40">
        <div className="p-8 border-b border-slate-50">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <ClipboardDocumentListIcon className="w-6 h-6" />
            </div>
            MAS DB
          </h1>
        </div>
        
        <div className="flex-1 px-4 py-8 space-y-10">
          <section>
            <div className="space-y-1.5">
              <SidebarLink to="/home" icon={HomeIcon} label="Panoramica" activeColor="bg-slate-900" end />
            </div>
          </section>

          <section>
            <h2 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Strutture</h2>
            <div className="space-y-1.5">
              <SidebarLink to="/omait" icon={BuildingOffice2Icon} label="Omait" activeColor="bg-indigo-600" />
              <SidebarLink to="/cb" icon={BuildingOfficeIcon} label="CB" activeColor="bg-emerald-600" />
            </div>
          </section>

          <section>
            <h2 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Admin</h2>
            <div className="space-y-1.5">
              <SidebarLink to="/fatture-passive" icon={BanknotesIcon} label="Fatture Passive" activeColor="bg-slate-800" />
              <SidebarLink to="/imposta-soggiorno" icon={CreditCardIcon} label="Imposta Soggiorno" activeColor="bg-amber-600" />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 space-y-4">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
           >
             <ArrowRightOnRectangleIcon className="w-5 h-5" />
             Disconnetti
           </button>
           <div className="text-[10px] text-slate-300 text-center font-bold uppercase tracking-widest flex items-center justify-center gap-2">
             <ShieldCheckIcon className="w-3 h-3 text-green-500" />
             SICUREZZA 2FA
           </div>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-10">
        <Outlet />
      </main>
    </div>
  );
};

const SidebarLink = ({ to, icon: Icon, label, activeColor, end = false }: any) => {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm ${
        isActive 
          ? `${activeColor} text-white shadow-lg` 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
};

// --- COMPONENTE LOGIN CON 2FA E TIMER ---
const Login = ({ onLogin, isAuthenticated }: { onLogin: () => void, isAuthenticated: boolean }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/home', { replace: true });
  }, [isAuthenticated, navigate]);

  // Gestione Timer OTP
  useEffect(() => {
    if (step === 2 && timer > 0) {
      timerRef.current = window.setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timer]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    setTimeout(() => {
      const isValidUser1 = cleanUser === 'mariocangiano' && cleanPass === '0909Mario';
      const isValidUser2 = cleanUser === 'studiosommella' && cleanPass === 'roberta2025';

      if (isValidUser1 || isValidUser2) {
        setStep(2);
        setError(false);
        setTimer(60);
        setCanResend(false);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
      setIsProcessing(false);
    }, 1200);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setIsResending(true);
    setOtp(['', '', '', '', '', '']);
    
    setTimeout(() => {
      setTimer(60);
      setCanResend(false);
      setIsResending(false);
      otpRefs.current[0]?.focus();
    }, 1500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer === 0) {
      setError(true);
      return;
    }

    setIsProcessing(true);
    const fullCode = otp.join('');
    const cleanUser = username.trim().toLowerCase();

    setTimeout(() => {
      const isMarioCode = cleanUser === 'mariocangiano' && fullCode === '240985';
      const isSommellaCode = cleanUser === 'studiosommella' && fullCode === '110292';

      if (isMarioCode || isSommellaCode) {
        onLogin();
        const from = (location.state as any)?.from?.pathname || "/home";
        navigate(from, { replace: true });
      } else {
        setError(true);
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        setTimeout(() => setError(false), 2000);
      }
      setIsProcessing(false);
    }, 1500);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800/10 transition-all duration-500">
        <div className="p-10 text-center space-y-8">
          
          <div className="relative inline-flex items-center justify-center w-24 h-24 bg-indigo-50 rounded-3xl mb-2">
            {step === 1 ? (
              <LockClosedIcon className={`w-12 h-12 text-indigo-600 ${isProcessing ? 'animate-pulse' : ''}`} />
            ) : (
              <ChatBubbleBottomCenterTextIcon className={`w-12 h-12 text-indigo-600 ${isProcessing || isResending ? 'animate-bounce' : ''}`} />
            )}
            <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">MAS DATABASE</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              {step === 1 ? 'Sistema di Autenticazione' : 'Verifica Identità in corso'}
            </p>
          </div>
          
          {step === 1 ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5 text-left" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identificativo Utente</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" placeholder="Username" autoFocus required autoComplete="off" disabled={isProcessing}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold ${
                      error ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-indigo-600 focus:bg-white focus:shadow-xl focus:shadow-indigo-50'
                    }`}
                    value={username} onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Codice Segreto</label>
                <div className="relative group">
                  <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="password" placeholder="Password" required autoComplete="off" disabled={isProcessing}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold ${
                      error ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-indigo-600 focus:bg-white focus:shadow-xl focus:shadow-indigo-50'
                    }`}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-black text-center border border-red-100 animate-bounce">ACCESSO NEGATO</div>}
              
              <button 
                type="submit" disabled={isProcessing}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Verifica Credenziali'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-8 text-center" autoComplete="off">
              <div className="space-y-2">
                <p className="text-slate-500 text-xs font-medium px-4 leading-relaxed">
                  Abbiamo inviato un SMS di conferma al numero associato all'account:
                  <br />
                  <span className="font-bold text-slate-900 tracking-widest text-sm">+39 ••• ••• ••14</span>
                </p>
                <div className={`text-[10px] font-black tracking-[0.2em] ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  SCADE TRA {formatTimer(timer)}
                </div>
              </div>
              
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    required
                    disabled={isProcessing || isResending || timer === 0}
                    className={`w-12 h-14 text-center text-xl font-black border-2 rounded-xl outline-none transition-all ${
                      error ? 'border-red-500 bg-red-50 text-red-600 animate-shake' : timer === 0 ? 'bg-slate-100 border-slate-200 opacity-50' : 'border-slate-100 bg-slate-50 focus:border-indigo-600 focus:bg-white focus:shadow-lg focus:shadow-indigo-50'
                    }`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>

              {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest">Codice non valido o scaduto</div>}

              <div className="space-y-4">
                <button 
                  type="submit" disabled={isProcessing || isResending || timer === 0}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95"
                >
                  {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Autorizza Accesso'}
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  <button 
                    type="button" 
                    onClick={handleResend}
                    disabled={!canResend || isResending}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${canResend ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-300'}`}
                  >
                    {isResending ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <ArrowPathIcon className="w-3 h-3" />}
                    Reinvia codice {timer > 0 && `(attendi ${timer}s)`}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => { setStep(1); setTimer(60); }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeftIcon className="w-3 h-3" /> Modifica dati accesso
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
        <div className="bg-slate-50 p-5 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">PROTEZIONE MULTI-FATTORE ATTIVA</p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE RADICE APP ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mas_auth_session') === 'active_secure_2fa_v3';
  });

  const handleLogin = useCallback(() => {
    localStorage.setItem('mas_auth_session', 'active_secure_2fa_v3');
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('mas_auth_session');
    setIsAuthenticated(false);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} isAuthenticated={isAuthenticated} />} />
        
        {/* Rotte Protette */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout handleLogout={handleLogout} />}>
            <Route path="/home" element={<Home />} />
            <Route path="/omait" element={<Dashboard propertyId="omait" />} />
            <Route path="/cb" element={<Dashboard propertyId="cb" />} />
            <Route path="/fatture-passive" element={<PassiveInvoices />} />
            <Route path="/imposta-soggiorno" element={<CityTax />} />
            <Route path="/booking/:id" element={<BookingDetail />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
