// app/(admin)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const TIMEZONES = [
  "Asia/Dubai","Asia/Riyadh","Asia/Bahrain","Asia/Kuwait","Asia/Qatar",
  "Asia/Muscat","Africa/Cairo","Europe/London","America/New_York",
  "America/Los_Angeles","Asia/Karachi","Asia/Kolkata","Asia/Singapore",
];

const LANGUAGES = [
  {value:"en",label:"English"},
  {value:"ar",label:"العربية (Arabic)"},
  {value:"fr",label:"Français (French)"},
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/settings").then(r=>r.json()).then(d=>{
      if (d.success) setSettings(d.data);
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    const res  = await fetch("/api/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(settings) });
    const data = await res.json();
    if (!data.success) { setError(data.error); }
    else { setSuccess(true); setTimeout(()=>setSuccess(false), 3000); }
    setSaving(false);
  }

  function upd(key: string, val: any) { setSettings((s:any) => ({ ...s, [key]: val })); }

  const Toggle = ({ k, label, desc }: { k:string; label:string; desc:string }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button type="button" onClick={()=>upd(k,!settings?.[k])}
        className={`relative w-11 h-6 rounded-full transition-colors ${settings?.[k] ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings?.[k] ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );

  if (loading) return (
    <div className="p-6">
      <div className="space-y-4">
        {[1,2,3,4].map(i=><div key={i} className="h-16 skeleton rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure system-wide attendance policies</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl mb-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Settings saved successfully.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl mb-5">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">

        {/* Company */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Company</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Company Name</label>
              <input value={settings?.name||""} onChange={e=>upd("name",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Timezone</label>
                <select value={settings?.timezone||"Asia/Dubai"} onChange={e=>upd("timezone",e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  {TIMEZONES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Language</label>
                <select value={settings?.language||"en"} onChange={e=>upd("language",e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  {LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Date Format</label>
                <select value={settings?.dateFormat||"DD/MM/YYYY"} onChange={e=>upd("dateFormat",e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Time Format</label>
                <select value={settings?.timeFormat||"12h"} onChange={e=>upd("timeFormat",e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="12h">12-hour (AM/PM)</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Policy */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Attendance Policy</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Default Grace Period (min)</label>
                <input type="number" min={0} max={120} value={settings?.defaultGracePeriod||15} onChange={e=>upd("defaultGracePeriod",+e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Min GPS Accuracy (meters)</label>
                <input type="number" min={10} max={1000} value={settings?.gpsAccuracyMin||100} onChange={e=>upd("gpsAccuracyMin",+e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
            <Toggle k="geofenceRequired"       label="Require geofence validation"    desc="Staff must be within the assigned location radius to punch in/out" />
            <Toggle k="offlinePunchAllowed"    label="Allow offline punch"            desc="Staff can punch in/out without internet (syncs when reconnected)" />
            <Toggle k="selfieRequired"         label="Require selfie on punch"        desc="Staff must take a selfie photo when punching in/out" />
            <Toggle k="correctionAllowed"      label="Allow correction requests"      desc="Staff can submit requests to correct their attendance records" />
            <Toggle k="managerApprovalRequired" label="Manager approval required"     desc="Correction requests must be approved by a manager" />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Notifications</h2>
          <Toggle k="pushNotificationsEnabled" label="Push notifications" desc="Send browser push notifications to staff and admins" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-60">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </form>
    </div>
  );
}
