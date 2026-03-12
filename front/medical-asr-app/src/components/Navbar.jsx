import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Activity, Mic, LayoutDashboard, Settings, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transcription", label: "語音辨識", icon: Mic },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="glass-navbar">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-12">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-medical-600 rounded-xl flex items-center justify-center shadow-lg shadow-medical-200/50 group-hover:bg-medical-700 transition-all duration-300">
              <Activity size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-brand-900 tracking-tight leading-none">MedASR</span>
              <span className="text-[10px] font-bold text-medical-600 uppercase tracking-widest mt-1">Professional</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 uppercase tracking-wide",
                    isActive
                      ? "text-medical-600 bg-medical-50/80"
                      : "text-slate-500 hover:text-brand-900 hover:bg-slate-50"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 pr-6 border-r border-slate-200">
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-brand-900 hover:bg-slate-50 transition-all cursor-pointer" title="設定">
              <Settings size={18} />
            </button>
            <NotificationBell />
          </div>
          
          {/* User Profile Action */}
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-brand-900 leading-none">
                {user?.name} 醫師
              </span>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                外科部門
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black group-hover:border-medical-300 group-hover:bg-white group-hover:shadow-lg transition-all duration-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              title="登出系統"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
