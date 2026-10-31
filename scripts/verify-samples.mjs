import { SAMPLE_OFFERS } from "../src/lib/samples.js";
import { extractWithRegex } from "../src/lib/extractor.js";
import {
  checkTextRedFlags,
  checkScamReports,
  checkWebsite,
  checkPresence,
} from "../src/lib/checks.js";

async function verifyOffer(text) {
  const extracted = extractWithRegex(text);
  const [textFlags, scam, web, presence] = await Promise.all([
    Promise.resolve(checkTextRedFlags(extracted, text)),
    checkScamReports(extracted),
    checkWebsite(extracted),
    checkPresence(extracted),
  ]);

  const checks = [textFlags, scam, web, presence];
  const points = checks.reduce((sum, c) => sum + c.points, 0);
  const score = Math.max(0, Math.min(100, 60 + points));

  let verdict = "Suspicious";
  if (score >= 70) verdict = "Safe";
  else if (score < 40) verdict = "Likely Scam";

  return { score, verdict, extracted, checks };
}

async function run() {
  console.log("==================================================");
  console.log("OfferCheck Local Sample Verification Test");
  console.log("==================================================\n");

  let passedAll = true;

  for (const sample of SAMPLE_OFFERS) {
    console.log(`Testing Sample: [${sample.id.toUpperCase()}] ${sample.name}`);
    const res = await verifyOffer(sample.text);
    console.log(`  Extracted Company: ${res.extracted.company_name}`);
    console.log(`  Sender Email:      ${res.extracted.sender_email}`);
    console.log(`  Payment Demanded:  ${res.extracted.payment_demanded.demanded} (${res.extracted.payment_demanded.amount || "None"})`);
    console.log(`  Interview:         ${res.extracted.mentions_interview}`);
    console.log(`  Final Trust Score: ${res.score}/100`);
    console.log(`  Verdict:           ${res.verdict}`);
    console.log(`  Checks breakdown:`);
    for (const c of res.checks) {
      console.log(`    - ${c.name} [${c.status.toUpperCase()}]: ${c.points > 0 ? "+" : ""}${c.points} pts -> ${c.explanation.slice(0, 75)}...`);
    }

    if (sample.id === "scam") {
      if (res.score < 40) {
        console.log(`  >>> PASS: Scam score (${res.score}) is strictly below 40. ✅\n`);
      } else {
        console.error(`  >>> FAIL: Scam score (${res.score}) must be below 40! ❌\n`);
        passedAll = false;
      }
    } else if (sample.id === "genuine") {
      if (res.score > 60) {
        console.log(`  >>> PASS: Genuine score (${res.score}) is strictly above 60. ✅\n`);
      } else {
        console.error(`  >>> FAIL: Genuine score (${res.score}) must be above 60! ❌\n`);
        passedAll = false;
      }
    }
  }

  if (!passedAll) {
    process.exit(1);
  }
  console.log("All local verification benchmarks passed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
