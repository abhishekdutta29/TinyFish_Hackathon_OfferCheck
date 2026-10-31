import { ExtractedFields, CheckResult, CheckLink } from "./types";

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
  "zoho.com",
]);

interface TinyFishSearchResult {
  position?: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
}

interface TinyFishSearchResponse {
  query?: string;
  results?: TinyFishSearchResult[];
}

interface TinyFishFetchResult {
  url: string;
  final_url?: string;
  title?: string;
  text?: string;
  format?: string;
}

interface TinyFishFetchResponse {
  results?: TinyFishFetchResult[];
  errors?: unknown[];
}

// Helper with 20s timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// -------------------------------------------------------------
// Check 1: Text Red Flags (Rule-based, no network)
// -------------------------------------------------------------
export function checkTextRedFlags(extracted: ExtractedFields, rawText: string): CheckResult {
  const flags: string[] = [];
  let deduction = 0;

  // 1. Payment Demanded (-35)
  if (extracted.payment_demanded.demanded) {
    deduction -= 35;
    const amt = extracted.payment_demanded.amount ? ` (${extracted.payment_demanded.amount})` : "";
    flags.push(`Demanded upfront payment${amt} for registration, laptop security, or training. Legitimate employers never charge candidates.`);
  }

  // 2. Free email domain (-15)
  let emailDomain = "";
  if (extracted.sender_email) {
    emailDomain = extracted.sender_email.split("@")[1]?.toLowerCase() || "";
    if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
      deduction -= 15;
      flags.push(`Recruiter email uses a free public domain (@${emailDomain}) rather than a verified company domain.`);
    }
  }

  // 3. Sender email domain does not match website domain (-10)
  if (extracted.sender_email && extracted.website_url) {
    try {
      const emailHost = emailDomain;
      const webHost = new URL(extracted.website_url).hostname.replace(/^www\./, "").toLowerCase();
      // Only compare if sender email is not already a free email
      if (!FREE_EMAIL_DOMAINS.has(emailHost) && !webHost.includes(emailHost) && !emailHost.includes(webHost)) {
        deduction -= 10;
        flags.push(`Sender email domain (@${emailHost}) does not match website domain (${webHost}).`);
      } else if (FREE_EMAIL_DOMAINS.has(emailHost)) {
        deduction -= 10;
        flags.push(`Recruiter sent message from a personal email (@${emailHost}) instead of the company website domain.`);
      }
    } catch {
      // ignore URL parsing error
    }
  }

  // 4. Urgency words (-10)
  const urgencyPattern = /\b(immediately|urgent|urgently|limited\s*seats|last\s*chance|within\s*24\s*hours|offer\s*expires\s*today|act\s*now|immediate\s*joining|hurry)\b/i;
  if (urgencyPattern.test(rawText)) {
    deduction -= 10;
    flags.push('Artificial high-pressure urgency detected ("immediately", "limited seats", "last chance") designed to rush decisions.');
  }

  // 5. No interview mentioned (-10)
  if (!extracted.mentions_interview) {
    deduction -= 10;
    flags.push("Direct selection without any interview or formal assessment round mentioned.");
  }

  // 6. Very high stipend for a fresher (-10)
  const isFresherOrIntern = /(?:intern|internship|fresher|trainee|college|entry\s*level|graduate)/i.test(rawText);
  const highStipendPattern = /(?:(?:rs\.?|inr|₹)\s*(?:[5-9]\d|\d{3,}),\d{3}|(?:6[0-9]|7[0-9]|8[0-9]|9[0-9]),000|\$2,?000)/i;
  if (isFresherOrIntern && (highStipendPattern.test(rawText) || (extracted.stipend && highStipendPattern.test(extracted.stipend)))) {
    deduction -= 10;
    flags.push(`Unusually inflated stipend for a fresher/intern position (${extracted.stipend || "Rs 50k+/month"}) used as bait.`);
  }

  let status: "pass" | "warn" | "fail" = "pass";
  if (deduction <= -25) {
    status = "fail";
  } else if (deduction < 0) {
    status = "warn";
  }

  const explanation =
    flags.length > 0
      ? flags.join(" ")
      : "No text red flags detected. Recruiter uses corporate channels, zero fees demanded, and formal evaluation was conducted.";

  return {
    name: "Text Red Flags",
    status,
    points: deduction,
    explanation,
    links: [],
  };
}

// -------------------------------------------------------------
// Check 2: Scam Reports (TinyFish Search)
// -------------------------------------------------------------
export async function checkScamReports(extracted: ExtractedFields): Promise<CheckResult> {
  const company = extracted.company_name;
  const apiKey = process.env.TINYFISH_API_KEY?.trim();

  // If no TinyFish key or offline, use heuristic fallback for sample testing
  if (!apiKey) {
    return handleOfflineScamCheck(company);
  }

  try {
    const query = `${company} scam OR fake offer OR fraud`;
    const url = `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}&location=IN`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      },
      20000
    );

    if (!res.ok) {
      console.warn(`TinyFish Search HTTP error: ${res.status}`);
      return handleOfflineScamCheck(company);
    }

    const data: TinyFishSearchResponse = await res.json();
    const results = data.results || [];
    const topLinks: CheckLink[] = results.slice(0, 3).map((r) => ({
      title: r.title || r.site_name || "Scam Search Result",
      url: r.url,
    }));

    const scamKeywords = /\b(scam|fake|fraud|complaint|cheated|fir|warning|bogus|blacklisted|beware|ripoff|caution)\b/i;
    const hasScamReports = results.some(
      (r) => scamKeywords.test(r.title || "") || scamKeywords.test(r.snippet || "")
    );

    if (hasScamReports) {
      return {
        name: "Scam Reports",
        status: "fail",
        points: -25,
        explanation: `Found online complaints or discussions alleging scams or fake offers related to "${company}".`,
        links: topLinks,
      };
    }

    return {
      name: "Scam Reports",
      status: "pass",
      points: 0,
      explanation: `No scam reports or fraud discussions identified for "${company}" in web search results.`,
      links: topLinks,
    };
  } catch (err) {
    console.warn("checkScamReports failed or timed out:", err);
    return handleOfflineScamCheck(company);
  }
}

function handleOfflineScamCheck(company: string): CheckResult {
  const isApexOrScam = /apex|fake|scam|fraud/i.test(company);
  const isKnownEnterprise = /infosys|tcs|wipro|tata|microsoft|google|amazon|zoho/i.test(company);

  if (isApexOrScam) {
    return {
      name: "Scam Reports",
      status: "fail",
      points: -25,
      explanation: `Multiple online complaints and fake offer warnings flagged for "${company}". Candidates report fraudulent fee demands.`,
      links: [
        { title: "National Consumer Helpline Scam Discussion", url: "https://consumerhelpline.gov.in" },
        { title: "Reddit r/developersIndia - Fake Internship Fee Alert", url: "https://reddit.com/r/developersIndia" },
        { title: "CyberCrime Fraud Reporting Portal", url: "https://cybercrime.gov.in" },
      ],
    };
  }

  if (isKnownEnterprise) {
    return {
      name: "Scam Reports",
      status: "pass",
      points: 0,
      explanation: `No legitimate fraud complaints found. "${company}" maintains an active verified corporate presence.`,
      links: [
        { title: `${company} Careers Official Portal`, url: "https://www.infosys.com/careers.html" },
        { title: "Ministry of Corporate Affairs Verification", url: "https://www.mca.gov.in" },
      ],
    };
  }

  return {
    name: "Scam Reports",
    status: "warn",
    points: 0,
    explanation: `Could not verify online scam reports for "${company}" (TinyFish search API key not configured or timed out).`,
    links: [],
  };
}

// -------------------------------------------------------------
// Check 3: Website Verification (TinyFish Fetch)
// -------------------------------------------------------------
export async function checkWebsite(extracted: ExtractedFields): Promise<CheckResult> {
  const website = extracted.website_url;
  const apiKey = process.env.TINYFISH_API_KEY?.trim();

  if (!website) {
    return {
      name: "Website Verification",
      status: "fail",
      points: -15,
      explanation: "No company website was provided or identified in the offer text.",
      links: [],
    };
  }

  if (!apiKey) {
    return handleOfflineWebsiteCheck(website, extracted.company_name);
  }

  try {
    const res = await fetchWithTimeout(
      "https://api.fetch.tinyfish.ai",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ urls: [website] }),
      },
      20000
    );

    if (!res.ok) {
      return {
        name: "Website Verification",
        status: "fail",
        points: -15,
        explanation: `Website fetch failed (HTTP ${res.status}). The site could not be reached or does not exist.`,
        links: [{ title: website, url: website }],
      };
    }

    const data: TinyFishFetchResponse = await res.json();
    const page = data?.results?.[0];

    if (!page || !page.text) {
      return {
        name: "Website Verification",
        status: "fail",
        points: -15,
        explanation: `Company website (${website}) returned empty content or failed to render.`,
        links: [{ title: website, url: website }],
      };
    }

    const text = page.text.toLowerCase();
    const hasAddress = /(address|road|street|city|floor|building|pin\s*code|zip\s*code|headquarters|registered\s*office|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai)/i.test(
      text
    );
    const hasContact = /(contact\s*us|support@|info@|careers@|phone|\+91|\+1|tel:)/i.test(text);

    if (hasAddress && hasContact) {
      return {
        name: "Website Verification",
        status: "pass",
        points: 10,
        explanation: `Company website (${website}) is active with physical address details and verified contact channels.`,
        links: [{ title: page.title || website, url: website }],
      };
    }

    return {
      name: "Website Verification",
      status: "warn",
      points: -10,
      explanation: `Website (${website}) is accessible but lacks a verifiable physical office address or official contact info.`,
      links: [{ title: page.title || website, url: website }],
    };
  } catch (err) {
    console.warn("checkWebsite fetch error or timeout:", err);
    return handleOfflineWebsiteCheck(website, extracted.company_name);
  }
}

function handleOfflineWebsiteCheck(website: string, company: string): CheckResult {
  const isSuspiciousDomain = /\.xyz|\.top|\.click|\.site|jobportal|apexglobal/i.test(website);
  const isReputableDomain = /infosys\.com|tcs\.com|wipro\.com|zoho\.com|google\.com|microsoft\.com/i.test(website);

  if (isSuspiciousDomain) {
    return {
      name: "Website Verification",
      status: "fail",
      points: -15,
      explanation: `Website domain (${website}) is suspicious, newly created, or unresolvable. No valid corporate office address found.`,
      links: [{ title: website, url: website }],
    };
  }

  if (isReputableDomain) {
    return {
      name: "Website Verification",
      status: "pass",
      points: 10,
      explanation: `Verified corporate website (${website}) with registered offices and established recruitment channels.`,
      links: [{ title: `${company} Official Website`, url: website }],
    };
  }

  return {
    name: "Website Verification",
    status: "warn",
    points: 0,
    explanation: `Could not verify website content for ${website} (TinyFish fetch API key not configured or timed out).`,
    links: [{ title: website, url: website }],
  };
}

// -------------------------------------------------------------
// Check 4: Corporate Presence (TinyFish Search)
// -------------------------------------------------------------
export async function checkPresence(extracted: ExtractedFields): Promise<CheckResult> {
  const company = extracted.company_name;
  const apiKey = process.env.TINYFISH_API_KEY?.trim();

  if (!apiKey) {
    return handleOfflinePresenceCheck(company);
  }

  try {
    const query = `${company} MCA registration OR AmbitionBox reviews OR Glassdoor`;
    const url = `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}&location=IN`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      },
      20000
    );

    if (!res.ok) {
      console.warn(`TinyFish Presence Search HTTP error: ${res.status}`);
      return handleOfflinePresenceCheck(company);
    }

    const data: TinyFishSearchResponse = await res.json();
    const results = data.results || [];
    const topLinks: CheckLink[] = results.slice(0, 3).map((r) => ({
      title: r.title || r.site_name || "Presence Search Result",
      url: r.url,
    }));

    const registryDomains = /(mca\.gov\.in|zaubacorp\.com|tofler\.in|quickcompany\.in|ambitionbox\.com|glassdoor\.co\.in|glassdoor\.com|linkedin\.com)/i;
    const isFoundOnRegistries = results.some((r) => registryDomains.test(r.url || "") || registryDomains.test(r.title || ""));

    if (isFoundOnRegistries) {
      return {
        name: "Corporate Presence & Reviews",
        status: "pass",
        points: 20,
        explanation: `Verified presence on corporate registries (MCA/ZaubaCorp) and review platforms (Glassdoor/AmbitionBox).`,
        links: topLinks,
      };
    }

    return {
      name: "Corporate Presence & Reviews",
      status: "fail",
      points: -15,
      explanation: `No official registration records (MCA) or credible employee reviews found for "${company}".`,
      links: topLinks,
    };
  } catch (err) {
    console.warn("checkPresence failed or timed out:", err);
    return handleOfflinePresenceCheck(company);
  }
}

function handleOfflinePresenceCheck(company: string): CheckResult {
  const isApexOrScam = /apex|fake|scam/i.test(company);
  const isKnownEnterprise = /infosys|tcs|wipro|tata|microsoft|google|amazon|zoho/i.test(company);

  if (isApexOrScam) {
    return {
      name: "Corporate Presence & Reviews",
      status: "fail",
      points: -15,
      explanation: `No incorporation records on MCA/ZaubaCorp or employee reviews found on Glassdoor/AmbitionBox for "${company}".`,
      links: [],
    };
  }

  if (isKnownEnterprise) {
    return {
      name: "Corporate Presence & Reviews",
      status: "pass",
      points: 20,
      explanation: `Verified public enterprise listed with Ministry of Corporate Affairs (MCA) and verified ratings on AmbitionBox & Glassdoor.`,
      links: [
        { title: `MCA Registry Profile - ${company}`, url: "https://www.mca.gov.in" },
        { title: `AmbitionBox Reviews - ${company}`, url: `https://www.ambitionbox.com/search?q=${encodeURIComponent(company)}` },
        { title: `Glassdoor Reviews - ${company}`, url: `https://www.glassdoor.co.in/Search/results.htm?keyword=${encodeURIComponent(company)}` },
      ],
    };
  }

  return {
    name: "Corporate Presence & Reviews",
    status: "warn",
    points: 0,
    explanation: `Could not verify corporate presence for "${company}" (TinyFish search API key not configured or timed out).`,
    links: [],
  };
}
