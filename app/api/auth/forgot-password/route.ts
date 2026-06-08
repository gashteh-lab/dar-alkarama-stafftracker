export const dynamic = "force-dynamic";
// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { identifier } = parsed.data;

    // Always return success to prevent user enumeration
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:      identifier.toLowerCase() },
          { employeeId: identifier.toUpperCase() },
          { phone:      identifier },
        ],
        isActive: true,
      },
    });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      // Send email if RESEND_API_KEY is configured
      if (process.env.RESEND_API_KEY && user.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify({
              from:    process.env.EMAIL_FROM || "noreply@stafftrack.com",
              to:      [user.email],
              subject: "Reset your StaffTrack password",
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                  <h2>Reset your password</h2>
                  <p>Click the button below to reset your StaffTrack password. This link expires in 1 hour.</p>
                  <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
                    Reset Password
                  </a>
                  <p style="color:#666;font-size:13px">If you didn't request this, ignore this email. Your password won't change.</p>
                  <p style="color:#999;font-size:12px">Or copy: ${resetUrl}</p>
                </div>
              `,
            }),
          });
        } catch (e) {
          console.error("Email send failed:", e);
        }
      } else {
        // Dev mode: log the token
        console.log(`[DEV] Password reset URL: ${resetUrl}`);
      }
    }

    return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
