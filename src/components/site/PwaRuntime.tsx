import { useEffect, useState } from "react";

/**
 * Registers the static-asset service worker and warns the user when the device
 * is offline. Study DZ never serves sensitive data from cache, so offline mode
 * shows a clear "connection required" message instead of stale data.
 */
export function PwaRuntime() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is best-effort */
      });
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-foreground px-4 py-3 text-center text-sm text-background"
    >
      لا يوجد اتصال بالإنترنت. Study DZ يعمل عبر الخادم، ولا تُعرض أي بيانات حساسة دون اتصال.
    </div>
  );
}
