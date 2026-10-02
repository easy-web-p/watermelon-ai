import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2, Wifi } from "lucide-react";
import { getPendingOfflineRecords, syncOfflineQueueToServer, OfflineKnockRecord } from "@/lib/offline-storage";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [pendingRecords, setPendingRecords] = useState<OfflineKnockRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const refreshPending = () => {
    getPendingOfflineRecords().then(setPendingRecords);
  };

  useEffect(() => {
    refreshPending();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPending();
    };

    const handleOfflineUpdated = () => {
      refreshPending();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("watermelon_offline_updated", handleOfflineUpdated);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("watermelon_offline_updated", handleOfflineUpdated);
    };
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    try {
      const result = await syncOfflineQueueToServer();
      if (result.syncedCount > 0) {
        setSyncSuccessMessage(`ซิงก์ขึ้นคลาวด์สำเร็จ ${result.syncedCount} รายการ! 🍉`);
        setTimeout(() => setSyncSuccessMessage(null), 4000);
      }
      refreshPending();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingRecords.length === 0 && !syncSuccessMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/95 p-3.5 shadow-lg backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md">
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
            <CloudOff className="h-5 w-5 animate-pulse" />
          </div>
        ) : syncSuccessMessage ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-600 text-white shadow-xs">
            <Wifi className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0">
          {!isOnline ? (
            <>
              <p className="text-sm font-bold text-amber-950">โหมดออฟไลน์ในแปลงปลูก</p>
              <p className="text-xs text-amber-800">
                {pendingRecords.length > 0
                  ? `บันทึกในเครื่องแล้ว ${pendingRecords.length} รายการ (รอซิงก์เมื่อมีเน็ต)`
                  : "สามารถเคาะและวิเคราะห์เสียงออฟไลน์ได้ปกติ"}
              </p>
            </>
          ) : syncSuccessMessage ? (
            <>
              <p className="text-sm font-bold text-emerald-950">ซิงก์ข้อมูลสำเร็จ</p>
              <p className="text-xs text-emerald-800">{syncSuccessMessage}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-emerald-950">เชื่อมต่ออินเทอร์เน็ตแล้ว</p>
              <p className="text-xs text-emerald-800">มีข้อมูลเสียงเคาะค้างส่ง {pendingRecords.length} รายการ</p>
            </>
          )}
        </div>
      </div>

      {isOnline && pendingRecords.length > 0 && (
        <button
          type="button"
          onClick={triggerSync}
          disabled={isSyncing}
          className="ml-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "กำลังซิงก์..." : "ซิงก์ทันที"}
        </button>
      )}
    </div>
  );
}
