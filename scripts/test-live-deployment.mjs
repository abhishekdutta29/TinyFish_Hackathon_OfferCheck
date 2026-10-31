const SCAM_SAMPLE = `Subject: URGENT: Direct Selection Letter - Software Developer Intern at Apex Global Tech Solutions

Dear Candidate,

Congratulations! We are pleased to inform you that your resume has been shortlisted directly from our database for the position of Software Development Intern at Apex Global Tech Solutions.

Key Details of Internship:
- Role: Python & Full Stack Developer Intern
- Monthly Stipend: Rs. 65,000 per month (Guaranteed high stipend for freshers)
- Selection Process: Direct Selection without Interview based on academic profile
- Duration: 6 Months (Remote / Work from Home)

IMPORTANT INSTRUCTIONS (URGENT):
Due to limited seats (only 3 seats left), you must immediately confirm your seat by depositing a mandatory refundable registration and laptop dispatch security fee of Rs. 3,000 today. 

Please transfer Rs 3,000 immediately to our company accounts coordinator via UPI (apextech.hr@upi) or Bank Transfer within 24 hours. This is your last chance. If payment is not received immediately, your offer will be cancelled and offered to the next candidate on the waiting list.

Send payment screenshot to our recruitment coordinator at:
Email: hr.apextechsolutions2026@gmail.com
Phone: +91 91234 56789
Website: http://www.apexglobal-tech-jobportal.xyz

Welcome aboard!
HR Recruitment Team
Apex Global Tech Solutions`;

const GENUINE_SAMPLE = `Offer of Employment: Systems Engineer Trainee

Ref: INF/2026/SE/BLR-0941
Date: October 24, 2026

Dear Candidate,

Following your successful performance in the National Qualifier Assessment and subsequent Technical and HR Interview rounds conducted on October 18, 2026, we are delighted to extend this offer of employment with Infosys Limited.

Position: Systems Engineer Trainee
Base Location: Bangalore Development Centre, Electronics City, Hosur Road, Bangalore - 560100
Compensation & Stipend: Rs. 28,000 per month during foundation training, transitioning to CTC of INR 4,20,000 per annum upon completion.

Terms and Conditions:
1. Joining & Induction: Your induction will commence on December 1, 2026 at the Infosys Mysore Global Education Centre.
2. Background Verification: Employment is subject to successful verification of educational credentials and standard background checks.
3. Zero Fee Policy: Infosys does not charge any fee at any stage of the recruitment process (application, interview, processing, or training). Any solicitation of funds in the name of Infosys is unauthorized and fraudulent.

Please review and accept this offer letter via the Infosys Career Portal within 7 calendar days.

For any queries regarding onboarding, please contact:
HR Talent Acquisition Team
Infosys Limited
Email: talent.acquisition@infosys.com
Website: https://www.infosys.com
Registered Office: Electronics City, Hosur Road, Bengaluru 560 100, India
Phone: +91 80 2852 0261`;

const LIVE_URL = "https://rapid-topaz-c55xnpg.tmp.now";

async function verify(name, text) {
  console.log(`Testing Live: [${name}] ...`);
  const res = await fetch(`${LIVE_URL}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  console.log(`  - Status:  ${res.status}`);
  console.log(`  - Score:   ${data.score}/100`);
  console.log(`  - Verdict: ${data.verdict}`);
  console.log(`  - Extracted Company: ${data.extracted?.company_name}`);
  console.log(`  - Fee Demanded:     ${JSON.stringify(data.extracted?.payment_demanded)}`);
  return data;
}

async function main() {
  console.log("==================================================");
  console.log("Testing Live Deployed Vercel API Endpoint");
  console.log("URL:", LIVE_URL);
  console.log("==================================================\n");

  const scamData = await verify("SCAM OFFER", SCAM_SAMPLE);
  if (scamData.score >= 40) {
    throw new Error(`Scam sample scored ${scamData.score}, expected < 40!`);
  }
  console.log("  >>> PASS: Scam score < 40 on live Vercel! ✅\n");

  const genData = await verify("GENUINE OFFER", GENUINE_SAMPLE);
  if (genData.score <= 60) {
    throw new Error(`Genuine sample scored ${genData.score}, expected > 60!`);
  }
  console.log("  >>> PASS: Genuine score > 60 on live Vercel! ✅\n");

  console.log("All live production verification tests passed with flying colors! 🚀");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
