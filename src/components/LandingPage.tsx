import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  MapPin,
  DollarSign,
  Sparkles,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Key,
  Eye,
  EyeOff,
  Zap,
  Hospital,
  Bell,
  UploadCloud,
  Check,
  Camera,
  UserPlus,
  ChevronRight,
  Mail,
  RotateCcw,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import { ResidentProfile, MedicalSpecialty, PGYLevel } from '../types';
import { SOCAL_RESIDENCY_PROGRAMS, INITIAL_RESIDENT } from '../data/mockData';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  beginSignUp,
  resendSignUpCode,
  signInResident,
} from '../lib/residentApi';

interface LandingPageProps {
  onLogin: (role?: 'resident' | 'admin', customProfile?: ResidentProfile, isDemo?: boolean) => void;
  onShowHospitalPortal?: () => void;
}

// Both demo experiences (Resident + Hospital MSO Admin) are hidden from the
// public site now that it's live at a real domain. They're only reachable by
// whoever knows the secret preview link below, or by clicking the footer
// copyright text 5 times in a row — and neither is remembered across visits,
// so every fresh page load starts locked again. Change PREVIEW_ACCESS_CODE
// any time to invalidate old links.
const PREVIEW_ACCESS_PARAM = 'preview';
const PREVIEW_ACCESS_CODE = 'mooncall-2026';

interface CartoonHospital {
  id: string;
  name: string;
  specialty: string;
  rate: number;
  location: string;
  distance: string;
  x: number; // percentage on map canvas
  y: number; // percentage on map canvas
  badge: string;
}

const DEMO_HOSPITALS: CartoonHospital[] = [
  {
    id: 'h1',
    name: 'Valley Presbyterian Community ED',
    specialty: 'Community ER Physician',
    rate: 165,
    location: 'Van Nuys, CA',
    distance: '3.8 mi',
    x: 32,
    y: 28,
    badge: 'Community ER'
  },
  {
    id: 'h2',
    name: 'Exer Urgent Care - Santa Monica',
    specialty: 'Urgent Care Fast-Track',
    rate: 135,
    location: 'Santa Monica, CA',
    distance: '4.2 mi',
    x: 18,
    y: 58,
    badge: 'Urgent Care'
  },
  {
    id: 'h4',
    name: 'Kaiser Sunset Urgent Care Center',
    specialty: 'Urgent Care Moonlighting',
    rate: 145,
    location: 'Hollywood, CA',
    distance: '4.8 mi',
    x: 52,
    y: 35,
    badge: 'Flexible Hours'
  },
  {
    id: 'h5',
    name: 'Glendale Adventist ER Division',
    specialty: 'Community ED Swing Shift',
    rate: 175,
    location: 'Glendale, CA',
    distance: '6.5 mi',
    x: 62,
    y: 22,
    badge: 'Bonus +$200'
  },
  {
    id: 'h6',
    name: 'LA General Medical Center (LAC+USC) ED',
    specialty: 'Trauma & ED Surge Shift',
    rate: 205,
    location: 'Los Angeles, CA',
    distance: '5.4 mi',
    x: 75,
    y: 45,
    badge: 'Nocturnist Surge'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onShowHospitalPortal }) => {
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [activeHospital, setActiveHospital] = useState<CartoonHospital | null>(null);

  // Both demo modes (Resident + Hospital MSO Admin) stay hidden from public
  // visitors until unlocked via the secret preview link or footer tap combo.
  // Deliberately NOT persisted anywhere (no localStorage/sessionStorage) —
  // every fresh page load starts locked again, even on the same browser/device.
  const [isDemoUnlocked, setIsDemoUnlocked] = useState<boolean>(false);
  const secretTapCountRef = useRef<number>(0);
  const secretTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockDemoAccess = () => {
    setIsDemoUnlocked(true);
  };

  // Secret entry #1: a link containing ?preview=<code>. Checked once on
  // mount, then immediately scrubbed from the visible URL. Secret entry #2:
  // tapping the footer copyright line 5 times within ~2.5s of each other.
  // Reloading the page (or opening it fresh) always starts locked again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSecretLink = params.get(PREVIEW_ACCESS_PARAM) === PREVIEW_ACCESS_CODE;

    if (hasSecretLink) {
      unlockDemoAccess();
      params.delete(PREVIEW_ACCESS_PARAM);
      const remaining = params.toString();
      const cleanedUrl = window.location.pathname + (remaining ? `?${remaining}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanedUrl);
    }
  }, []);

  const handleSecretFooterTap = () => {
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) {
      clearTimeout(secretTapTimerRef.current);
    }
    if (secretTapCountRef.current >= 5) {
      secretTapCountRef.current = 0;
      unlockDemoAccess();
      return;
    }
    secretTapTimerRef.current = setTimeout(() => {
      secretTapCountRef.current = 0;
    }, 2500);
  };

  // Login Role Tab: 'resident' | 'admin'
  const [loginRole, setLoginRole] = useState<'resident' | 'admin'>('resident');

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);

  // New Resident Account Registration State
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpLastName, setSignUpLastName] = useState('');
  const [signUpTitle, setSignUpTitle] = useState<'MD' | 'DO'>('MD');
  const [signUpNpi, setSignUpNpi] = useState('');
  const [signUpProgramSelect, setSignUpProgramSelect] = useState<string>(SOCAL_RESIDENCY_PROGRAMS[0]);
  const [signUpCustomProgram, setSignUpCustomProgram] = useState<string>('');
  const [signUpSpecialty, setSignUpSpecialty] = useState<MedicalSpecialty>('Emergency Medicine');
  const [signUpPgy, setSignUpPgy] = useState<PGYLevel>('PGY-2');
  const [signUpHeadshotUrl, setSignUpHeadshotUrl] = useState<string>('');
  const [isDraggingPicture, setIsDraggingPicture] = useState(false);

  // Email Verification State
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string>('');
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  // Real auth error/loading state
  const [signInError, setSignInError] = useState<string>('');
  const [signUpStep2Error, setSignUpStep2Error] = useState<string>('');
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  // Drag and drop handlers for profile picture upload
  const handlePictureDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPicture(true);
  };

  const handlePictureDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPicture(false);
  };

  const handlePictureDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPicture(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setSignUpHeadshotUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setSignUpHeadshotUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Admin sign-in is still a demo login, so pre-fill its fixed credentials.
  // Resident sign-in is real now, so those fields start empty.
  useEffect(() => {
    if (loginRole === 'admin') {
      setEmail('admin@stfrancis.org');
      setPassword('HospitalMSO2026!');
    } else {
      setEmail('');
      setPassword('');
    }
  }, [loginRole]);

  // Continuously loop hospital pop-ups on map automatically
  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < DEMO_HOSPITALS.length) {
          const nextIndex = prev;
          setActiveHospital(DEMO_HOSPITALS[nextIndex]);
          return prev + 1;
        } else if (prev < DEMO_HOSPITALS.length + 3) {
          // Pause briefly with all hospitals visible before restarting
          return prev + 1;
        } else {
          setActiveHospital(null);
          return 0;
        }
      });
    }, 800); // Pops up every 800ms and loops indefinitely

    return () => clearInterval(interval);
  }, []);

  const currentSignUpProgram = () =>
    signUpProgramSelect === 'Other'
      ? signUpCustomProgram.trim()
      : signUpProgramSelect;

  const handleProceedToVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpProgramSelect === 'Other' && !signUpCustomProgram.trim()) {
      setSignUpStep2Error('Please write the name of your residency institution / hospital system.');
      return;
    }

    if (!isSupabaseConfigured) {
      setSignUpStep2Error(
        'Sign-up backend is not connected yet. Ask the site owner to finish the Supabase setup.'
      );
      return;
    }

    setSignUpStep2Error('');
    setIsSigningUp(true);
    try {
      // Creates the real auth account and triggers Supabase's confirmation
      // email with a "Confirm email address" link. Clicking it lands the
      // resident back on this site already signed in — App.tsx picks that
      // up automatically and creates their profile at that point.
      await beginSignUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        firstName: signUpFirstName.trim(),
        lastName: signUpLastName.trim(),
        title: signUpTitle,
        npiNumber: signUpNpi.trim(),
        residencyProgram: currentSignUpProgram(),
        specialty: signUpSpecialty,
        pgyLevel: signUpPgy,
        headshotUrl: signUpHeadshotUrl,
      });

      setVerificationError('');
      setResendSuccess(false);
      setSignUpStep(3);
    } catch (err: any) {
      setSignUpStep2Error(err?.message || 'Could not create your account. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationError('');
    try {
      await resendSignUpCode(signUpEmail.trim());
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setVerificationError(err?.message || 'Could not resend the confirmation email. Please try again in a moment.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');

    if (loginRole === 'admin') {
      // Hospital MSO Admin accounts are still a demo/mock login for now.
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLogin('admin');
      }, 600);
      return;
    }

    if (!isSupabaseConfigured) {
      setSignInError('Sign-in backend is not connected yet. Ask the site owner to finish the Supabase setup.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInResident(email.trim(), password);
      // This one login form is shared by anyone who types credentials in —
      // if those credentials actually belong to a Hospital/MSO admin account,
      // send them to that portal instead of loading a resident dashboard for
      // them (their account_type is stamped on sign-up and travels with the
      // session from then on).
      if (result?.user?.user_metadata?.account_type === 'hospital_admin') {
        onShowHospitalPortal?.();
        return;
      }
      // App.tsx listens for the auth session change and loads the resident's
      // real profile from the database, so we just flip into the app here.
      onLogin('resident');
    } catch (err: any) {
      setSignInError(err?.message || 'Sign in failed. Check your email and password and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminDemoAccess = () => {
    setLoginRole('admin');
    setEmail('admin@stfrancis.org');
    setPassword('HospitalMSO2026!');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin('admin');
    }, 500);
  };

  // Resident-side demo: loads the built-in "Dr. Jessie Smith" mock persona
  // without touching Supabase — same isolation the admin demo already has.
  const handleResidentDemoAccess = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin('resident', INITIAL_RESIDENT, true);
    }, 500);
  };

  // Scrolls to the sign-in card and pre-selects the resident tab, without
  // faking a login the way the old demo build used to.
  const scrollToResidentSignIn = () => {
    setLoginRole('resident');
    setIsSignUp(false);
    document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/20 shrink-0">
              <img src="/brand/logo.png" alt="MoonCall" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">MoonCall</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  Dual Platform
                </span>
              </div>
              <p className="text-[10px] text-slate-500 -mt-0.5">Medical Residents & Hospital MSO</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={scrollToResidentSignIn}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-1 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Resident Login</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Real-Time Moonlighting Opportunities for Medical Residents</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Explore Open Shifts & Build Credentialing Passports
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            See how top hospitals in your area match medical residents with open moonlight shifts. Streamline your onboarding, claim shifts faster, and track your moonlighting income.
          </p>
        </div>

        {/* Section 1: Animated Pop-Up Cartoon Map Preview */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xl relative space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Live Opportunity Radar — Greater Los Angeles & SoCal</span>
              </h2>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-600">
              <span className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Revealed: <strong className="text-slate-900">{Math.min(visibleCount, DEMO_HOSPITALS.length)} / {DEMO_HOSPITALS.length}</strong> Hospitals</span>
              </span>

              <span className="flex items-center space-x-1.5 text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Auto-Radar</span>
              </span>
            </div>
          </div>

          {/* Cartoon Interactive Map Canvas */}
          <div className="relative w-full h-[400px] sm:h-[480px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
            
            {/* Map Canvas Visual Backing (Stylized dark map mesh) */}
            <div 
              className="absolute inset-0 opacity-40 bg-cover bg-center"
              style={{
                backgroundImage: `radial-gradient(#334155 1px, transparent 1px), radial-gradient(#1e293b 1px, #020617 1px)`,
                backgroundSize: `24px 24px, 12px 12px`
              }}
            />

            {/* Stylized River & Map roads svg decoration */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <path d="M -50 100 Q 200 150 400 300 T 900 450" fill="none" stroke="#3b82f6" strokeWidth="18" strokeLinecap="round" />
              <path d="M 100 -50 Q 300 200 600 250 T 1000 500" fill="none" stroke="#6366f1" strokeWidth="6" strokeDasharray="8,8" />
            </svg>

            {/* Cartoon Pop-Up Hospital Markers */}
            {DEMO_HOSPITALS.map((hospital, index) => {
              const isVisible = index < visibleCount;
              const isActive = activeHospital?.id === hospital.id;

              if (!isVisible) return null;

              return (
                <div
                  key={hospital.id}
                  style={{ left: `${hospital.x}%`, top: `${hospital.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500 ease-out animate-in zoom-in-50 fade-in duration-300"
                >
                  {/* Cartoon Hospital Marker Pin Button */}
                  <button
                    onClick={() => setActiveHospital(hospital)}
                    className={`group relative flex flex-col items-center transition-all duration-300 ${
                      isActive ? 'scale-125 z-30' : 'hover:scale-110 hover:z-20'
                    }`}
                  >
                    {/* Badge Pill above icon */}
                    <div className="bg-slate-900/90 text-white border border-blue-400/40 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-lg flex items-center space-x-1 whitespace-nowrap mb-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-black">${hospital.rate}</span>
                      <span className="text-slate-400 font-normal">/hr</span>
                    </div>

                    {/* Cartoon Blue Hospital Icon Badge */}
                    <div className={`p-3 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 ring-4 ring-blue-400/50 text-white shadow-blue-500/50'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/50'
                    }`}>
                      <Building2 className="w-5 h-5 text-white" />
                    </div>

                    {/* Ping Ripple */}
                    {isActive && (
                      <span className="absolute bottom-2 w-8 h-8 rounded-full bg-blue-400/30 animate-ping pointer-events-none" />
                    )}

                    {/* Hospital Short Label */}
                    <span className="mt-1 text-[10px] font-bold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800 shadow-xs max-w-[110px] truncate text-center">
                      {hospital.name}
                    </span>
                  </button>
                </div>
              );
            })}

            {/* Active Selected Hospital Floating Card overlay */}
            {activeHospital && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-slate-900/95 border border-blue-500/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-white space-y-2 z-40 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                      {activeHospital.badge}
                    </span>
                    <h3 className="font-extrabold text-sm text-white mt-1">
                      {activeHospital.name}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {activeHospital.specialty} • {activeHospital.location} ({activeHospital.distance})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400">
                      ${activeHospital.rate}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ hour</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Requires Passport Verification
                  </span>
                  <button
                    onClick={scrollToResidentSignIn}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1 transition-all"
                  >
                    <span>Sign In to Claim</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Canvas Hint Overlay */}
            <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-slate-300 font-medium flex items-center space-x-1.5 pointer-events-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Click any cartoon hospital to inspect shift rates!</span>
            </div>

          </div>

          {/* Key Value Proposition Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left pt-2">
            
            {/* Feature 1: Fast-Track Clearance */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 hover:border-blue-300 transition-all group">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4 fill-emerald-400" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Fast-Track Clearance</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accelerated hospital onboarding & pre-verified MSO credentialing.
              </p>
            </div>

            {/* Feature 2: New Job Posting Notifications */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 hover:border-blue-300 transition-all group">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 group-hover:scale-105 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">New Job Notifications</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant priority alerts when partner hospital sites post open shifts.
              </p>
            </div>

            {/* Feature 3: Real-Time Payment Tracker */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 hover:border-blue-300 transition-all group">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Tracker</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seamlessly track completed hours, shift payouts, and gross earnings.
              </p>
            </div>

            {/* Feature 4: 1-Click Credential Passport */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 hover:border-blue-300 transition-all group">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">1-Click Credential Passport</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instantly share verified licenses, NPI, and DEA with medical staff offices.
              </p>
            </div>

          </div>

        </div>

        {/* Section 2: Sign Up & Log In Portal Card underneath */}
        <div id="auth-card" className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative">
          {!isSupabaseConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[11px] font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Sign-up/sign-in isn't connected to a database yet — the site owner still needs to finish the Supabase setup.</span>
            </div>
          )}
          
          {/* Role Selection Tabs — Hospital MSO Admin only shows once demo access is unlocked */}
          {isDemoUnlocked && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setLoginRole('resident'); setIsSignUp(false); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
                  loginRole === 'resident'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Resident Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => { setLoginRole('admin'); setIsSignUp(false); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
                  loginRole === 'admin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Hospital className="w-4 h-4" />
                <span>Hospital MSO Admin</span>
              </button>
            </div>
          )}

          {/* Sub-toggle for Residents: Sign In vs Create Account */}
          {loginRole === 'resident' && (
            <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setSignUpStep(1); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  !isSignUp ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In (Existing User)
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setSignUpStep(1); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1 ${
                  isSignUp ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>Create New Account</span>
              </button>
            </div>
          )}

          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {loginRole === 'admin'
                ? 'Hospital MSO Admin Portal'
                : isSignUp
                  ? (signUpStep === 1
                      ? 'Step 1: Create Resident Credentials'
                      : signUpStep === 2
                        ? 'Step 2: Enter Identifiers & Profile Photo'
                        : 'Step 3: Verify Your Email Address')
                  : 'Resident Physician Sign In'
              }
            </h2>
            <p className="text-xs text-slate-600">
              {loginRole === 'admin'
                ? 'Manage resident applications, review passports, and sign off on credentials.'
                : isSignUp
                  ? (signUpStep === 1
                      ? 'Enter your login username and secure password.'
                      : signUpStep === 2
                        ? 'Add your name, NPI, program, and drag-and-drop headshot photo.'
                        : 'Enter the 6-digit code sent to your email to activate your account.')
                  : 'Access your medical credential vault, shift map, and applications.'
              }
            </p>
          </div>

          {/* Resident SIGN UP Wizard */}
          {loginRole === 'resident' && isSignUp ? (
            <div className="space-y-5">
              
              {/* Step indicator */}
              <div className="flex items-center space-x-1.5 text-xs">
                <div className={`flex-1 py-1.5 px-2 rounded-lg text-center font-bold border transition-all text-[11px] ${
                  signUpStep === 1
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  1. Credentials {signUpStep > 1 && '✓'}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className={`flex-1 py-1.5 px-2 rounded-lg text-center font-bold border transition-all text-[11px] ${
                  signUpStep === 2
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : signUpStep > 2
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  2. Details {signUpStep > 2 && '✓'}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className={`flex-1 py-1.5 px-2 rounded-lg text-center font-bold border transition-all text-[11px] ${
                  signUpStep === 3
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  3. Verify Email
                </div>
              </div>

              {signUpStep === 1 ? (
                /* Step 1: Username / Email & Password */
                <form onSubmit={(e) => { e.preventDefault(); if (signUpEmail && signUpPassword) setSignUpStep(2); }} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">
                      Username / Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. dr.mtoledo@keckmedicine.org"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">
                      Choose Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 8 characters"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <span>Next: Add Identifiers & Profile Picture</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : signUpStep === 2 ? (
                /* Step 2: Name, NPI, Program & Drag and Drop Headshot */
                <form onSubmit={handleProceedToVerification} className="space-y-4 text-xs">
                  
                  {/* Name fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-slate-700 font-bold block">Title</label>
                      <select
                        value={signUpTitle}
                        onChange={(e) => setSignUpTitle(e.target.value as 'MD' | 'DO')}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="MD">M.D.</option>
                        <option value="DO">D.O.</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-slate-700 font-bold block">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Marcus"
                        value={signUpFirstName}
                        onChange={(e) => setSignUpFirstName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-slate-700 font-bold block">Last Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Toledo"
                        value={signUpLastName}
                        onChange={(e) => setSignUpLastName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* NPI & Residency Program */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-700 font-bold block">NPI Number (10 digits) *</label>
                      <input
                        type="text"
                        required
                        placeholder="1982048291"
                        value={signUpNpi}
                        onChange={(e) => setSignUpNpi(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-700 font-bold block">Residency Program *</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (signUpProgramSelect === 'Other') {
                              setSignUpProgramSelect(SOCAL_RESIDENCY_PROGRAMS[0]);
                            } else {
                              setSignUpProgramSelect('Other');
                            }
                          }}
                          className="text-[10px] font-extrabold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 transition-all cursor-pointer"
                        >
                          {signUpProgramSelect === 'Other' ? '← SoCal Dropdown' : '+ Other Institution'}
                        </button>
                      </div>

                      <select
                        value={signUpProgramSelect}
                        onChange={(e) => setSignUpProgramSelect(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 text-xs font-medium"
                      >
                        <optgroup label="Southern California Residency Programs">
                          {SOCAL_RESIDENCY_PROGRAMS.map((prog) => (
                            <option key={prog} value={prog}>
                              {prog}
                            </option>
                          ))}
                        </optgroup>
                        <option value="Other">Other / Unlisted Program (Specify below)</option>
                      </select>
                    </div>
                  </div>

                  {/* If "Other" is selected, require custom institution name input */}
                  {signUpProgramSelect === 'Other' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-[11px] font-extrabold text-amber-700 block flex items-center justify-between">
                        <span>Write Residency Institution Name (Required) *</span>
                        <span className="text-[10px] text-amber-600 font-normal">Unlisted Hospital System</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Stanford Health Care / Mayo Clinic"
                        value={signUpCustomProgram}
                        onChange={(e) => setSignUpCustomProgram(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-medium text-xs"
                      />
                    </div>
                  )}

                  {/* Specialty & PGY Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-700 font-bold block">Medical Specialty</label>
                      <select
                        value={signUpSpecialty}
                        onChange={(e) => setSignUpSpecialty(e.target.value as MedicalSpecialty)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Emergency Medicine">Emergency Medicine</option>
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Family Medicine">Family Medicine</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="General Surgery">General Surgery</option>
                        <option value="Anesthesiology">Anesthesiology</option>
                        <option value="Urgent Care">Urgent Care</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 font-bold block">PGY Training Level</label>
                      <select
                        value={signUpPgy}
                        onChange={(e) => setSignUpPgy(e.target.value as PGYLevel)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="PGY-1">PGY-1 (Intern)</option>
                        <option value="PGY-2">PGY-2</option>
                        <option value="PGY-3">PGY-3</option>
                        <option value="PGY-4">PGY-4</option>
                        <option value="PGY-5">PGY-5</option>
                        <option value="Chief Resident">Chief Resident</option>
                        <option value="Fellow">Fellow</option>
                      </select>
                    </div>
                  </div>

                  {/* DRAG AND DROP Profile Picture Upload Zone */}
                  <div className="space-y-2">
                    <label className="text-slate-700 font-bold block flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Profile Picture Upload (Drag & Drop)</span>
                      </span>
                      <span className="text-[10px] text-slate-500">PNG, JPG, WEBP up to 10MB</span>
                    </label>

                    <div
                      onDragOver={handlePictureDragOver}
                      onDragLeave={handlePictureDragLeave}
                      onDrop={handlePictureDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                        isDraggingPicture
                          ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                          : 'border-slate-300 bg-slate-50 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePictureSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />

                      {signUpHeadshotUrl ? (
                        <div className="flex items-center justify-between w-full px-2 z-20">
                          <div className="flex items-center space-x-3 text-left">
                            <img
                              src={signUpHeadshotUrl}
                              alt="Preview"
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                            />
                            <div>
                              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Photo Uploaded!</span>
                              </span>
                              <p className="text-[11px] text-slate-500">Click or drop to replace</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSignUpHeadshotUrl('');
                            }}
                            className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:border-rose-300 transition-all cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 flex flex-col items-center">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200 mb-2">
                            <UploadCloud className="w-6 h-6 text-blue-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-900">
                            Drag & Drop your physician photo here or <span className="text-blue-600 underline">browse file</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Optional: You can also upload a photo later in your Vault</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {signUpStep2Error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="text-[11px] font-medium leading-snug">{signUpStep2Error}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignUpStep(1)}
                      className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      ← Back
                    </button>

                    <button
                      type="submit"
                      disabled={isSigningUp}
                      className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-60"
                    >
                      <span>{isSigningUp ? 'Creating account...' : 'Proceed to Email Verification'}</span>
                      {!isSigningUp && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>

                </form>
              ) : (
                /* Step 3: Check Your Email (link-based confirmation) */
                <div className="space-y-4 text-xs">

                  {/* Email Destination Notice Box */}
                  <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 p-4 rounded-2xl space-y-2.5 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl border border-blue-200">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-slate-500 block">Confirmation Email Sent To</span>
                        <span className="text-xs font-mono font-extrabold text-blue-700 select-all">
                          {signUpEmail}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Open that email and click "Confirm email address." You'll be brought right back here, already
                      signed in — no need to come back to this tab manually.
                    </p>
                  </div>

                  <div className="flex items-center justify-center space-x-2 py-2 text-slate-500">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[11px] font-medium">Waiting for email confirmation...</span>
                  </div>

                  {/* Error Notification */}
                  {verificationError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="text-[11px] font-medium leading-snug">{verificationError}</span>
                    </div>
                  )}

                  {/* Resend Confirmation Banner */}
                  {resendSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center space-x-2 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="text-[11px] font-medium">A new confirmation email has been re-sent to {signUpEmail}.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => setSignUpStep(2)}
                      className="text-slate-500 hover:text-slate-700 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit Profile Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Email</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            /* Standard SIGN IN Form */
            <>
              {loginRole === 'admin' ? (
                /* Hospital MSO Admin remains a demo login for this phase */
                <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 p-4 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-700 flex items-center space-x-1.5 uppercase tracking-wider">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hospital MSO Demo Credentials</span>
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-300">
                      Demo Only
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-sans block uppercase font-bold">Username / Email:</span>
                      <span className="text-slate-900 font-bold select-all">{email}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-sans block uppercase font-bold">Password:</span>
                      <span className="text-emerald-600 font-bold select-all">{password}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminDemoAccess}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>⚡ One-Click Access as Hospital MSO Administrator</span>
                  </button>
                </div>
              ) : (
                <>
                  {isDemoUnlocked && (
                    <div className="bg-gradient-to-r from-sky-50 to-white border border-sky-200 p-4 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-sky-700 flex items-center space-x-1.5 uppercase tracking-wider">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Resident Demo Access</span>
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-300">
                          Demo Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Loads a pre-filled sample resident (Dr. Jessie Smith) with a completed passport, so you can preview the resident side without a real account.
                      </p>
                      <button
                        type="button"
                        onClick={handleResidentDemoAccess}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>⚡ One-Click Access as Demo Resident</span>
                      </button>
                    </div>
                  )}

                  {signInError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="text-[11px] font-medium leading-snug">{signInError}</span>
                    </div>
                  )}
                </>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">
                    {loginRole === 'resident' ? 'Resident Email Address' : 'MSO Admin Username'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Logging in...</span>
                  ) : (
                    <>
                      <span>
                        {loginRole === 'resident'
                          ? 'Sign In to Resident Dashboard'
                          : 'Sign In to Hospital MSO Portal'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            </>
          )}

        </div>

        {onShowHospitalPortal && (
          <p className="max-w-xl mx-auto text-center text-xs text-slate-500 mt-5">
            Represent a hospital or health system?{' '}
            <button
              onClick={onShowHospitalPortal}
              className="font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              Create an MSO account →
            </button>
          </p>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1">
        <p onClick={handleSecretFooterTap} className="select-none">
          © 2026 MoonCall Health Technologies Inc. • Medical Resident Moonlighting Platform
        </p>
        <p className="text-[11px] text-slate-500">All hospital names and hourly rates shown for illustrative demo preview.</p>
      </footer>

    </div>
  );
};

