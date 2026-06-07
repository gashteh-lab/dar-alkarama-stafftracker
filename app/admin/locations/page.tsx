// app/(admin)/locations/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, MapPin, Edit2, Trash2, Users, X, Check,
  RefreshCw, AlertCircle, Navigation, Info,
} from "lucide-react";

function LocationForm({ initial, branches, onSubmit, onCancel, loading, error }: any) {
  const [f, setF] = useState(initial || {
    name: "", address: "", latitude: "", longitude: "",
    radiusMeters: 200, branchId: "", isActive: true,
  });

  async function autoDetectLocation() {
    if (!navigator.geolocation) { alert("GPS not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setF((p:any) => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => alert("Could not get location")
    );
  }

  return (
    <form onSubmit={e=>{e.preventDefault();onSubmit({...f,latitude:+f.latitude,longitude:+f.longitude,radiusMeters:+f.radiusMeters});}} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Location Name *</label>
        <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required placeholder="Head Office Dubai"
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
        <input value={f.address||""} onChange={e=>setF({...f,address:e.target.value})} placeholder="Business Bay, Dubai, UAE"
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-500">GPS Coordinates *</label>
          <button type="button" onClick={autoDetectLocation}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            <Navigation className="w-3 h-3" />Use my location
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" step="any" value={f.latitude} onChange={e=>setF({...f,latitude:e.target.value})} required placeholder="25.2532"
            className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <input type="number" step="any" value={f.longitude} onChange={e=>setF({...f,longitude:e.target.value})} required placeholder="55.3657"
            className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Get from Google Maps: right-click → "What's here?"</p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-500">Allowed Radius</label>
          <span className="text-xs font-semibold text-indigo-600">{f.radiusMeters}m</span>
        </div>
        <input type="range" min={25} max={2000} step={25} value={f.radiusMeters}
          onChange={e=>setF({...f,radiusMeters:+e.target.value})}
          className="w-full accent-indigo-600" />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>25m (indoor)</span><span>500m (campus)</span><span>2000m (area)</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Branch</label>
        <select value={f.branchId||""} onChange={e=>setF({...f,branchId:e.target.value})}
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">No branch</option>
          {branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Visual radius preview */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs text-slate-500">Radius preview (relative scale)</p>
        </div>
        <div className="relative flex items-center justify-center h-28 overflow-hidden">
          <div className="absolute w-4 h-4 rounded-full bg-indigo-600 z-10" />
          <div className="absolute rounded-full border-2 border-dashed border-indigo-400/60 bg-indigo-100/40 dark:bg-indigo-900/20 transition-all"
            style={{
              width:  `${Math.min(100, (f.radiusMeters / 2000) * 100)}%`,
              height: `${Math.min(100, (f.radiusMeters / 2000) * 100)}%`,
              minWidth: "32px", minHeight: "32px",
            }} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial ? "Update Location" : "Create Location"}
        </button>
      </div>
    </form>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [branches,  setBranches]  = useState<any[]>([]);
  const [modal,     setModal]     = useState<"create"|"edit"|null>(null);
  const [editing,   setEditing]   = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [locRes, brRes] = await Promise.all([
      fetch("/api/locations"), fetch("/api/admin/options?type=branches")
    ]);
    const locData = await locRes.json();
    const brData  = await brRes.json();
    if (locData.success) setLocations(locData.data);
    if (brData.success)  setBranches(brData.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: any) {
    setSaving(true); setError(null);
    const res = await fetch("/api/locations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const d   = await res.json();
    if (!d.success) { setError(d.error); setSaving(false); return; }
    setModal(null); load(); setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this location?")) return;
    await fetch(`/api/locations/${id}`, { method:"DELETE" });
    load();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Geofence boundaries for attendance validation</p>
        </div>
        <button onClick={()=>{setEditing(null);setError(null);setModal("create");}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Add Location
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">How geofencing works</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Staff can only punch in/out when their GPS is within the allowed radius. The server validates all punches — staff cannot bypass this check.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i=><div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden ${!loc.isActive ? "opacity-60" : ""}`}>
              {/* Map placeholder header */}
              <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                {/* Simplified geofence visualization */}
                <div className="absolute w-32 h-32 rounded-full border-2 border-dashed border-indigo-400/40 bg-indigo-50/40 dark:bg-indigo-900/20" />
                <div className="absolute w-16 h-16 rounded-full border border-indigo-400/60 bg-indigo-100/60 dark:bg-indigo-900/40" />
                <div className="w-4 h-4 rounded-full bg-indigo-600 z-10 shadow-lg shadow-indigo-500/40" />
                {/* Radius label */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shadow-sm">
                  ±{loc.radiusMeters}m
                </div>
                {!loc.isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 dark:bg-slate-800/80">
                    <span className="text-xs font-semibold text-slate-500 bg-white dark:bg-slate-700 px-2 py-1 rounded-full">Inactive</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{loc.name}</p>
                    {loc.address && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{loc.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={()=>{setEditing(loc);setError(null);setModal("edit");}}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={()=>handleDelete(loc.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="font-mono">{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</span>
                  </div>
                  {loc.branch && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-3 h-3 shrink-0 text-center">🏢</span>
                      {loc.branch.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="w-3 h-3 shrink-0" />
                    <span>{loc._count?.staff || 0} staff assigned</span>
                  </div>
                </div>

                {/* Open in Google Maps */}
                <a
                  href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Navigation className="w-3 h-3" />View on Google Maps
                </a>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">No locations added yet</p>
              <p className="text-xs mt-1">Add work locations to enable geofence validation</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {modal === "create" ? "Add Location" : "Edit Location"}
              </h2>
              <button onClick={()=>setModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <LocationForm
                initial={editing}
                branches={branches}
                onSubmit={modal === "create" ? handleCreate : async (d:any)=>{
                  setSaving(true); setError(null);
                  const res = await fetch(`/api/locations/${editing.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
                  const rd  = await res.json();
                  if (!rd.success) { setError(rd.error); setSaving(false); return; }
                  setModal(null); setEditing(null); load(); setSaving(false);
                }}
                onCancel={() => setModal(null)}
                loading={saving}
                error={error}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
