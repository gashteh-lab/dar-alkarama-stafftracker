// app/(admin)/locations/[id]/print-qr/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, QrCode, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

// Simple QR code display using a free QR API
export default function PrintQRPage() {
  const { id }   = useParams<{ id: string }>();
  const [data,   setData]    = useState<any>(null);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/locations/${id}/qrcode`)
      .then(r  => r.json())
      .then(d  => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Location not found.</p>
    </div>
  );

  // QR code image via Google Charts API (free, no key needed)
  const qrImageUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(data.qrValue)}&choe=UTF-8`;

  return (
    <div className="min-h-screen bg-white">
      {/* Screen controls - hidden when printing */}
      <div className="no-print p-4 flex items-center gap-3 border-b border-slate-100">
        <Link href="/admin/locations" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-semibold text-slate-700 flex-1">QR Code — {data.locationName}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
        >
          <Printer className="w-4 h-4" />Print
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-sm mx-auto pt-12 pb-8 px-6 text-center">
        {/* Logo/brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">StaffTrack</span>
        </div>

        {/* Location name */}
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{data.locationName}</h2>
        <p className="text-slate-500 text-sm mb-8">Scan to verify your location when punching in/out</p>

        {/* QR Code */}
        <div className="bg-white border-4 border-slate-900 rounded-2xl p-4 inline-block mb-6 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR Code for ${data.locationName}`}
            width={280}
            height={280}
            className="block"
          />
        </div>

        {/* Code value */}
        <div className="bg-slate-50 rounded-xl p-3 mb-6">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Location Code</p>
          <p className="font-mono text-xs text-slate-700 break-all">{data.qrValue}</p>
        </div>

        {/* Instructions */}
        <div className="text-left space-y-2">
          {[
            "Open StaffTrack on your phone",
            "Tap Punch In or Punch Out",
            "Tap 'Scan QR Code'",
            "Point camera at this QR code",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-slate-600">{step}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-300 mt-8">
          For support: {process.env.NEXT_PUBLIC_APP_URL || "attendance.shiftlywork-app.com"}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>
    </div>
  );
}
