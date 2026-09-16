import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  LogOut, 
  User, 
  Sparkles, 
  Database,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isFirebaseActive } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ExamTaker
            </span>
            <span className="text-[9px] sm:text-[10px] font-medium text-indigo-400 -mt-1 tracking-wider uppercase">
              Serverless Integrity
            </span>
          </div>
        </Link>

        {/* Desktop Status and User Menu */}
        <div className="hidden md:flex items-center gap-3">
          {/* Connection Status Badge */}
          <div 
            title={isFirebaseActive ? "Conectado a Google Cloud Firestore" : "Modo Local / Demo Activo"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isFirebaseActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {isFirebaseActive ? 'Firebase Live' : 'Modo Demo'}
            </span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.displayName || (user.role === 'teacher' ? 'Docente' : 'Estudiante')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user.role === 'teacher' ? 'Docente' : (user.studentCode ? `Matrícula: ${user.studentCode}` : 'Alumno')}
                  </span>
                </div>
              </div>

              {user.role === 'teacher' && (
                <Link
                  to="/teacher"
                  className={`text-xs font-medium px-3 py-2 rounded-lg transition ${
                    location.pathname === '/teacher'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Panel Docente
                </Link>
              )}

              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/teacher/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-900 border border-slate-800 transition"
              >
                Acceso Docente
              </Link>
              <Link
                to="/student"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Rendir Examen
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Compact Status Dot */}
          <div 
            title={isFirebaseActive ? "Conectado a Firestore" : "Modo Demo"}
            className="w-2.5 h-2.5 rounded-full mr-1 bg-emerald-400 animate-pulse"
          />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Abrir menú de navegación"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/98 backdrop-blur-xl px-4 py-4 space-y-3 animate-fadeIn">
          {/* Connection Status Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
            <span className="text-slate-400">Estado de Plataforma:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isFirebaseActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Database className="w-3 h-3" />
              {isFirebaseActive ? 'Google Cloud Firestore' : 'Modo Demo'}
            </span>
          </div>

          {user ? (
            <div className="space-y-3">
              {/* User summary card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    {user.displayName || (user.role === 'teacher' ? 'Docente' : 'Estudiante')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user.role === 'teacher' ? 'Docente Autenticado' : (user.studentCode ? `Matrícula: ${user.studentCode}` : 'Alumno')}
                  </span>
                </div>
              </div>

              {/* Navigation Links for Mobile */}
              {user.role === 'teacher' && (
                <Link
                  to="/teacher"
                  onClick={closeMenu}
                  className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 font-semibold text-xs transition"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Panel de Evaluaciones Docente
                  </span>
                  <span>→</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/student"
                onClick={closeMenu}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Rendir Examen (Estudiante)</span>
              </Link>
              <Link
                to="/teacher/login"
                onClick={closeMenu}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
              >
                <span>Acceso Docente</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
