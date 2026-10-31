"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Building2,
  Mail,
  Globe,
  Phone,
  IndianRupee,
  CalendarCheck,
  Coins,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  ShieldQuestion,
  FileText,
  SlidersHorizontal,
  LayoutDashboard,
  HeartHandshake,
  BookOpen,
  AlertOctagon,
  Target,
  Compass,
  Lock,
  Zap,
} from "lucide-react";
import { VerificationResponse, CheckResult, ExtractedFields } from "@/lib/types";

const CHECK_STEPS = [
  { id: "text", label: "Analyzing offer wording & text red flags..." },
  { id: "scam", label: "Searching public complaint forums & scam registries..." },
  { id: "website", label: "Inspecting company website & contact legitimacy..." },
  { id: "presence", label: "Verifying MCA registration, Glassdoor & AmbitionBox..." },
];

export default function HomePage() {
  // Page Navigator State (1: Overview, 2: Background Story, 3: Verifier)
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1);

  // Tab inside Page 3 (Form slots vs Paste mode)
  const [activeTab, setActiveTab] = useState<"form" | "paste">("form");

  // Form Slots State
  const [companyName, setCompanyName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [stipend, setStipend] = useState("");
  const [feeDemanded, setFeeDemanded] = useState(false);
  const [feeAmount, setFeeAmount] = useState("");
  const [mentionsInterview, setMentionsInterview] = useState(true);
  const [offerNotes, setOfferNotes] = useState("");

  // Paste Mode State
  const [inputText, setInputText] = useState("");

  // Verification state
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth & Session state
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Read URL query parameter on mount for direct page linking (e.g. ?page=2 or ?page=3)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get("page");
      if (pageParam === "1" || pageParam === "2" || pageParam === "3") {
        setCurrentPage(parseInt(pageParam, 10) as 1 | 2 | 3);
      }
    }
  }, []);

  // Check auth session on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Not logged in or network error
      }
    }
    checkAuth();
  }, []);

  // Switch page and update URL query smoothly
  const navigateToPage = (pageNum: 1 | 2 | 3) => {
    setCurrentPage(pageNum);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("page", pageNum.toString());
      window.history.pushState({}, "", url.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step ticking simulation while API runs
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setActiveStepIndex(0);
      interval = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev < CHECK_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleReset = () => {
    setCompanyName("");
    setSenderEmail("");
    setWebsiteUrl("");
    setPhone("");
    setStipend("");
    setFeeDemanded(false);
    setFeeAmount("");
    setMentionsInterview(true);
    setOfferNotes("");
    setInputText("");
    setError(null);
  };

  const handleVerify = async () => {
    setError(null);
    setResult(null);

    let payload: Record<string, unknown> = {};

    if (activeTab === "form") {
      if (!companyName.trim() && !senderEmail.trim() && !websiteUrl.trim()) {
        setError("Please enter at least a company name, recruiter email, or website to verify.");
        return;
      }

      payload = {
        mode: "structured",
        companyName: companyName.trim(),
        senderEmail: senderEmail.trim(),
        websiteUrl: websiteUrl.trim(),
        phone: phone.trim(),
        stipend: stipend.trim(),
        feeDemanded: feeDemanded,
        feeAmount: feeDemanded ? feeAmount.trim() : "",
        mentionsInterview: mentionsInterview,
        notes: offerNotes.trim(),
      };
    } else {
      if (!inputText.trim()) {
        setError("Please paste the offer letter, recruiter message, or company text to verify.");
        return;
      }

      if (inputText.trim().length < 25) {
        setError("The pasted text is too short. Please provide a full offer letter, email, or message.");
        return;
      }

      payload = {
        mode: "raw",
        text: inputText.trim(),
      };
    }

    setLoading(true);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Verification failed with HTTP ${res.status}`);
      }

      const data: VerificationResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      console.error("Verification error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during verification. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateToPage(1)}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">OfferCheck</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Live Scanner
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Instant AI & Web Risk Verification for Job and Internship Offers
              </p>
            </div>
          </div>

          {/* Center: 3-Page Pagination Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => navigateToPage(1)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentPage === 1
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>01</span>
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage(2)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentPage === 2
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>02</span>
              <span>Our Story</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage(3)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentPage === 3
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>03</span>
              <span>Offer Verifier</span>
            </button>
          </div>

          {/* Right: Auth Profile / Sign In */}
          <div className="flex items-center space-x-2 text-xs">
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition flex items-center space-x-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setUser(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        {/* ================================================================= */}
        {/* PAGE 1: OVERVIEW & HERO (AS PICTURED IN USER SCREENSHOT)          */}
        {/* ================================================================= */}
        {currentPage === 1 && (
          <div className="py-4 sm:py-10 space-y-10 animate-fadeIn">
            {/* Hero Section matching screenshot */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Recruitment Fraud Detection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Verify any{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  company or job offer
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Check company credentials, recruiter emails, websites, fee demands, and MCA business registries to spot fake job scams before you pay or commit.
              </p>

              {/* Navigation Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateToPage(2)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-md group"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Why We Created This (Our Story)</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPage(3)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 group"
                >
                  <Zap className="w-4 h-4 text-slate-950 font-black" />
                  <span>Launch Live Verifier (Page 3)</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 2: BACKGROUND STORY (WHY WE CREATED THIS WEBSITE)            */}
        {/* ================================================================= */}
        {currentPage === 2 && (
          <div className="py-4 sm:py-8 space-y-8 animate-fadeIn max-w-4xl mx-auto">
            {/* Story Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Page 2 of 3 • The Background Story</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                Why We Created <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">OfferCheck</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                The untold reality of recruitment fraud targeting freshers, and our mission to level the playing field.
              </p>
            </div>

            {/* Story Chapter 1 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 backdrop-blur-sm shadow-xl">
              <div className="flex items-center space-x-3 text-emerald-400">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">The Breaking Point: A Student&apos;s Desperation Exploited</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Every year, millions of college graduates, interns, and eager job seekers submit hundreds of resumes across job boards. They spend late nights grinding coding problems, revising resumes, and hoping for just one genuine opportunity to prove themselves.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Predatory recruitment syndicates know this vulnerability all too well. They harvest resumes from public portals and send out beautifully crafted counterfeit offer letters with stolen corporate logos from reputed tech giants, banks, and fast-growing startups.
              </p>
            </div>

            {/* Story Chapter 2 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 backdrop-blur-sm shadow-xl">
              <div className="flex items-center space-x-3 text-cyan-400">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">The Modern Scam Trap: &ldquo;Refundable Security Deposits&rdquo;</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                The offer letter arrives with a high stipend or a 6 LPA package. There is no technical interview, or just a cursory 3-minute WhatsApp phone call. Then comes the trap:
              </p>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 my-3 text-xs sm:text-sm text-slate-300 italic border-l-4 border-l-rose-500 font-mono">
                &ldquo;Congratulations on your selection. To dispatch your company laptop and generate your corporate security clearance ID, please transfer a refundable deposit of ₹3,500 via UPI within 2 hours to confirm your joining.&rdquo;
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Students borrow money from parents or friends, terrified of losing their big break. The instant the UPI transaction clears, the &ldquo;recruiter&rdquo; deletes the WhatsApp chat, deactivates the phone number, and disappears.
              </p>
            </div>

            {/* Story Chapter 3 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 backdrop-blur-sm shadow-xl">
              <div className="flex items-center space-x-3 text-indigo-400">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">The Unfair Asymmetry We Set Out to Solve</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Corporations spend millions on enterprise background check agencies like Kroll, HireRight, and First Advantage to scrutinize a candidate&apos;s degrees, criminal records, and credit history.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Yet, candidates had <strong className="text-white">zero tools</strong> to check whether the company offering them employment even existed in corporate registries, whether the sender domain was a throwaway clone, or whether the recruiter had dozens of fraud complaints online.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                We created <strong className="text-emerald-400">OfferCheck</strong> to balance the scales. We gave every job seeker access to autonomous intelligence that inspects corporate registries, domain records, and public fraud databases in seconds—completely free, forever.
              </p>
            </div>

            {/* The OfferCheck Oath */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-3">
              <div className="text-xs uppercase tracking-widest font-black text-emerald-400">
                OUR GOLDEN RULE
              </div>
              <blockquote className="text-lg sm:text-2xl font-black text-white max-w-xl mx-auto">
                &ldquo;Legitimate employers pay you. They never ask you to pay them.&rdquo;
              </blockquote>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No real company on earth requires you to send money for uniforms, laptops, gate passes, or training.
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => navigateToPage(1)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview (Page 1)</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToPage(3)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 group"
              >
                <span>Proceed to Live Verifier (Page 3)</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PAGE 3: THE LIVE VERIFICATION SUITE ("THE REST OF IT")            */}
        {/* ================================================================= */}
        {currentPage === 3 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Page 3 of 3 • Autonomous Offer Scanner</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Verify Company Credentials & Offer Legitimacy
                </h1>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => navigateToPage(2)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition flex items-center space-x-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Why we created this</span>
                </button>
              </div>
            </div>

            {/* Input Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
              {/* Top Controls: Mode Switcher & Sample Dropdown */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
                {/* Mode Switcher Tabs */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("form");
                      setError(null);
                    }}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === "form"
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Verification Form (Slots)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("paste");
                      setError(null);
                    }}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === "paste"
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Full Offer Letter</span>
                  </button>
                </div>

                {/* Reset Button */}
                {(companyName || inputText || senderEmail || websiteUrl || phone || stipend || feeDemanded || offerNotes) ? (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition self-end md:self-auto cursor-pointer"
                    title="Reset all inputs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Form</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                    Fill individual slots or switch to paste mode
                  </span>
                )}
              </div>

              {/* TAB 1: VERIFICATION FORM (USER INPUT SLOTS) */}
              {activeTab === "form" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Slot 1: Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Company / Employer Name <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Apex Global Tech Solutions, Infosys, etc."
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition"
                        />
                      </div>
                    </div>

                    {/* Slot 2: Recruiter Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Recruiter Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder="e.g. hr@company.com or apextech2026@gmail.com"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition"
                        />
                      </div>
                    </div>

                    {/* Slot 3: Company Website */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Company Website URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="e.g. https://www.infosys.com"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition"
                        />
                      </div>
                    </div>

                    {/* Slot 4: Recruiter Phone / WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Recruiter Contact Phone / WhatsApp
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Red Flag Indicators Row */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Offer Financials & Process Checks</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Did they ask for payment? */}
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-400 font-medium">
                          Did they demand any registration/laptop fee?
                        </label>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => setFeeDemanded(!feeDemanded)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                              feeDemanded
                                ? "bg-rose-950/60 text-rose-300 border-rose-500/60 shadow-sm"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                            }`}
                          >
                            {feeDemanded ? "⚠️ Yes, Fee Demanded" : "No Fees Demanded"}
                          </button>
                        </div>

                        {feeDemanded && (
                          <div className="mt-2 relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-rose-400 text-xs">
                              ₹
                            </div>
                            <input
                              type="text"
                              value={feeAmount}
                              onChange={(e) => setFeeAmount(e.target.value)}
                              placeholder="e.g. 3000"
                              className="w-full pl-7 pr-3 py-1.5 bg-rose-950/20 border border-rose-800/60 rounded-lg text-xs text-rose-200 placeholder-rose-500/60 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Stipend / CTC */}
                      <div>
                        <label className="block text-xs text-slate-400 font-medium mb-2">
                          Offered Salary / Stipend (per month or CTC)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            value={stipend}
                            onChange={(e) => setStipend(e.target.value)}
                            placeholder="e.g. 45,000/month or 6 LPA"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Was there a real interview? */}
                      <div>
                        <label className="block text-xs text-slate-400 font-medium mb-2">
                          Did you attend a formal interview?
                        </label>
                        <button
                          type="button"
                          onClick={() => setMentionsInterview(!mentionsInterview)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition border flex items-center justify-center space-x-1.5 ${
                            mentionsInterview
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                              : "bg-amber-950/40 text-amber-300 border-amber-800/60"
                          }`}
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>{mentionsInterview ? "Yes, Interview Conducted" : "No Interview (Instant Offer)"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Additional notes or message snippet */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Optional: Offer Letter Text Snippet / Recruiter Message
                    </label>
                    <textarea
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="Paste any specific message snippet, urgency words like 'seats closing today', or payment instructions here..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition resize-y font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE FULL OFFER LETTER TEXTAREA */}
              {activeTab === "paste" && (
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste the offer letter, recruiter WhatsApp message, or appointment email here..."
                    rows={9}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500/80 font-mono transition resize-y leading-relaxed"
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-center space-x-2.5 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Bar */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <p className="text-xs text-slate-500 order-2 sm:order-1">
                  Checks MCA business registries • TinyFish Web Search • Website Scraper • Text Red Flags
                </p>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 order-1 sm:order-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950 font-black" />
                      <span>Verify Company Offer</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Loading Progress State */}
            {loading && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-pulse-subtle">
                <div className="flex items-center space-x-3 mb-5">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <h3 className="text-base font-bold text-white">
                    OfferCheck Agent is investigating company credentials...
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {CHECK_STEPS.map((step, idx) => {
                    const isDone = idx < activeStepIndex;
                    const isCurrent = idx === activeStepIndex;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 text-sm p-3 rounded-xl transition ${
                          isDone
                            ? "bg-emerald-950/30 text-emerald-300 border border-emerald-900/40"
                            : isCurrent
                            ? "bg-slate-800 text-slate-200 border border-slate-700"
                            : "text-slate-500 bg-slate-950/40"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                        )}
                        <span className="font-medium text-xs sm:text-sm">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results View */}
            {result && (
              <div className="space-y-6">
                {/* Top Score Banner */}
                <ScoreOverview result={result} />

                {/* Extracted Metadata Card */}
                <ExtractedCard extracted={result.extracted} />

                {/* Evidence Checks Cards */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                    <ShieldQuestion className="w-5 h-5 text-cyan-400" />
                    <span>Evidence & Risk Factors</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.checks.map((check) => (
                      <CheckCard key={check.name} check={check} />
                    ))}
                  </div>
                </div>

                {/* What to do next Box */}
                <NextStepsBox verdict={result.verdict} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center space-x-4 mb-2 text-slate-400">
            <button onClick={() => navigateToPage(1)} className="hover:text-emerald-400 transition">
              01 Overview
            </button>
            <span>•</span>
            <button onClick={() => navigateToPage(2)} className="hover:text-emerald-400 transition">
              02 Our Story
            </button>
            <span>•</span>
            <button onClick={() => navigateToPage(3)} className="hover:text-emerald-400 transition">
              03 Offer Verifier
            </button>
          </div>
          <p className="font-medium text-slate-400">
            OfferCheck — Autonomous Employment & Company Risk Verifier
          </p>
          <p className="text-slate-500">
            Disclaimer: This is a risk assessment, not a guarantee.
          </p>
          <p className="text-slate-600 text-[11px]">
            Always perform due diligence directly with officially listed corporate contacts before transferring money or sharing documents.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Ring & Overview Component
// ---------------------------------------------------------------------------
function ScoreOverview({ result }: { result: VerificationResponse }) {
  const { score, verdict } = result;

  let strokeColor = "stroke-emerald-500";
  let textColor = "text-emerald-400";
  let bgColor = "bg-emerald-950/30 border-emerald-500/30";
  let badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  let Icon = ShieldCheck;
  let summaryText = "This offer shows characteristics of a legitimate corporate recruitment process.";

  if (verdict === "Suspicious") {
    strokeColor = "stroke-amber-500";
    textColor = "text-amber-400";
    bgColor = "bg-amber-950/30 border-amber-500/30";
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    Icon = ShieldAlert;
    summaryText = "Several warning signs detected. Proceed with extreme caution and verify via official HR channels.";
  } else if (verdict === "Likely Scam") {
    strokeColor = "stroke-rose-500";
    textColor = "text-rose-400";
    bgColor = "bg-rose-950/30 border-rose-500/30";
    badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
    Icon = ShieldX;
    summaryText = "High probability of recruitment fraud or upfront fee extortion. DO NOT pay any money or share sensitive documents.";
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-6 rounded-2xl border ${bgColor} shadow-2xl backdrop-blur-sm transition-all`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left: Ring */}
        <div className="flex items-center space-x-6">
          <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className={`${strokeColor} transition-all duration-1000 ease-out`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-3xl font-extrabold ${textColor}`}>{score}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Trust Score
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <Icon className={`w-6 h-6 ${textColor}`} />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Final Verdict:
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor}`}
              >
                {verdict}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">{summaryText}</h2>
            <p className="text-xs text-slate-400 max-w-md">
              Score is computed based on 6 text forensics rules, public fraud reports, live website checks, and official company registers.
            </p>
          </div>
        </div>

        {/* Right: Quick Gauge */}
        <div className="w-full sm:w-48 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Risk Thresholds
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-medium">Safe</span>
            <span className="text-slate-400">70 - 100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-medium">Suspicious</span>
            <span className="text-slate-400">40 - 69</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-rose-400 font-medium">Likely Scam</span>
            <span className="text-slate-400">&lt; 40</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted Entities Card
// ---------------------------------------------------------------------------
function ExtractedCard({ extracted }: { extracted: ExtractedFields }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center space-x-2">
        <Info className="w-4 h-4 text-emerald-400" />
        <span>Verified Company Entities & Offer Structure</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        {/* Company */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-slate-500 flex items-center space-x-1 mb-1 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>Company</span>
          </div>
          <p className="font-semibold text-slate-200 truncate" title={extracted.company_name}>
            {extracted.company_name || "Not specified"}
          </p>
        </div>

        {/* Email */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-slate-500 flex items-center space-x-1 mb-1 font-medium">
            <Mail className="w-3.5 h-3.5" />
            <span>Recruiter Email</span>
          </div>
          <p className="font-semibold text-slate-200 truncate" title={extracted.sender_email || ""}>
            {extracted.sender_email || "None listed"}
          </p>
        </div>

        {/* Website */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-slate-500 flex items-center space-x-1 mb-1 font-medium">
            <Globe className="w-3.5 h-3.5" />
            <span>Website</span>
          </div>
          <p className="font-semibold text-slate-200 truncate">
            {extracted.website_url ? (
              <a
                href={extracted.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center space-x-0.5"
              >
                <span className="truncate">{extracted.website_url.replace(/^https?:\/\//, "")}</span>
              </a>
            ) : (
              "None listed"
            )}
          </p>
        </div>

        {/* Fee Demanded */}
        <div
          className={`p-3 rounded-xl border ${
            extracted.payment_demanded.demanded
              ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
              : "bg-slate-950 border-slate-800/80 text-slate-200"
          }`}
        >
          <div className="text-slate-400 flex items-center space-x-1 mb-1 font-medium">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Fee Demanded</span>
          </div>
          <p className="font-bold">
            {extracted.payment_demanded.demanded
              ? extracted.payment_demanded.amount || "Yes (Upfront Fee)"
              : "No Fee (Pass)"}
          </p>
        </div>

        {/* Interview */}
        <div
          className={`p-3 rounded-xl border ${
            extracted.mentions_interview
              ? "bg-slate-950 border-slate-800/80 text-slate-200"
              : "bg-amber-950/30 border-amber-800/60 text-amber-200"
          }`}
        >
          <div className="text-slate-400 flex items-center space-x-1 mb-1 font-medium">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Interview</span>
          </div>
          <p className="font-semibold">
            {extracted.mentions_interview ? "Verified Mention" : "No Interview"}
          </p>
        </div>

        {/* Stipend */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-slate-500 flex items-center space-x-1 mb-1 font-medium">
            <Coins className="w-3.5 h-3.5" />
            <span>Stipend</span>
          </div>
          <p className="font-semibold text-slate-200 truncate" title={extracted.stipend || ""}>
            {extracted.stipend || "Not specified"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual Check Result Card
// ---------------------------------------------------------------------------
function CheckCard({ check }: { check: CheckResult }) {
  const isPass = check.status === "pass";
  const isWarn = check.status === "warn";
  const isFail = check.status === "fail";

  let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let borderCard = "border-slate-800 hover:border-slate-700";
  let Icon = CheckCircle2;
  let iconColor = "text-emerald-400";

  if (isWarn) {
    statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    borderCard = "border-amber-900/30 hover:border-amber-700/50";
    Icon = AlertTriangle;
    iconColor = "text-amber-400";
  } else if (isFail) {
    statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    borderCard = "border-rose-900/40 hover:border-rose-700/60";
    Icon = XCircle;
    iconColor = "text-rose-400";
  }

  const pointString =
    check.points > 0 ? `+${check.points} pts` : check.points < 0 ? `${check.points} pts` : "0 pts";

  return (
    <div
      className={`bg-slate-900/80 border ${borderCard} rounded-2xl p-5 flex flex-col justify-between shadow-md transition`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2.5">
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <h4 className="font-bold text-sm text-slate-100">{check.name}</h4>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusBadge}`}
            >
              {check.status}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                check.points > 0
                  ? "bg-emerald-950 text-emerald-400"
                  : check.points < 0
                  ? "bg-rose-950 text-rose-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {pointString}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{check.explanation}</p>
      </div>

      {check.links && check.links.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Evidence & Sources:
          </div>
          <ul className="space-y-1.5">
            {check.links.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 truncate transition group"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                  <span className="truncate">{link.title || link.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// "What to do next" Box
// ---------------------------------------------------------------------------
function NextStepsBox({ verdict }: { verdict: string }) {
  const isHighRisk = verdict === "Likely Scam" || verdict === "Suspicious";

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center space-x-2.5 mb-4">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <h3 className="text-base font-bold text-white">What To Do Next (Candidate Defense Guide)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Step 1 */}
        <div
          className={`p-4 rounded-xl border ${
            isHighRisk ? "bg-rose-950/20 border-rose-900/40" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="font-bold text-slate-100 mb-1.5 flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-black">
              1
            </span>
            <span>Never Pay Any Fees</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Legitimate companies NEVER ask candidates to pay for training kits, laptop security, registration, or onboarding. Any demand for UPI, crypto, or wire transfer is fraudulent.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-xl border bg-slate-900/60 border-slate-800">
          <div className="font-bold text-slate-100 mb-1.5 flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">
              2
            </span>
            <span>Verify Official Channels</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Look up the company on LinkedIn and message a verified employee or HR manager directly. Check whether the sender domain matches the official website exactly.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-xl border bg-slate-900/60 border-slate-800">
          <div className="font-bold text-slate-100 mb-1.5 flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
              3
            </span>
            <span>Report Cyber Scams</span>
          </div>
          <p className="text-slate-400 leading-relaxed mb-2">
            If you were defrauded or sent a phishing offer, immediately file a complaint on the National Cyber Crime Portal or call national helpline 1930.
          </p>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <span>Visit cybercrime.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
