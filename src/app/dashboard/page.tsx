"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  PlusCircle,
  LogOut,
  Building2,
  Calendar,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  PhoneCall,
  Search,
  Filter,
} from "lucide-react";

interface VerificationRecord {
  id: string;
  userId: string;
  companyName: string;
  senderEmail: string | null;
  websiteUrl: string | null;
  score: number;
  verdict: "Safe" | "Suspicious" | "Likely Scam";
  extracted: any;
  checks: any[];
  createdAt: string;
}

interface DashboardStats {
  totalScans: number;
  scamsCount: number;
  suspiciousCount: number;
  safeCount: number;
  avgScore: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    scamsCount: 0,
    suspiciousCount: 0,
    safeCount: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.user) {
        router.push("/login");
        return;
      }
      setUser(meData.user);

      const historyRes = await fetch("/api/dashboard/history");
      const historyData = await historyRes.json();
      if (historyRes.ok) {
        setRecords(historyData.records || []);
        if (historyData.stats) {
          setStats(historyData.stats);
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      router.push("/login");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this scan record from your history?")) {
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/history?id=${recordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        if (selectedRecord?.id === recordId) {
          setSelectedRecord(null);
        }
        // Update stats
        setStats((prev) => {
          const updated = records.filter((r) => r.id !== recordId);
          return {
            totalScans: updated.length,
            scamsCount: updated.filter((r) => r.verdict === "Likely Scam").length,
            suspiciousCount: updated.filter((r) => r.verdict === "Suspicious").length,
            safeCount: updated.filter((r) => r.verdict === "Safe").length,
            avgScore:
              updated.length > 0
                ? Math.round(updated.reduce((a, b) => a + b.score, 0) / updated.length)
                : 0,
          };
        });
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.senderEmail && r.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterVerdict === "all" || r.verdict === filterVerdict;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm font-semibold">Loading your security dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5 text-slate-950 font-bold" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">OfferCheck</span>
            </Link>
            <span className="hidden sm:inline-block text-slate-600">/</span>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Security Dashboard
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Verify New Offer</span>
            </Link>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-300 font-medium hidden md:inline-block">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome back, {user?.name || "Defender"}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Your real-time job offer threat surveillance center and verified credentials history.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
              Account: <span className="text-slate-200 font-semibold">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Scans */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Total Scans
            </div>
            <div className="text-2xl font-black text-white">{stats.totalScans}</div>
            <div className="text-[11px] text-slate-500 mt-1">Offers investigated</div>
          </div>

          {/* Scams Blocked */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-4 shadow-md">
            <div className="text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center space-x-1">
              <ShieldX className="w-3.5 h-3.5" />
              <span>Scams Blocked</span>
            </div>
            <div className="text-2xl font-black text-rose-400">{stats.scamsCount}</div>
            <div className="text-[11px] text-rose-300/60 mt-1">Fee traps identified</div>
          </div>

          {/* Suspicious Offers */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-4 shadow-md">
            <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspicious</span>
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.suspiciousCount}</div>
            <div className="text-[11px] text-amber-300/60 mt-1">High risk indicators</div>
          </div>

          {/* Verified Safe */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-4 shadow-md">
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Safe</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.safeCount}</div>
            <div className="text-[11px] text-emerald-300/60 mt-1">Legitimate employers</div>
          </div>
        </div>

        {/* Verification History Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Verification History</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {records.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved audit trails with trust scores and forensic evidence
              </p>
            </div>

            {/* Search and Filters */}
            {records.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-44"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <Filter className="w-3 h-3 text-slate-500 ml-1" />
                  <select
                    value={filterVerdict}
                    onChange={(e) => setFilterVerdict(e.target.value)}
                    className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs pr-1"
                  >
                    <option value="all">All Verdicts</option>
                    <option value="Safe">Safe</option>
                    <option value="Suspicious">Suspicious</option>
                    <option value="Likely Scam">Likely Scam</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Record Items */}
          {records.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Verification Records Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Verify a company, recruiter email, or appointment letter to automatically archive the risk score and evidence cards here.
              </p>
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Run Your First Verification</span>
              </Link>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No verification records match your search criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((r) => {
                const isScam = r.verdict === "Likely Scam";
                const isSafe = r.verdict === "Safe";
                const isWarn = r.verdict === "Suspicious";

                const badgeBg = isScam
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : isSafe
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30";

                const scoreColor = isScam
                  ? "text-rose-400"
                  : isSafe
                  ? "text-emerald-400"
                  : "text-amber-400";

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                        <span className={`text-base font-extrabold ${scoreColor}`}>{r.score}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                          Score
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-sm text-white">{r.companyName}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeBg}`}
                          >
                            {r.verdict}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          {r.senderEmail && (
                            <span className="truncate max-w-[200px]" title={r.senderEmail}>
                              ✉️ {r.senderEmail}
                            </span>
                          )}
                          {r.websiteUrl && (
                            <span className="truncate max-w-[180px] text-cyan-400">
                              🌐 {r.websiteUrl.replace(/^https?:\/\//, "")}
                            </span>
                          )}
                          <span className="text-slate-500 flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center space-x-1 transition"
                      >
                        <span>View Evidence</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Selected Record Evidence Breakdown */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white">
                    {selectedRecord.companyName} — Forensic Evidence
                  </h3>
                  <p className="text-xs text-slate-400">
                    Scanned on {new Date(selectedRecord.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>

              {/* Status & Score */}
              <div className="flex items-center space-x-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-2xl font-black text-white">
                  Score: {selectedRecord.score}/100
                </div>
                <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                  Verdict: <span className="text-emerald-400">{selectedRecord.verdict}</span>
                </div>
              </div>

              {/* Checks */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Check Results Breakdown
                </div>
                {selectedRecord.checks?.map((c, i) => (
                  <div key={i} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{c.name}</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          c.status === "pass"
                            ? "bg-emerald-950 text-emerald-400"
                            : c.status === "fail"
                            ? "bg-rose-950 text-rose-400"
                            : "bg-amber-950 text-amber-400"
                        }`}
                      >
                        {c.status} ({c.points > 0 ? `+${c.points}` : c.points} pts)
                      </span>
                    </div>
                    <p className="text-slate-400">{c.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Defense & Cyber Helpline Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400">
              <PhoneCall className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                Defrauded or Encountered Fake Recruitment?
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Never pay advance fees. If you transferred funds to a fraudulent job recruiter, report immediately to the National Cyber Crime Helpline at <strong className="text-white">1930</strong> or register a complaint online.
            </p>
          </div>

          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs transition flex-shrink-0"
          >
            <span>Visit cybercrime.gov.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        OfferCheck — Anti-Fraud Job Verification Platform
      </footer>
    </div>
  );
}
