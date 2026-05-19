import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("이메일을 입력해 주세요."); return; }
    if (!password) { setError("비밀번호를 입력해 주세요."); return; }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setLocation("/");
  };

  const fillDemo = (role: "admin" | "employee") => {
    if (role === "admin") {
      setEmail("admin@ssakasports.com");
      setPassword("admin1234");
    } else {
      setEmail("employee@ssakasports.com");
      setPassword("emp1234");
    }
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 px-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-coral-200/20 rounded-full blur-3xl" style={{ background: "rgba(255,127,80,0.08)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* 카드 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
              <span className="text-2xl font-black text-white">싸</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">싸카스포츠</h1>
            <p className="text-teal-100 text-sm mt-1">HR Platform</p>
          </div>

          {/* 폼 */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 text-center">로그인</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@ssakasports.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3.5 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-white font-semibold py-2.5 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-sm shadow-teal-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    로그인 중...
                  </span>
                ) : "로그인"}
              </button>
            </form>

            {/* 데모 계정 빠른 입력 */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-3">데모 계정으로 빠르게 시작</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo("admin")}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors text-teal-700 text-xs font-medium"
                >
                  <span className="text-base">👑</span>
                  <span>관리자 계정</span>
                  <span className="text-teal-400 font-normal">admin@ssakasports.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("employee")}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 text-xs font-medium"
                >
                  <span className="text-base">👤</span>
                  <span>직원 계정</span>
                  <span className="text-slate-400 font-normal">employee@ssakasports.com</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Copyright 2026 ⓒ ChoiEunsun. All rights reserved. (싸카스포츠 HR Platform)
        </p>
      </div>
    </div>
  );
}
