import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { doctorLogin } from "../lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ name: "", password: "" });
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await doctorLogin(form.name, form.password);
      login(data.doctor, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-medical-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-[450px] animate-fade-in relative z-10">
        
        {/* Professional Clinical Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-medical-600 rounded-[2rem] flex items-center justify-center
                          shadow-[0_20px_40px_rgba(8,145,178,0.25)] mb-8 ring-8 ring-white">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-brand-900 tracking-tight leading-none mb-3">MedASR 臨床助理系統</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100">
            Medical Intelligence Infrastructure
          </p>
        </div>

        {/* Login Container */}
        <div className="glass-card p-10 bg-white/90 border border-white ring-8 ring-slate-900/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-medical-50 flex items-center justify-center text-medical-600">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-sm font-black text-brand-900 uppercase tracking-widest">醫師身份安全驗證</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">帳號代碼</label>
              <input
                className="input"
                placeholder="Medical License ID / Username"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">安全密碼</label>
              <div className="relative">
                <input
                  className="input pr-14"
                  type={showPw ? "text" : "password"}
                  placeholder="System Access Key"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300
                             hover:text-medical-600 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[11px] font-bold text-red-600 flex items-center gap-3 animate-slide-up">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 mt-6 shadow-xl shadow-medical-200"
            >
              {loading ? (
                <Loader />
              ) : (
                <span className="flex items-center gap-3 font-black uppercase tracking-[0.3em] text-[12px]">
                  Authenticate <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
              醫療數據受加密保護，符合 HIPAA 規範及本院資安條款<br/>
              MEDICAL DATA IS ENCRYPTED AND PROTECTED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center gap-4">
      <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <span className="font-black uppercase tracking-[0.2em] text-[12px]">憑證驗證中...</span>
    </div>
  );
}

