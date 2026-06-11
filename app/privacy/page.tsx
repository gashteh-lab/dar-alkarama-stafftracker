// app/privacy/page.tsx
export const metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Privacy Notice</h1>
        <p className="text-sm text-slate-400 mb-6">Dar Al Karama Center — StaffTrack Attendance System</p>

        <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">What we collect</h2>
            <p>When you punch in or out, this app records your GPS location, the time, and your device information. This is used solely to verify attendance at the workplace.</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Why we collect it</h2>
            <p>Location data confirms you are physically present at the Dar Al Karama Center when recording attendance. It is not used for continuous tracking — only at the moment you punch in or out.</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">How it is stored</h2>
            <p>Your data is stored securely on encrypted servers. Passwords are hashed and never stored in plain text. Only authorised HR and management staff can view attendance records.</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Your rights</h2>
            <p>You may request access to your attendance data or ask for corrections through the in-app correction request feature, or by contacting your HR department.</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Camera & notifications</h2>
            <p>Camera access (if enabled) is used only for optional selfie verification at punch time. Push notifications are used for attendance reminders. Both can be declined without affecting core attendance functions.</p>
          </section>

          <p className="text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
            This notice complies with the UAE Personal Data Protection Law (PDPL). For questions, contact your HR department.
          </p>
        </div>
      </div>
    </div>
  );
}
