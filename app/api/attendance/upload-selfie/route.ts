export const dynamic = "force-dynamic";
// app/api/attendance/upload-selfie/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get("selfie") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Validate type and size
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      return NextResponse.json({ success: false, error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "5242880"); // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Upload to Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      // Fallback: store as base64 data URL if storage not configured
      const buffer  = await file.arrayBuffer();
      const base64  = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        data:    { url: dataUrl, stored: "inline" },
        message: "Selfie captured (storage not configured — stored inline).",
      });
    }

    const timestamp  = Date.now();
    const ext        = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path       = `selfies/${session.id}/${timestamp}.${ext}`;
    const buffer     = await file.arrayBuffer();

    const uploadRes  = await fetch(
      `${supabaseUrl}/storage/v1/object/attendance-selfies/${path}`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type":  file.type,
          "x-upsert":      "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Supabase upload error:", err);
      return NextResponse.json({ success: false, error: "Upload failed. Please try again." }, { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/attendance-selfies/${path}`;

    return NextResponse.json({
      success: true,
      data:    { url: publicUrl, path, stored: "supabase" },
      message: "Selfie uploaded successfully.",
    });

  } catch (error) {
    console.error("Selfie upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed." }, { status: 500 });
  }
}
