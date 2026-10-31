import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("offercheck_session")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = getUserFromSession(token);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
