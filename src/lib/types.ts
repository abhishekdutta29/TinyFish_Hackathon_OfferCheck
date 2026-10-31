export interface PaymentDemanded {
  demanded: boolean;
  amount: string | number | null;
}

export interface ExtractedFields {
  company_name: string;
  sender_email: string | null;
  website_url: string | null;
  phone: string | null;
  payment_demanded: PaymentDemanded;
  stipend: string | null;
  mentions_interview: boolean;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckLink {
  title: string;
  url: string;
}

export interface CheckResult {
  name: string;
  status: CheckStatus;
  points: number;
  explanation: string;
  links: CheckLink[];
}

export type Verdict = "Safe" | "Suspicious" | "Likely Scam";

export interface VerificationResponse {
  score: number;
  verdict: Verdict;
  extracted: ExtractedFields;
  checks: CheckResult[];
}
