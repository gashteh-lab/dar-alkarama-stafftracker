export const dynamic = "force-dynamic";
// app/api/health/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET() {
  const start = Date.now();

  try {
    // Quick DB ping
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - start;

    return NextResponse.json({
      status:    "ok",
      version:   "1.0.0",
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
      db:        { status: "ok", latencyMs: dbMs },
      env:       process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", db: { status: "error", error: "Database unreachable" }, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
