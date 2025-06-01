import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get the latest automation toggle state
    const toggle = await prisma.automationToggle.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      isEnabled: toggle?.isEnabled ?? false,
    });
  } catch (error) {
    console.error("Error fetching toggle state:", error);
    return NextResponse.json(
      { error: "Failed to fetch toggle state" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isEnabled } = await request.json();

    const toggle = await prisma.automationToggle.create({
      data: {
        isEnabled,
      },
    });

    return NextResponse.json(toggle);
  } catch (error) {
    console.error("Error saving toggle state:", error);
    return NextResponse.json(
      { error: "Failed to save toggle state" },
      { status: 500 }
    );
  }
}
