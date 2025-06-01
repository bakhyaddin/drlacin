import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const status = await prisma.fetchStatus.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });
    if (!status) {
      throw new Error("No status found");
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      {
        lastFetch: "",
        status: "error",
        message: "Failed to read status",
        patientCount: 0,
      },
      { status: 500 }
    );
  }
}
