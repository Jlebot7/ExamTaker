import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#012624]/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 group shrink-0">
          <div className="w-8 h-8 rounded-md bg-[linear-gradient(90deg,rgb(0,130,124)_0%,rgb(203,255,252)_100%)] flex items-center justify-center text-[#012624] font-bold text-xs">
            ▲
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-medium text-white tracking-[-0.03em] uppercase">
              Auros
            </span>
            <span className="eyebrow-label text-[9px] text-[#edfffe] -mt-0.5 tracking-[0.14em]">
              Abyssal Terminal
            </span>
          </div>
        </Link>

        {/* Center / Ghost Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link
            to="/"
            className={`text-xs uppercase tracking-[0.12em] font-medium transition ${
              location.pathname === '/' ? 'text-white' : 'text-[#bbc7c6] hover:text-white'
            }`}
          >
            Inicio
          </Link>
          <Link
            to="/student"
            className={`text-xs uppercase tracking-[0.12em] font-medium transition ${
              location.pathname.startsWith('/student') || location.pathname.startsWith('/exam')
                ? 'text-white'
                : 'text-[#bbc7c6] hover:text-white'
            }`}
          >
            Portal Evaluación
          </Link>
          <Link
            to="/teacher"
            className={`text-xs uppercase tracking-[0.12em] font-medium transition ${
              location.pathname.startsWith('/teacher') ? 'text-white' : 'text-[#bbc7c6] hover:text-white'
            }`}
          >
            Gestión Docente
          </Link>
        </nav>

        {/* Desktop Status and User Menu */}
        <div className="hidden md:flex items-center gap-3">
          {/* Connection Status Badge (Instrument Style) */}
          <div 
            title={isFirebaseActive ? "Conectado a Google Cloud Firestore" : "Modo Local / Demo Activo"}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider uppercase bg-[#011d1c] border border-white/10 text-[#edfffe]"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseActive ? 'bg-[#cbfffc] animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{isFirebaseActive ? 'Cloud Live' : 'Local Demo'}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#003734] border border-white/10">
                <div className="w-6 h-6 rounded-md bg-[#011d1c] text-[#cbfffc] flex items-center justify-center text-xs font-mono">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-white leading-tight">
                    {user.displayName || (user.role === 'teacher' ? 'Docente' : 'Estudiante')}
                  </span>
                  <span className="text-[10px] text-[#bbc7c6] uppercase font-mono tracking-wider">
                    {user.role === 'teacher' ? 'Docente' : (user.studentCode ? `ID: ${user.studentCode}` : 'Alumno')}
                  </span>
                </div>
              </div>

              {user.role === 'teacher' && (
                <Link
                  to="/teacher"
                  className={`text-xs uppercase tracking-[0.08em] font-medium px-3.5 py-2 rounded-md transition ${
                    location.pathname === '/teacher'
                      ? 'bg-[#003734] text-white border border-[#cbfffc]/40'
                      : 'text-[#bbc7c6] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-md text-[#bbc7c6] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/teacher/login"
                className="text-xs uppercase tracking-[0.08em] font-medium text-[#bbc7c6] hover:text-white px-3.5 py-2 rounded-md hover:bg-white/5 border border-white/10 transition"
              >
                Acceso Docente
              </Link>
              <Link
                to="/student"
                className="btn-aurora px-4 py-2 flex items-center gap-1.5 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#012624]" />
                <span>Rendir Examen</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Abrir menú de navegación"
            className="p-2 rounded-md text-[#bbc7c6] hover:text-white bg-[#003734] border border-white/10 transition focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#011d1c] px-4 py-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <span className="text-[#bbc7c6]">Estado de Plataforma:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-white/10 bg-[#003734] text-[#edfffe]">
              <Database className="w-3 h-3 text-[#cbfffc]" />
              {isFirebaseActive ? 'Google Cloud Firestore' : 'Modo Demo'}
            </span>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#003734] border border-white/10">
                <div className="w-8 h-8 rounded-md bg-[#011d1c] text-[#cbfffc] flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">
                    {user.displayName || (user.role === 'teacher' ? 'Docente' : 'Estudiante')}
                  </span>
                  <span className="text-[10px] text-[#bbc7c6] font-mono">
                    {user.role === 'teacher' ? 'Docente' : (user.studentCode ? `Matrícula: ${user.studentCode}` : 'Alumno')}
                  </span>
                </div>
              </div>

              {user.role === 'teacher' && (
                <Link
                  to="/teacher"
                  onClick={closeMenu}
                  className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-md bg-[#003734] border border-white/10 text-[#edfffe] text-xs font-medium uppercase tracking-[0.08em] transition"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Panel Docente
                  </span>
                  <span>↗</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-md text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs font-medium uppercase tracking-[0.08em] transition"
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
                className="btn-aurora w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-medium uppercase"
              >
                <Sparkles className="w-4 h-4" />
                <span>Rendir Examen</span>
              </Link>
              <Link
                to="/teacher/login"
                onClick={closeMenu}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#003734] border border-white/10 text-white font-medium text-xs uppercase tracking-[0.08em] transition"
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
