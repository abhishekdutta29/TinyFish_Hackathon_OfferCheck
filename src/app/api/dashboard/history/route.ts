import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession, getUserRecords, deleteUserRecord } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("offercheck_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const user = getUserFromSession(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Session expired." }, { status: 401 });
    }

    const records = getUserRecords(user.id);

    // Compute metrics
    const totalScans = records.length;
    const scamsCount = records.filter((r) => r.verdict === "Likely Scam").length;
    const suspiciousCount = records.filter((r) => r.verdict === "Suspicious").length;
    const safeCount = records.filter((r) => r.verdict === "Safe").length;
    const avgScore = totalScans > 0 ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / totalScans) : 0;

    return NextResponse.json({
      records,
      stats: {
        totalScans,
        scamsCount,
        suspiciousCount,
        safeCount,
        avgScore,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load history." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("offercheck_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserFromSession(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("id");
    if (!recordId) {
      return NextResponse.json({ error: "Record ID required." }, { status: 400 });
    }

    const deleted = deleteUserRecord(user.id, recordId);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete record." }, { status: 500 });
  }
}
