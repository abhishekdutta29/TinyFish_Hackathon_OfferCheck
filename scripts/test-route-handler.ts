import { NextRequest } from "next/server";
import { POST } from "../src/app/api/verify/route";
import { SAMPLE_OFFERS } from "../src/lib/samples";

async function run() {
  console.log("==================================================");
  console.log("OfferCheck /api/verify Multi-Mode Integration Test");
  console.log("==================================================\n");

  const scam = SAMPLE_OFFERS.find((s) => s.id === "scam")!;
  const genuine = SAMPLE_OFFERS.find((s) => s.id === "genuine")!;

  // 1. Test Scam with Paste Mode (Raw Text)
  console.log("1. Testing POST /api/verify with Scam Raw Text...");
  const scamReq = new NextRequest("http://localhost:3000/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: scam.text }),
  });

  const scamResponse = await POST(scamReq);
  const scamData = await scamResponse.json();

  console.log("   - Response Status:", scamResponse.status);
  console.log("   - Trust Score:    ", scamData.score);
  console.log("   - Verdict:        ", scamData.verdict);
  if (scamData.score >= 40 || scamData.verdict !== "Likely Scam") {
    throw new Error(`Scam raw text failed: score=${scamData.score}, verdict=${scamData.verdict}`);
  }
  console.log("   >>> PASS: Scam Raw Text flagged as Likely Scam (< 40) ✅\n");

  // 2. Test Direct Input Slots Mode (No raw text)
  console.log("2. Testing POST /api/verify with Direct Input Slots (Form Mode)...");
  const slotsReq = new NextRequest("http://localhost:3000/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: "Apex Global Tech Solutions",
      sender_email: "hr.apextechsolutions2026@gmail.com",
      website_url: "http://www.apexglobal-tech-jobportal.xyz",
      phone: "+91 91234 56789",
      stipend: "Rs 65,000 per month",
      payment_demanded: true,
      payment_amount: "Rs 3,000",
      mentions_interview: false,
    }),
  });

  const slotsResponse = await POST(slotsReq);
  const slotsData = await slotsResponse.json();

  console.log("   - Response Status:", slotsResponse.status);
  console.log("   - Trust Score:    ", slotsData.score);
  console.log("   - Verdict:        ", slotsData.verdict);
  console.log("   - Extracted:      ", {
    company: slotsData.extracted?.company_name,
    email: slotsData.extracted?.sender_email,
    fee_demanded: slotsData.extracted?.payment_demanded,
  });

  if (slotsData.score >= 40 || slotsData.verdict !== "Likely Scam") {
    throw new Error(`Slots test failed: score=${slotsData.score}, verdict=${slotsData.verdict}`);
  }
  console.log("   >>> PASS: Explicit slots correctly verified and scored < 40 ✅\n");

  // 3. Test Genuine with Input Slots Mode
  console.log("3. Testing POST /api/verify with Genuine Direct Input Slots...");
  const genSlotsReq = new NextRequest("http://localhost:3000/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: "Infosys Limited",
      sender_email: "talent.acquisition@infosys.com",
      website_url: "https://www.infosys.com",
      phone: "+91 80 2852 0261",
      stipend: "Rs 28,000 per month",
      payment_demanded: false,
      mentions_interview: true,
    }),
  });

  const genSlotsRes = await POST(genSlotsReq);
  const genSlotsData = await genSlotsRes.json();

  console.log("   - Response Status:", genSlotsRes.status);
  console.log("   - Trust Score:    ", genSlotsData.score);
  console.log("   - Verdict:        ", genSlotsData.verdict);

  if (genSlotsData.score <= 60 || genSlotsData.verdict !== "Safe") {
    throw new Error(`Genuine slots failed: score=${genSlotsData.score}, verdict=${genSlotsData.verdict}`);
  }
  console.log("   >>> PASS: Genuine slots correctly verified and scored > 60 (Safe) ✅\n");

  console.log("==================================================");
  console.log("All multi-mode integration tests passed! 🚀");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
