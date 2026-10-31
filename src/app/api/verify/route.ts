import { NextRequest, NextResponse } from "next/server";
import { extractFields } from "@/lib/extractor";
import {
  checkTextRedFlags,
  checkScamReports,
  checkWebsite,
  checkPresence,
} from "@/lib/checks";
import { CheckResult, VerificationResponse, Verdict, ExtractedFields } from "@/lib/types";
import { getUserFromSession, saveVerificationRecord } from "@/lib/db";

export const maxDuration = 30; // Max allowed duration on Vercel hobby plan

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text.trim() : "";
    const companyInput = typeof body?.company_name === "string" ? body.company_name.trim() : "";
    const emailInput = typeof body?.sender_email === "string" ? body.sender_email.trim() : "";
    const websiteInput = typeof body?.website_url === "string" ? body.website_url.trim() : "";
    const phoneInput = typeof body?.phone === "string" ? body.phone.trim() : "";
    const stipendInput = typeof body?.stipend === "string" ? body.stipend.trim() : "";
    const paymentAmountInput = typeof body?.payment_amount === "string" ? body.payment_amount.trim() : "";

    // Payment demanded flag (handles boolean or nested object)
    let paymentDemandedBool: boolean | undefined = undefined;
    if (typeof body?.payment_demanded === "boolean") {
      paymentDemandedBool = body.payment_demanded;
    } else if (typeof body?.payment_demanded?.demanded === "boolean") {
      paymentDemandedBool = body.payment_demanded.demanded;
    }

    let mentionsInterviewBool: boolean | undefined = undefined;
    if (typeof body?.mentions_interview === "boolean") {
      mentionsInterviewBool = body.mentions_interview;
    }

    const hasAnyInput = rawText || companyInput || emailInput || websiteInput;

    if (!hasAnyInput) {
      return NextResponse.json(
        { error: "Please enter a company name or paste an offer letter / recruiter message to verify." },
        { status: 400 }
      );
    }

    // Step 1: Resolve structured fields
    let extracted: ExtractedFields;

    if (rawText) {
      const extractedFromText = await extractFields(rawText);
      // Allow explicit form slots to override or refine extracted text fields
      extracted = {
        company_name: companyInput || extractedFromText.company_name,
        sender_email: emailInput || extractedFromText.sender_email,
        website_url: websiteInput || extractedFromText.website_url,
        phone: phoneInput || extractedFromText.phone,
        payment_demanded: {
          demanded:
            paymentDemandedBool !== undefined
              ? paymentDemandedBool
              : extractedFromText.payment_demanded.demanded,
          amount:
            paymentAmountInput ||
            body?.payment_demanded?.amount ||
            extractedFromText.payment_demanded.amount,
        },
        stipend: stipendInput || extractedFromText.stipend,
        mentions_interview:
          mentionsInterviewBool !== undefined
            ? mentionsInterviewBool
            : extractedFromText.mentions_interview,
      };
    } else {
      // Direct slot input mode (without full pasted text)
      extracted = {
        company_name: companyInput || "Unknown Company",
        sender_email: emailInput || null,
        website_url: websiteInput || null,
        phone: phoneInput || null,
        payment_demanded: {
          demanded: Boolean(paymentDemandedBool),
          amount: paymentAmountInput || body?.payment_demanded?.amount || null,
        },
        stipend: stipendInput || null,
        mentions_interview: mentionsInterviewBool === true,
      };
    }

    // Synthesize analysis text for rule-based heuristics if no full text was provided
    let analysisText = rawText;
    if (!analysisText) {
      const feeStatement = extracted.payment_demanded.demanded
        ? `Mandatory refundable registration fee and deposit of ${extracted.payment_demanded.amount || "Rs 3,000"} required to pay immediately via UPI to confirm seat.`
        : "Zero fee policy: No charges or fees required for recruitment.";

      const interviewStatement = extracted.mentions_interview
        ? "Candidate cleared the technical interview and HR evaluation rounds."
        : "Direct selection without any interview or assessment.";

      analysisText = `Company: ${extracted.company_name}
Recruiter Email: ${extracted.sender_email || "None listed"}
Website: ${extracted.website_url || "None listed"}
Phone: ${extracted.phone || "None listed"}
Stipend: ${extracted.stipend || "Not specified"}
${feeStatement}
${interviewStatement}`;
    }

    // Step 2: Run all checks in parallel with individual error protection
    const [textFlagsResult, scamReportsResult, websiteResult, presenceResult] =
      await Promise.all([
        Promise.resolve().then(() => checkTextRedFlags(extracted, analysisText)).catch(
          (err): CheckResult => ({
            name: "Text Red Flags",
            status: "warn",
            points: 0,
            explanation: `Could not complete text analysis: ${err instanceof Error ? err.message : "Internal error"}`,
            links: [],
          })
        ),
        checkScamReports(extracted).catch(
          (err): CheckResult => ({
            name: "Scam Reports",
            status: "warn",
            points: 0,
            explanation: `Could not verify online scam reports: ${err instanceof Error ? err.message : "Service timeout"}`,
            links: [],
          })
        ),
        checkWebsite(extracted).catch(
          (err): CheckResult => ({
            name: "Website Verification",
            status: "warn",
            points: 0,
            explanation: `Could not verify website: ${err instanceof Error ? err.message : "Service timeout"}`,
            links: [],
          })
        ),
        checkPresence(extracted).catch(
          (err): CheckResult => ({
            name: "Corporate Presence & Reviews",
            status: "warn",
            points: 0,
            explanation: `Could not verify corporate registry presence: ${err instanceof Error ? err.message : "Service timeout"}`,
            links: [],
          })
        ),
      ]);

    const checks: CheckResult[] = [
      textFlagsResult,
      scamReportsResult,
      websiteResult,
      presenceResult,
    ];

    // Step 3: Calculate score starting at 60 and clamp to 0-100
    const BASE_SCORE = 60;
    const totalPoints = checks.reduce((acc, c) => acc + c.points, 0);
    const score = Math.max(0, Math.min(100, BASE_SCORE + totalPoints));

    // Verdict determination
    let verdict: Verdict = "Suspicious";
    if (score >= 70) {
      verdict = "Safe";
    } else if (score < 40) {
      verdict = "Likely Scam";
    }

    const responseData: VerificationResponse = {
      score,
      verdict,
      extracted,
      checks,
    };

    // If user is authenticated, save record to dashboard history
    try {
      const sessionToken = req.cookies.get("offercheck_session")?.value;
      if (sessionToken) {
        const user = getUserFromSession(sessionToken);
        if (user) {
          saveVerificationRecord(user.id, {
            companyName: extracted.company_name,
            senderEmail: extracted.sender_email,
            websiteUrl: extracted.website_url,
            score,
            verdict,
            extracted,
            checks,
          });
        }
      }
    } catch (saveErr) {
      console.warn("Failed to auto-save record to user history:", saveErr);
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("Verification error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing the verification request." },
      { status: 500 }
    );
  }
}
