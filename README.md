# OfferCheck 🛡️

> An autonomous web application that verifies whether a job or internship offer is fake by analyzing offer text, scanning public scam records, validating company websites, and cross-referencing corporate registries.
> Built with Next.js (App Router), Tailwind CSS, TinyFish Search & Fetch APIs, and structured LLM extraction.

---

## ⚡ Quick Start

### 1. Installation

```bash
# Clone the repository and navigate into the directory
cd offercheck

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your API keys:

```env
# TinyFish API key for live web search and page fetching
# Get your free key at https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY="your-tinyfish-api-key-here"

# LLM API key for structured field extraction from offer letter text
# Works with OpenAI (sk-...) or Google Gemini (AIza...)
LLM_API_KEY="your-llm-api-key-here"

# Optional LLM Configuration
# LLM_BASE_URL="https://api.openai.com/v1"
# LLM_MODEL="gpt-4o-mini"
```

> **Note:** If `LLM_API_KEY` or `TINYFISH_API_KEY` are not set or services are temporarily unavailable, OfferCheck automatically falls back to built-in rule-based forensics and sample fixtures so verification never breaks.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Benchmark Tests

Run the automated integration test suite on the prefilled scam and genuine sample offers:

```bash
npx tsx scripts/test-route-handler.ts
```

Benchmarks:
- **Scam Sample (Rs 3,000 Registration Fee + Gmail + Urgency):** Trust Score: **0 / 100** (`Likely Scam` < 40)
- **Genuine Sample (Infosys Campus Offer + Corporate Domain + Technical Interview):** Trust Score: **90 / 100** (`Safe` > 60)

---

## 🔐 Authentication & Security Dashboard

OfferCheck now includes a complete account system and security dashboard:

1. **User Authentication:**
   - **Register** ([`/register`](http://localhost:3000/register)): Create an account with name, email, and secure PBKDF2 password hashing.
   - **Login** ([`/login`](http://localhost:3000/login)): Sign in to access your personal dashboard and saved threat audit trails.
   - **Sessions**: Secure, HTTP-only session cookies (`offercheck_session`).

2. **Security Dashboard** ([`/dashboard`](http://localhost:3000/dashboard)):
   - **Overview Metrics**: Total Scans, Scams Blocked, Suspicious Offers, and Verified Safe Employers.
   - **Verification History**: Chronological log of all investigated companies with Trust Scores and Verdict badges.
   - **Evidence Inspector**: One-click modal to inspect detailed forensic rule deductions, website analysis, and source links for each past scan.
   - **Search & Filter**: Filter past verifications by verdict (`Safe`, `Suspicious`, `Likely Scam`) or search by company name.
   - **Emergency Defense Hub**: Direct access to National Cyber Crime reporting ([cybercrime.gov.in](https://cybercrime.gov.in)) and helpline **1930**.

---

## 🖥️ Verification Modes & User Input Slots

OfferCheck provides two input modes:

1. **Direct Verification Slots (Form Mode):**
   - **Company / Employer Name** (`company_name`): Hiring entity name to check against MCA registries, Glassdoor, and AmbitionBox.
   - **Recruiter Email Address** (`sender_email`): Detects free public domains (`@gmail.com`, `@yahoo.com`) vs corporate domains.
   - **Company Website URL** (`website_url`): Scraped and verified for physical office address and official contact channels.
   - **Recruiter Phone / WhatsApp** (`phone`): Direct recruiter communication line.
   - **Upfront Fee / Deposit Demanded?** (`payment_demanded` & `payment_amount`): Interactive toggle with fee amount input (e.g. Rs 3,000).
   - **Was an Interview Conducted?** (`mentions_interview`): Highlights fake "direct selection without interview" scams.
   - **Offered Stipend / Salary** (`stipend`): Checks for bait compensation (e.g. Rs 65,000/mo for a fresher).
   - **Additional Text / Notes** (`text`): Optional message text for additional forensics.

2. **Paste Full Offer Letter Mode:**
   - Single large paste textarea for pasting appointment letters, recruiter WhatsApp messages, or emails directly. Entity extraction runs automatically.

1. **Structured Entity Extraction:**
   - Extracts `company_name`, `sender_email`, `website_url`, `phone`, `payment_demanded` (bool + amount), `stipend`, and `mentions_interview` (bool).
   - Powered by LLM with rule-based regex fallback.

2. **Parallel Forensic Checks (`Promise.all` with 20s timeout):**
   - **Text Red Flags (Rule-based):**
     - Upfront payment demanded (`-35 pts`)
     - Free recruiter webmail like `@gmail.com` (`-15 pts`)
     - Sender email domain does not match company website (`-10 pts`)
     - Artificial urgency words like "immediately" or "limited seats" (`-10 pts`)
     - Direct selection without interview (`-10 pts`)
     - Unusually high fresher stipend (`-10 pts`)
   - **Scam Reports (TinyFish Search):**
     - Searches for `"<company> scam"`, `"<company> fake offer"`, `"<company> fraud"`.
     - Flags scam complaints (`-25 pts`). Returns top evidence links.
   - **Website Verification (TinyFish Fetch):**
     - Fetches and inspects company website for physical address and contact details (`+10 pts` if verified, `-10 pts` if missing, `-15 pts` if unreachable/fake).
   - **Corporate Presence (TinyFish Search):**
     - Queries MCA registry filings, Glassdoor, and AmbitionBox (`+20 pts` if found, `-15 pts` if absent).

3. **Scoring & Verdict:**
   - Base score: `60 pts`
   - Clamped between `0` and `100`
   - **70 - 100:** `Safe`
   - **40 - 69:** `Suspicious`
   - **< 40:** `Likely Scam`

---

## 🚀 Deployment to Vercel

### Option 1: Vercel CLI

```bash
# Login and deploy
npx vercel
```

Set the environment variables in Vercel project settings:
- `TINYFISH_API_KEY`
- `LLM_API_KEY`

### Option 2: Deploy from GitHub
Push this repository to GitHub and import it on [vercel.com](https://vercel.com). Add the environment variables in project settings.

---

## ⚖️ Disclaimer

*This application provides automated risk assessment based on available textual heuristics, web search indicators, and registry checks. It is not an absolute legal guarantee. Always cross-verify offers directly with official company channels and report fraudulent solicitations to [cybercrime.gov.in](https://cybercrime.gov.in).*
