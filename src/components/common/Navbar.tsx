import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User, Sparkles, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ExamTaker
            </span>
            <span className="text-[10px] font-medium text-indigo-400 -mt-1 tracking-wider uppercase">
              Serverless Integrity
            </span>
          </div>
        </Link>

        {/* Status and User Menu */}
        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div 
            title={isFirebaseActive ? "Conectado a Google Cloud Firestore" : "Modo Local / Demo Activo"}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
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
                  className="hidden md:inline-flex text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
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
      </div>
    </header>
  );
};
