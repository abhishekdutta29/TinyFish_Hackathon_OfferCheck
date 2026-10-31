import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("offercheck_session")?.value;
  if (token) {
    deleteSession(token);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("offercheck_session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return res;
}
