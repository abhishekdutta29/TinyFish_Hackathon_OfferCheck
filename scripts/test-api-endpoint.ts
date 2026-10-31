import { spawn } from "child_process";
import { SAMPLE_OFFERS } from "../src/lib/samples";

const PORT = 3005;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test" }),
      });
      if (res.status === 200 || res.status === 400) return true;
    } catch (err: any) {
      if (i === 0) console.log("First ping error:", err?.code || err?.message);
    }
    await wait(500);
  }
  return false;
}

async function postVerify(text: string) {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function main() {
  console.log("Starting Next.js server on port", PORT, "...");
  const server = spawn(
    "C:\\Program Files\\nodejs\\node.exe",
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
    }
  );

  server.stdout?.on("data", (d) => console.log(`[Next] ${d.toString().trim()}`));
  server.stderr?.on("data", (d) => console.error(`[Next Err] ${d.toString().trim()}`));

  try {
    const ready = await pingServer();
    if (!ready) {
      throw new Error("Next.js server failed to respond on port " + PORT);
    }
    console.log("Next.js server is ready. Testing live /api/verify endpoint...\n");

    const scam = SAMPLE_OFFERS.find((s) => s.id === "scam")!;
    const genuine = SAMPLE_OFFERS.find((s) => s.id === "genuine")!;

    console.log("1. Sending Scam Sample Offer...");
    const scamRes = await postVerify(scam.text);
    console.log("Scam Response:", {
      score: scamRes.score,
      verdict: scamRes.verdict,
      company: scamRes.extracted.company_name,
      payment_demanded: scamRes.extracted.payment_demanded,
    });

    if (scamRes.score >= 40) {
      throw new Error(`Scam sample scored ${scamRes.score}, expected < 40!`);
    }
    console.log(">>> SCAM TEST PASSED: Score is < 40 (" + scamRes.score + ")\n");

    console.log("2. Sending Genuine Sample Offer...");
    const genRes = await postVerify(genuine.text);
    console.log("Genuine Response:", {
      score: genRes.score,
      verdict: genRes.verdict,
      company: genRes.extracted.company_name,
      payment_demanded: genRes.extracted.payment_demanded,
    });

    if (genRes.score <= 60) {
      throw new Error(`Genuine sample scored ${genRes.score}, expected > 60!`);
    }
    console.log(">>> GENUINE TEST PASSED: Score is > 60 (" + genRes.score + ")\n");

    console.log("All HTTP /api/verify integration tests passed successfully! 🎉");
  } finally {
    console.log("Stopping test server...");
    server.kill();
  }
}

main().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
