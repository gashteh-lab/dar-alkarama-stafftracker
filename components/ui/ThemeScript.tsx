// components/ui/ThemeScript.tsx
// Injected in <head> to prevent flash of wrong theme before React hydrates

export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('stafftrack-theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
        if (isDark) document.documentElement.classList.add('dark');
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
