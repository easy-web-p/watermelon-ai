import React, { useState, useEffect } from "react";
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Leaf,
  Bug,
  RefreshCw,
  BookOpen,
  History,
  Sparkles,
  Server,
  Cpu,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  Check,
} from "lucide-react";

interface DiseaseDiagnosis {
  success: boolean;
  disease_id: string;
  thai_name: string;
  scientific_name: string;
  severity: string;
  severity_level: number;
  confidence_percentage: number;
  symptoms: string;
  chemical_control: string[];
  organic_control: string[];
  prevention: string;
  urgent_action: string;
  recordId?: string;
  detectedAt?: string;
  analysis_engine?: string;
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiseaseDiagnosis | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "catalog" | "history" | "architecture">("scan");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [farmName, setFarmName] = useState("แปลงแตงโมสุพรรณบุรี แปลงที่ 1");
  const [fastApiStatus, setFastApiStatus] = useState<"connected" | "connecting" | "offline">("connecting");
  const [nodeApiStatus, setNodeApiStatus] = useState<"connected" | "connecting" | "offline">("connecting");

  useEffect(() => {
    checkServices();
    fetchCatalog();
    fetchHistory();
  }, []);

  async function checkServices() {
    try {
      const resNode = await fetch("/api/v1/health");
      if (resNode.ok) setNodeApiStatus("connected");
      else setNodeApiStatus("offline");
    } catch {
      setNodeApiStatus("offline");
    }

    try {
      // Direct or via proxy
      const resFast = await fetch("http://127.0.0.1:8000/health", { mode: "cors" });
      if (resFast.ok) setFastApiStatus("connected");
      else setFastApiStatus("offline");
    } catch {
      setFastApiStatus("offline");
    }
  }

  async function fetchCatalog() {
    try {
      const res = await fetch("/api/v1/watermelon/disease-catalog");
      const data = await res.json();
      if (data.diseases) setCatalog(data.diseases);
    } catch {}
  }

  async function fetchHistory() {
    try {
      const res = await fetch("/api/v1/watermelon/disease-history");
      const data = await res.json();
      if (data.records) setHistory(data.records);
    } catch {}
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  async function analyzeImage(base64Image: string) {
    setIsAnalyzing(true);
    setDiagnosis(null);
    try {
      const res = await fetch("/api/v1/watermelon/disease-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          farmId: farmName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosis(data);
        fetchHistory();
      }
    } catch (err) {
      console.error("Diagnosis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const getSeverityBadge = (level: number, text: string) => {
    if (level === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 size={13} /> {text}
        </span>
      );
    }
    if (level <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle size={13} /> {text}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <ShieldAlert size={13} /> {text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFBEF] text-gray-900 pb-16 font-sans">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-lime-200/90 bg-[#FFFBEF]/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-2xl shadow-xs">
              🍉
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-green-950 tracking-tight leading-tight">
                  Watermelon Disease AI
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Web • Android • iOS
                </span>
              </div>
              <p className="text-[11px] text-green-800 font-medium">
                ระบบตรวจจับและวินิจฉัยโรคพืชในแตงโมด้วย Computer Vision & FastAPI
              </p>
            </div>
          </div>

          {/* Connection Status Badges */}
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono ${
                nodeApiStatus === "connected"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <Server size={12} />
              <span>Node.js:3000</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono ${
                fastApiStatus === "connected"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Cpu size={12} />
              <span>FastAPI:8000</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 border-b border-lime-200 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "scan"
                ? "bg-green-700 text-white shadow-xs"
                : "bg-white text-gray-700 hover:bg-lime-100 border border-lime-200"
            }`}
          >
            <Camera size={16} />
            <span>สแกนตรวจโรคแตงโม</span>
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "catalog"
                ? "bg-green-700 text-white shadow-xs"
                : "bg-white text-gray-700 hover:bg-lime-100 border border-lime-200"
            }`}
          >
            <BookOpen size={16} />
            <span>คู่มือ 6 โรคพืช ({catalog.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "history"
                ? "bg-green-700 text-white shadow-xs"
                : "bg-white text-gray-700 hover:bg-lime-100 border border-lime-200"
            }`}
          >
            <History size={16} />
            <span>ประวัติการตรวจแปลง ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "architecture"
                ? "bg-green-700 text-white shadow-xs"
                : "bg-white text-gray-700 hover:bg-lime-100 border border-lime-200"
            }`}
          >
            <Layers size={16} />
            <span>สถาปัตยกรรมระบบ</span>
          </button>
        </nav>

        {/* Tab 1: Scan & Detect */}
        {activeTab === "scan" && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Input & Camera */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-lime-200 p-5 shadow-xs">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  แปลงปลูก / โซนที่สำรวจ:
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-lime-200 p-2.5 outline-none focus:border-green-600 bg-lime-50/30 mb-4"
                  placeholder="เช่น แปลงแตงโมกินรี #1"
                />

                {/* Camera / Upload Box */}
                <div className="relative border-2 border-dashed border-lime-400/80 rounded-2xl p-6 text-center bg-lime-50/20 hover:bg-lime-50/40 transition-colors">
                  {selectedImage ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={selectedImage}
                        alt="ภาพที่อัปโหลด"
                        className="w-full h-64 object-cover rounded-xl shadow-xs"
                      />
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-green-950/50 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                          <RefreshCw className="w-9 h-9 animate-spin text-lime-300 mb-2" />
                          <span className="text-sm font-bold">FastAPI AI กำลังวิเคราะห์อาการ...</span>
                          <span className="text-xs text-lime-200 mt-1">
                            ตรวจหารอยโรคราน้ำค้าง แอนแทรคโนส และเถาแตก
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-lime-200 text-green-900 mx-auto mb-3 shadow-xs">
                        <Leaf size={32} />
                      </div>
                      <p className="text-sm font-bold text-green-950">ถ่ายภาพใบ เถา หรือผลแตงโม</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                        จัดตำแหน่งให้เห็นรอยแผล จุดด่าง หรืออาการใบไหม้ชัดเจน
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-green-800 transition-colors">
                      <Camera size={16} />
                      <span>เปิดกล้องถ่ายภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-lime-300 px-4 py-2.5 text-xs font-bold text-green-900 shadow-2xs hover:bg-lime-50 transition-colors">
                      <Upload size={16} />
                      <span>เลือกจากคลังภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>📱 รองรับ Android Camera, iOS Photos และ Web</span>
                </div>
              </div>
            </div>

            {/* Right: Diagnosis Result */}
            <div className="lg:col-span-7">
              {isAnalyzing && (
                <div className="bg-white rounded-3xl border border-lime-200 p-8 text-center shadow-xs">
                  <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-base font-bold text-green-950">
                    โมเดล Computer Vision กำลังประมวลผล
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    ส่งต่อภาพไปยัง FastAPI Microservice พอร์ต 8000 เพื่อคำนวณระดับความรุนแรง
                  </p>
                </div>
              )}

              {!isAnalyzing && !diagnosis && (
                <div className="bg-white rounded-3xl border border-dashed border-lime-300 p-10 text-center text-gray-500 shadow-xs">
                  <Bug className="w-12 h-12 text-lime-600/70 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-green-950">ยังไม่มีข้อมูลการตรวจโรค</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    กรุณาถ่ายภาพหรืออัปโหลดรูปภาพใบแตงโมเพื่อเริ่มการวิเคราะห์ด้วย AI Vision ทันที
                  </p>
                </div>
              )}

              {diagnosis && (
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl border border-lime-200 p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lime-100 pb-4">
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-green-950">
                          {diagnosis.thai_name}
                        </h2>
                        <p className="text-xs font-mono text-gray-500 italic mt-0.5">
                          {diagnosis.scientific_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getSeverityBadge(diagnosis.severity_level, diagnosis.severity)}
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="mt-4 bg-lime-50 rounded-2xl p-3 border border-lime-200">
                      <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                        <span className="text-green-900 flex items-center gap-1">
                          <Sparkles size={14} className="text-amber-500" /> ความแม่นยำ AI (Confidence):
                        </span>
                        <span className="text-green-800 font-mono">
                          {diagnosis.confidence_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-lime-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-green-600 h-full rounded-full transition-all duration-700"
                          style={{ width: `${diagnosis.confidence_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Urgent Action */}
                    {diagnosis.urgent_action && (
                      <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-950 flex items-start gap-2.5">
                        <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">ข้อปฏิบัติเร่งด่วนสำหรับเกษตรกร:</strong>
                          <span>{diagnosis.urgent_action}</span>
                        </div>
                      </div>
                    )}

                    {/* Symptoms */}
                    <div className="mt-4">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        ลักษณะอาการที่พบ:
                      </h3>
                      <p className="text-xs text-gray-800 mt-1 leading-relaxed bg-lime-50/40 p-3 rounded-xl border border-lime-100">
                        {diagnosis.symptoms}
                      </p>
                    </div>

                    {/* Treatment Grid */}
                    <div className="mt-5 grid sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
                        <h4 className="text-xs font-bold text-rose-900 mb-2">
                          💊 สารเคมีที่แนะนำ (พ่นตามรอบ):
                        </h4>
                        <ul className="text-xs text-gray-800 space-y-1.5 list-disc pl-4">
                          {diagnosis.chemical_control.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1 mb-2">
                          <Leaf size={14} className="text-emerald-600" />
                          <span>ชีวภัณฑ์ & เกษตรอินทรีย์:</span>
                        </h4>
                        <ul className="text-xs text-gray-800 space-y-1.5 list-disc pl-4">
                          {diagnosis.organic_control.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Prevention Plan */}
                    <div className="mt-4 rounded-2xl bg-amber-50/40 border border-amber-200 p-3.5 text-xs text-amber-950">
                      <strong className="block font-bold text-amber-900 mb-1">
                        🛡️ แนวทางป้องกันระยะยาว:
                      </strong>
                      <p className="leading-relaxed">{diagnosis.prevention}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Disease Catalog */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-lime-200 p-5 shadow-xs mb-4">
              <h2 className="text-base font-bold text-green-950">
                สารานุกรม 6 โรคพืชสำคัญในแตงโมไทย
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                รวบรวมอาการ เชื้อสาเหตุ และแนวทางควบคุมโรคตามหลักวิชาการโรคพืช
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {catalog.map((disease) => (
                <div
                  key={disease.id}
                  className="bg-white rounded-3xl border border-lime-200 p-5 shadow-xs hover:border-green-500 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-lime-100 pb-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-950">{disease.thai_name}</h3>
                      <p className="text-[11px] font-mono text-gray-500 italic">
                        {disease.scientific_name}
                      </p>
                    </div>
                    {getSeverityBadge(disease.severity_level, disease.severity)}
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed mb-3">
                    <strong>อาการ:</strong> {disease.symptoms}
                  </p>

                  <div className="text-[11px] bg-lime-50/60 p-3 rounded-xl border border-lime-100 space-y-1">
                    <p className="text-rose-900 font-semibold">
                      💊 สารเคมี: {disease.chemical_control.join(", ")}
                    </p>
                    <p className="text-emerald-900 font-semibold">
                      🌿 ชีวภัณฑ์: {disease.organic_control.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-lime-200 p-5 shadow-xs">
            <h2 className="text-base font-bold text-green-950 mb-3">
              ประวัติการตรวจโรคพืชในแปลงที่บันทึกไว้
            </h2>

            {history.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">ยังไม่มีประวัติการตรวจโรค</p>
            ) : (
              <div className="divide-y divide-lime-100">
                {history.map((rec) => (
                  <div key={rec.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-green-950">{rec.thai_name}</h4>
                      <p className="text-[11px] text-gray-500">
                        แปลง: {rec.farmId} • วันที่: {new Date(rec.detectedAt).toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-green-700 bg-lime-100 px-2 py-0.5 rounded-lg">
                        {rec.confidence_percentage}%
                      </span>
                      {getSeverityBadge(rec.severity_level, rec.severity)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Architecture */}
        {activeTab === "architecture" && (
          <div className="bg-white rounded-3xl border border-lime-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-green-950">
              สถาปัตยกรรมโครงงาน (Project Architecture)
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              โครงสร้างการพัฒนาแอปพลิเคชันตรวจจับโรคพืชในแตงโมที่รันอยู่ขณะนี้:
            </p>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <span className="font-bold text-emerald-900 block mb-1">📱 1. Frontend Client</span>
                <p className="text-gray-700">
                  React 19 + Vite + Tailwind CSS ขับเคลื่อนด้วย Capacitor สำหรับบิลด์เป็นแอปพลิเคชันบน
                  Android (.apk) และ iOS (Xcode) พร้อมรองรับ PWA
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <span className="font-bold text-blue-900 block mb-1">⚙️ 2. Node.js Backend</span>
                <p className="text-gray-700">
                  Express API Gateway (Port 3000) บริหารจัดการประวัติการตรวจในแปลง การบันทึกข้อมูลถาวร
                  และความปลอดภัย
                </p>
              </div>

              <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
                <span className="font-bold text-purple-900 block mb-1">🧠 3. FastAPI AI Engine</span>
                <p className="text-gray-700">
                  Python FastAPI Microservice (Port 8000) ประมวลผลภาพถ่ายใบแตงโม วิเคราะห์รอยโรค
                  และจำแนก 6 กลุ่มโรคพืชพร้อมมาตรการรักษา
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
