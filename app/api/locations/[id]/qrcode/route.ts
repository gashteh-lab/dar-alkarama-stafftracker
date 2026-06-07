// app/api/locations/[id]/qrcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import crypto from "crypto";

// Generate a deterministic QR code value for a location
// Format: STAFFTRACK-LOC-{locationId}-{hmac}
function generateLocationCode(locationId: string, secret: string): string {
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`loc:${locationId}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `STAFFTRACK-LOC-${locationId.slice(0, 8).toUpperCase()}-${hmac}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const location = await prisma.geofence.findUnique({
      where: { id: params.id },
    });

    if (!location) {
      return NextResponse.json({ success: false, error: "Location not found" }, { status: 404 });
    }

    const secret   = process.env.AUTH_SECRET || "stafftrack-secret";
    const qrValue  = generateLocationCode(params.id, secret);
    const qrLabel  = location.name;

    // Generate QR code as SVG using a simple QR matrix algorithm
    // We use the qr-code-generator approach encoded as SVG
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://stafftrack.app";
    const deepLink = `${appUrl}/punch?loc=${qrValue}`;

    return NextResponse.json({
      success: true,
      data: {
        locationId: params.id,
        locationName: location.name,
        qrValue,
        deepLink,
        // Admin can print this page to display at the location
        printUrl: `${appUrl}/admin/locations/${params.id}/print-qr`,
        instructions: [
          `Print this QR code and display at: ${location.name}`,
          "Staff scan to verify they are at the correct location",
          `QR Code Value: ${qrValue}`,
        ],
      },
    });
  } catch (error) {
    console.error("QR code error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate QR code." }, { status: 500 });
  }
}

// Verify a QR code (called during punch)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { qrValue } = await req.json();
    if (!qrValue) {
      return NextResponse.json({ success: false, error: "QR code value required" }, { status: 400 });
    }

    const secret       = process.env.AUTH_SECRET || "stafftrack-secret";
    const expectedCode = generateLocationCode(params.id, secret);

    if (qrValue !== expectedCode) {
      return NextResponse.json({
        success: false,
        error: "Invalid QR code. Please scan the correct QR code for this location.",
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      message: "QR code verified successfully.",
      data:    { locationId: params.id, verified: true },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Verification failed." }, { status: 500 });
  }
}
