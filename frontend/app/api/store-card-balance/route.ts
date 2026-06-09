import { NextRequest, NextResponse } from "next/server";
import { getStudentsByParentEmail } from "@/lib/api/students";

// Internal route — called from member portal page after Wix OAuth token is validated
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const students = await getStudentsByParentEmail(email);

  return NextResponse.json({
    students: students.map((s) => ({
      id: s._id,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      storeCardBalance: s.storeCardBalance ?? 0,
      storeCardCode: s.storeCardCode,
      membershipStatus: s.membershipStatus,
      membershipTier: s.membershipTier,
    })),
  });
}
