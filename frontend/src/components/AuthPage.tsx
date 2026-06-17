import React, { useState } from 'react';
import { useAuthStore, MOCK_USERS, type Role } from '@/store/authStore';
import { Shield, Eye, EyeOff, AlertCircle, Zap } from 'lucide-react';

type AuthView = 'login' | 'register';

export default function AuthPage() {
  const { login } = useAuthStore();
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('Field Inspector');
  const [policeStation, setPoliceStation] = useState('Yelahanka');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const POLICE_STATIONS = [
    'Yelahanka', 'HAL Old Airport', 'Sadashivanagar', 'Halasuru Gate', 
    'Byatarayanapura', 'Yeshwanthpura', 'Hennuru', 'Kodigehalli', 'Banaswadi', 'K.R. Pura'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Invalid username or password.');
      }

      const data = await res.json();
      login({
        username,
        role: data.role,
        police_station: data.police_station,
        token: data.access_token,
        email: data.email
      });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);

    try {
      const regRes = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role,
          police_station: role === 'Field Inspector' ? policeStation : null,
          email
        })
      });

      if (!regRes.ok) {
        const errData = await regRes.json();
        throw new Error(errData.detail || 'Registration failed.');
      }

      // Log in immediately
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const loginRes = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        body: formData
      });

      if (!loginRes.ok) {
        throw new Error('Registered successfully, but automatic login failed. Please sign in.');
      }

      const data = await loginRes.json();
      login({
        username,
        role: data.role,
        police_station: data.police_station,
        token: data.access_token,
        email: data.email
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (u: string) => {
    setError('');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', u);
      formData.append('password', 'password');

      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Quick login failed. Make sure the backend is running and seeded.');
      }

      const data = await res.json();
      login({
        username: u,
        role: data.role,
        police_station: data.police_station,
        token: data.access_token,
        email: data.email
      });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600/5 blur-3xl animate-pulse" style={{animationDelay:'1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(199 89% 56%)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-4 glow-blue">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">RESILIO</h1>
          <p className="text-muted-foreground text-sm mt-1">Traffic Intelligence Command System</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1 mb-6">
            <button
              onClick={() => { setView('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'login' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setView('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'register' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Register
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Username</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)} required
                  placeholder="commissioner1"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Authenticating...</> : 'Sign In to Command Center'}
              </button>

              {/* Quick login */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center mb-3 flex items-center gap-2"><Zap className="w-3 h-3" />Quick Access (Demo)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[['commissioner1', 'Commissioner', 'bg-blue-500/10 text-blue-400 border-blue-500/20'], ['inspector1', 'Inspector', 'bg-green-500/10 text-green-400 border-green-500/20'], ['planner1', 'Planner', 'bg-purple-500/10 text-purple-400 border-purple-500/20']].map(([u, label, cls]) => (
                    <button key={u} type="button" onClick={() => quickLogin(u)}
                      className={`text-xs py-2 px-1 rounded-lg border font-medium transition-all hover:opacity-80 ${cls}`}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Register Form */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Choose a username"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.gov"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat password"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Select Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="Field Inspector">Field Inspector (Jurisdiction limited)</option>
                  <option value="Command Commissioner">Command Commissioner (Global admin)</option>
                  <option value="Transit Planner">Transit Planner (Analytics & Routing)</option>
                </select>
              </div>
              {role === 'Field Inspector' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Designated Police Station</label>
                  <select
                    value={policeStation}
                    onChange={e => setPoliceStation(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    {POLICE_STATIONS.map(ps => (
                      <option key={ps} value={ps}>{ps} PS</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Creating account...</> : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Resilio Command System v1.0 — Bengaluru Traffic Management
        </p>
      </div>
    </div>
  );
}
