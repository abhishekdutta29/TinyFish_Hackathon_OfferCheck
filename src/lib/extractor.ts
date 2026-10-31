import { ExtractedFields } from "./types";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "proton.me",
  "rediffmail.com",
  "mail.com",
  "aol.com",
  "zoho.com", // personal webmail unless configured with custom domain
]);

export async function extractFields(text: string): Promise<ExtractedFields> {
  const apiKey = process.env.LLM_API_KEY?.trim();

  if (apiKey) {
    try {
      const extracted = await callLLM(text, apiKey);
      if (extracted && extracted.company_name) {
        return sanitizeExtracted(extracted, text);
      }
    } catch (err) {
      console.warn("LLM extraction failed or timed out, falling back to rule-based parser:", err);
    }
  }

  return extractWithRegex(text);
}

async function callLLM(text: string, apiKey: string): Promise<ExtractedFields | null> {
  const prompt = `You are a forensic recruiter analyzer. Extract structured fields from the job offer / recruiter message below.
Respond ONLY with a valid JSON object matching this schema:
{
  "company_name": "string (name of hiring company)",
  "sender_email": "string or null (recruiter email)",
  "website_url": "string or null (company website url with protocol)",
  "phone": "string or null (contact phone number)",
  "payment_demanded": {
    "demanded": boolean (true if candidate is asked to pay any registration, training, laptop deposit, background check, or processing fee),
    "amount": "string or number or null (e.g. 'Rs 3,000' or 3000)"
  },
  "stipend": "string or null (e.g. 'Rs 28,000 per month' or 'Rs 65,000')",
  "mentions_interview": boolean (true ONLY if an actual interview or formal evaluation was conducted; false if 'direct selection without interview' or no interview mentioned)
}

Offer text:
"""
${text.slice(0, 3000)}
"""`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    if (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) {
      // Google Gemini API (AI Studio)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    } else {
      // OpenAI-compatible endpoint
      const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.LLM_MODEL || "gpt-4o-mini";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You extract structured job offer verification data. Output strictly valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return JSON.parse(content);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractWithRegex(text: string): ExtractedFields {
  // 1. Sender Email
  const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const sender_email = emailMatch ? emailMatch[1].toLowerCase() : null;

  // 2. Website URL
  let website_url: string | null = null;
  const urlMatch = text.match(/\bhttps?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?/i);
  if (urlMatch) {
    website_url = urlMatch[0];
  } else {
    const wwwMatch = text.match(/\bwww\.[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?/i);
    if (wwwMatch) {
      website_url = `https://${wwwMatch[0]}`;
    } else if (sender_email) {
      const domain = sender_email.split("@")[1];
      if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
        website_url = `https://www.${domain}`;
      }
    }
  }

  // 3. Phone number
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // 4. Payment Demanded
  const hasFeeKeywords =
    /(?:fee|charge|charges|deposit|security deposit|registration|processing fee|laptop security|training fee|refundable deposit|caution money|seat confirmation|advance)/i.test(
      text
    ) &&
    /(?:pay|paid|deposit|transfer|send|remit|upi|gpay|phonepe|net\s*banking|bank\s*transfer|qr\s*code|fee|deposit)/i.test(
      text
    );

  // Look for payment amount specifically near fee/deposit/payment keywords
  const nearFeeAmountMatch =
    text.match(
      /(?:fee|deposit|registration|security|processing|caution|pay|transfer|remit)\D{0,40}(?:rs\.?|inr|₹|\$)\s*([\d,]+)/i
    ) ||
    text.match(
      /(?:rs\.?|inr|₹|\$)\s*([\d,]+)\D{0,40}(?:fee|deposit|registration|security|processing|caution)/i
    );

  let demanded = false;
  let amount: string | null = null;

  // Watch out for "Zero Fee Policy" / "does not charge any fee"
  const isZeroFeeStatement =
    /(?:does\s*not\s*charge|never\s*charges?|zero\s*fee|no\s*fee\s*(?:is\s*)?required|free\s*of\s*cost)/i.test(
      text
    );

  if (hasFeeKeywords && !isZeroFeeStatement) {
    demanded = true;
    if (nearFeeAmountMatch) {
      amount = `Rs ${nearFeeAmountMatch[1]}`;
    }
  }

  // 5. Stipend / Salary
  let stipend: string | null = null;
  const stipendMatch = text.match(
    /(?:stipend|salary|ctc|package|remuneration|compensation)\D{0,25}(?:(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\s*(?:k|lpa|pm|\/month|per\s*month))?))/i
  );
  if (stipendMatch) {
    stipend = stipendMatch[0].trim();
  } else {
    const monthlyMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+)\s*(?:\/month|per\s*month|pm)\b/i);
    if (monthlyMatch) {
      stipend = `Rs ${monthlyMatch[1]} per month`;
    }
  }

  // 6. Mentions Interview
  // If it explicitly says "without interview" or "no interview" -> false!
  const explicitlyNoInterview =
    /(?:without\s+(?:any\s+)?interview|no\s+interview|direct\s+selection\s+(?:without|based\s+on\s+resume)|direct\s+shortlist)/i.test(
      text
    );

  const hasInterviewMention =
    /(?:technical\s+interview|hr\s+interview|virtual\s+interview|interview\s+round|interview\s+process|telephonic\s+interview|assessment\s+and\s+subsequent\s+.*interview|cleared\s+the\s+interview)/i.test(
      text
    );

  const mentions_interview = !explicitlyNoInterview && hasInterviewMention;

  // 7. Company Name
  let company_name = "Unknown Company";
  const explicitCompanyMatch = text.match(
    /(?:company|organization|employer|firm)\s*[:\-]\s*([A-Za-z0-9&.\s]{2,50})/i
  );
  if (explicitCompanyMatch) {
    company_name = cleanCompanyName(explicitCompanyMatch[1]);
  } else {
    const offerAtMatch = text.match(
      /(?:employment\s+with|offer\s+at|intern\s+at|developer\s+at|selection\s+letter\s*-\s*[A-Za-z0-9\s]+at)\s+([A-Za-z0-9&.\s]{3,50})/i
    );
    if (offerAtMatch) {
      company_name = cleanCompanyName(offerAtMatch[1]);
    } else {
      const corporateSuffixMatch = text.match(
        /\b([A-Z][A-Za-z0-9&.\s]{2,35}?(?:Technologies|Tech\s+Solutions|Solutions|Limited|Ltd|Pvt\s+Ltd|Private\s+Limited|Corporation|Corp|Systems|Consultancy|Services|Labs))\b/
      );
      if (corporateSuffixMatch) {
        company_name = cleanCompanyName(corporateSuffixMatch[1]);
      } else if (website_url) {
        try {
          const host = new URL(website_url).hostname.replace(/^www\./, "");
          const brand = host.split(".")[0];
          company_name = brand.charAt(0).toUpperCase() + brand.slice(1);
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    company_name,
    sender_email,
    website_url,
    phone,
    payment_demanded: {
      demanded,
      amount,
    },
    stipend,
    mentions_interview,
  };
}

function cleanCompanyName(name: string): string {
  return name
    .split(/[\r\n,;]/)[0]
    .replace(/(?:Ref|Date|Key Details|Terms and Conditions).*/gi, "")
    .replace(/[.]+$/, "")
    .trim();
}

function sanitizeExtracted(extracted: Partial<ExtractedFields>, rawText: string): ExtractedFields {
  const fallback = extractWithRegex(rawText);
  return {
    company_name: extracted.company_name?.trim() || fallback.company_name,
    sender_email: extracted.sender_email?.trim() || fallback.sender_email,
    website_url: extracted.website_url?.trim() || fallback.website_url,
    phone: extracted.phone?.trim() || fallback.phone,
    payment_demanded: {
      demanded:
        typeof extracted.payment_demanded?.demanded === "boolean"
          ? extracted.payment_demanded.demanded
          : fallback.payment_demanded.demanded,
      amount: extracted.payment_demanded?.amount || fallback.payment_demanded.amount,
    },
    stipend: extracted.stipend?.trim() || fallback.stipend,
    mentions_interview:
      typeof extracted.mentions_interview === "boolean"
        ? extracted.mentions_interview
        : fallback.mentions_interview,
  };
}
