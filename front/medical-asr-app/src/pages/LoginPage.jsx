import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] animate-slide-up">
        
        {/* Professional Clinical Branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-14 h-14 bg-medical-600 rounded-xl flex items-center justify-center
                          shadow-[0_4px_12px_rgba(8,145,178,0.25)] mb-6">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-2">MedASR 臨床醫療平台</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em]">Medical Intelligence Systems</p>
        </div>

        {/* Login Container */}
        <div className="card p-8 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
            <ShieldCheck size={18} className="text-medical-600" />
            <h2 className="text-base font-bold text-slate-800">醫師帳戶安全登入</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">帳號代碼</label>
              <input
                className="input"
                placeholder="請輸入醫師登入代號"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">密碼</label>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPw ? "text" : "password"}
                  placeholder="請輸入您的安全密碼"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400
                             hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-600 flex items-center gap-2">
                <Activity size={14} className="shrink-0 rotate-180" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-4"
            >
              {loading ? (
                <Loader />
              ) : (
                <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-[13px]">
                  啟動安全連線 <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed">
              受保護的醫療資訊系統。未經授權禁止存取。<br />
              如有疑問，請聯繫 <a href="#" className="text-medical-600 font-bold hover:underline">資訊管理部門</a>。
            </p>
          </div>
        </div>

        {/* System Info Footer */}
        <div className="mt-12 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] opacity-60">
          <span>V1.0.4-LTS</span>
          <span>Security Protocol 4.2</span>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <span className="font-bold uppercase tracking-widest text-[13px]">驗證憑證中...</span>
    </div>
  );
}
