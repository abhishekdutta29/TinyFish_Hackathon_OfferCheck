import { NextRequest } from "next/server";
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { POST as logoutHandler } from "../src/app/api/auth/logout/route";
import { GET as historyHandler, DELETE as deleteHandler } from "../src/app/api/dashboard/history/route";
import { POST as verifyHandler } from "../src/app/api/verify/route";

async function run() {
  console.log("==================================================");
  console.log("Testing Auth & Dashboard Lifecycle End-to-End");
  console.log("==================================================\n");

  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = "securePassword123";
  const testName = "Jane Defender";

  // 1. Register
  console.log("1. Registering user:", testEmail);
  const regReq = new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
  });
  const regRes = await registerHandler(regReq);
  const regData = await regRes.json();
  console.log("   - Register Status:", regRes.status);
  console.log("   - User Created:   ", regData.user?.name, `(${regData.user?.email})`);

  if (regRes.status !== 200 || !regData.user?.id) {
    throw new Error("Registration failed!");
  }

  // Extract session cookie from register response
  const setCookie = regRes.headers.get("set-cookie") || "";
  const match = setCookie.match(/offercheck_session=([^;]+)/);
  const sessionToken = match ? match[1] : "";
  if (!sessionToken) throw new Error("No session token cookie returned!");
  console.log("   >>> PASS: Registration succeeded with session cookie. ✅\n");

  // 2. Me endpoint
  console.log("2. Checking /api/auth/me with session cookie...");
  const meReq = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: { cookie: `offercheck_session=${sessionToken}` },
  });
  const meRes = await meHandler(meReq);
  const meData = await meRes.json();
  console.log("   - Me Response:", meData.user?.name, meData.user?.email);
  if (meData.user?.email !== testEmail.toLowerCase()) {
    throw new Error("/api/auth/me did not return correct user!");
  }
  console.log("   >>> PASS: Session verified via /api/auth/me. ✅\n");

  // 3. Run a Verification while logged in (should auto-save to history)
  console.log("3. Running verification while authenticated...");
  const verifyReq = new NextRequest("http://localhost:3000/api/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `offercheck_session=${sessionToken}`,
    },
    body: JSON.stringify({
      company_name: "Apex Scam Tech",
      sender_email: "recruiter@gmail.com",
      payment_demanded: true,
      payment_amount: "Rs 3,000",
      mentions_interview: false,
    }),
  });
  const verifyRes = await verifyHandler(verifyReq);
  const verifyData = await verifyRes.json();
  console.log("   - Verify Score:  ", verifyData.score);
  console.log("   - Verify Verdict:", verifyData.verdict);
  if (verifyRes.status !== 200) throw new Error("Verify failed!");
  console.log("   >>> PASS: Offer verification completed. ✅\n");

  // 4. Fetch Dashboard History & Stats
  console.log("4. Fetching Dashboard History...");
  const historyReq = new NextRequest("http://localhost:3000/api/dashboard/history", {
    headers: { cookie: `offercheck_session=${sessionToken}` },
  });
  const historyRes = await historyHandler(historyReq);
  const historyData = await historyRes.json();
  console.log("   - History Records Count:", historyData.records?.length);
  console.log("   - Scanned Company:      ", historyData.records?.[0]?.companyName);
  console.log("   - Dashboard Stats:      ", historyData.stats);

  if (historyData.records?.length !== 1 || historyData.stats?.scamsCount !== 1) {
    throw new Error("Dashboard history or stats mismatch!");
  }
  console.log("   >>> PASS: Verification record automatically archived in Dashboard history! ✅\n");

  const recordId = historyData.records[0].id;

  // 5. Delete Record
  console.log("5. Deleting record from Dashboard:", recordId);
  const delReq = new NextRequest(`http://localhost:3000/api/dashboard/history?id=${recordId}`, {
    method: "DELETE",
    headers: { cookie: `offercheck_session=${sessionToken}` },
  });
  const delRes = await deleteHandler(delReq);
  const delData = await delRes.json();
  console.log("   - Delete Response:", delData);
  if (!delData.success) throw new Error("Delete failed!");
  console.log("   >>> PASS: Record deleted cleanly from user history. ✅\n");

  // 6. Test Logout
  console.log("6. Testing Logout...");
  const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { cookie: `offercheck_session=${sessionToken}` },
  });
  const logoutRes = await logoutHandler(logoutReq);
  console.log("   - Logout Status:", logoutRes.status);

  // Check me after logout
  const meAfterLogout = await meHandler(
    new NextRequest("http://localhost:3000/api/auth/me", {
      headers: { cookie: `offercheck_session=${sessionToken}` },
    })
  );
  const meAfterLogoutData = await meAfterLogout.json();
  if (meAfterLogoutData.user !== null) {
    throw new Error("User still logged in after logout!");
  }
  console.log("   >>> PASS: Logout invalidated session. ✅\n");

  // 7. Login again
  console.log("7. Logging back in with credentials...");
  const loginReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginRes = await loginHandler(loginReq);
  const loginData = await loginRes.json();
  console.log("   - Login User:", loginData.user?.name);
  if (loginRes.status !== 200 || !loginData.user) {
    throw new Error("Login failed!");
  }
  console.log("   >>> PASS: Logged back in successfully. ✅\n");

  console.log("==================================================");
  console.log("All Auth & Dashboard tests passed with 100% success! 🚀");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
