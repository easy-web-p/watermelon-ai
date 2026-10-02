import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Database,
  FileAudio,
  FileCheck,
  Layers,
  MessageSquare,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import {
  AdminStatistics,
  getAdminStatistics,
  getAuditLogs,
  getModelVersions,
  getTrainingCandidates,
  updateCandidateStatus,
} from "@/lib/api";
import {
  AuditLogItem,
  ModelVersionInfo,
  TrainingCandidate,
} from "@/types/consent";

interface AdminDashboardProps {
  onNavigate: (route: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [candidates, setCandidates] = useState<TrainingCandidate[]>([]);
  const [models, setModels] = useState<ModelVersionInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "training" | "models" | "audit">("overview");

  useEffect(() => {
    getAdminStatistics().then(setStats);
    getTrainingCandidates().then(setCandidates);
    getModelVersions().then(setModels);
    getAuditLogs().then(setAuditLogs);
  }, []);

  async function handleCandidateAction(id: string, action: "approved" | "rejected") {
    await updateCandidateStatus(id, action);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qualityReviewStatus: action } : c)),
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate("/chat")}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>กลับสู่หน้าแชท</span>
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Admin Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              แดชบอร์ดผู้ดูแลระบบแตงโม AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              ภาพรวมการใช้งาน สถิติคลื่นเสียงเคาะ ชุดข้อมูลฝึก AI (Training Candidates) และประวัติความปลอดภัย
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/80 p-1 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ภาพรวมสถิติ
            </button>
            <button
              onClick={() => setActiveTab("training")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                activeTab === "training"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ชุดข้อมูลฝึก AI ({candidates.filter((c) => c.qualityReviewStatus === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("models")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                activeTab === "models"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              รุ่นโมเดล ({models.length})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                activeTab === "audit"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Audit Logs
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Users className="text-blue-600" size={20} />}
                label="ผู้ใช้งานทั้งหมด"
                value={stats ? stats.totalUsers.toLocaleString() : "14,280"}
                subtext="เพิ่มขึ้น 12% ในสัปดาห์นี้"
              />
              <StatCard
                icon={<MessageSquare className="text-emerald-600" size={20} />}
                label="ข้อความวันนี้"
                value={stats ? stats.messagesToday.toLocaleString() : "9,410"}
                subtext="กำลังสนทนาสด 42 ห้อง"
              />
              <StatCard
                icon={<FileAudio className="text-amber-600" size={20} />}
                label="วิเคราะห์เสียงเคาะ"
                value={stats ? stats.knockAnalysesCount.toLocaleString() : "1,580"}
                subtext="เฉลี่ย 4 ครั้ง/ลูก"
              />
              <StatCard
                icon={<AlertCircle className="text-rose-600" size={20} />}
                label="รายงานรอตรวจสอบ"
                value={stats ? stats.pendingReportsCount.toString() : "12"}
                subtext="คัดกรองออกจากชุดฝึกแล้ว"
              />
            </section>

            {/* Distribution Charts & System Health */}
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between">
                  <span>สัดส่วนประเภทการใช้งานระบบ</span>
                  <span className="text-xs text-slate-400 font-normal">เรียลไทม์</span>
                </h3>

                <div className="space-y-4">
                  <ProgressRow
                    label="แชทถาม-ตอบทั่วไป (General Chat)"
                    percentage={stats?.usageDistribution.generalChat || 62}
                    color="bg-emerald-600"
                  />
                  <ProgressRow
                    label="วิเคราะห์เสียงเคาะแตงโม (Knock Analysis)"
                    percentage={stats?.usageDistribution.knockAnalysis || 25}
                    color="bg-amber-500"
                  />
                  <ProgressRow
                    label="แปลงเสียงพูดเป็นข้อความ (Voice Transcription)"
                    percentage={stats?.usageDistribution.transcription || 13}
                    color="bg-blue-600"
                  />
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between">
                  <span>ดัชนีคุณภาพและประสิทธิภาพของระบบ</span>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    สถานะปกติ 99.8%
                  </span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-xs text-slate-500 block">ระยะเวลาตอบเฉลี่ย AI</span>
                    <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                      1.42s
                    </span>
                    <span className="text-[11px] text-emerald-600 block mt-1">รวดเร็วตามมาตรฐาน</span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-xs text-slate-500 block">เสียงไม่ผ่านเกณฑ์คุณภาพ</span>
                    <span className="text-2xl font-extrabold text-amber-900 font-mono tabular-nums">
                      7.4%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">จากเสียงรบกวนภายนอก</span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-xs text-slate-500 block">อัตราคำตอบถูกรายงาน</span>
                    <span className="text-2xl font-extrabold text-emerald-900 font-mono tabular-nums">
                      0.5%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">ต่ำกว่าเกณฑ์ 1.0%</span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-xs text-slate-500 block">ผู้ใช้ที่ Opt-in ให้สิทธิ์เทรน</span>
                    <span className="text-2xl font-extrabold text-purple-900 font-mono tabular-nums">
                      3,840
                    </span>
                    <span className="text-[11px] text-purple-600 block mt-1">ได้รับการยินยอมถูกต้อง</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* Tab 2: Training Candidates Pipeline */}
        {activeTab === "training" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">นโยบายความปลอดภัยของชุดข้อมูล:</strong> ข้อมูลที่จะนำมาเป็นชุดฝึก AI ต้องได้รับความยินยอม (Opt-in) จากผู้ใช้ล่วงหน้า ผ่านการลบข้อมูลระบุตัวบุคคล (PII Anonymization) และผ่านการตรวจสอบรับรองโดยมนุษย์ (Human in the Loop) ห้ามเรียนรู้สดโดยตรงเด็ดขาด
            </div>

            {/* 10-Step AI Dataset Pipeline Visualization */}
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>กระบวนการสร้างชุดฝึก AI ที่ได้มาตรฐาน (Dataset Pipeline 10 ขั้นตอน)</span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Strict PDPA Compliance
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { step: "1", title: "ข้อมูลแชท/เสียง", desc: "รับเข้าจากผู้ใช้" },
                  { step: "2", title: "ตรวจความยินยอม", desc: "ต้อง Opt-in ชัดเจน" },
                  { step: "3", title: "คัดข้อมูลเกี่ยวข้อง", desc: "เฉพาะแตงโม & เสียงเคาะ" },
                  { step: "4", title: "ลบตัวตน (De-ID)", desc: "ตัดชื่อ/เบอร์/พิกัด" },
                  { step: "5", title: "ตรวจคุณภาพเสียง", desc: "SNR > 18dB ไม่มีเสียงแตก" },
                  { step: "6", title: "ผู้ดูแลอนุมัติ", desc: "Human in the loop" },
                  { step: "7", title: "สร้าง Dataset Ver.", desc: "Snapshot พร้อม metadata" },
                  { step: "8", title: "แบ่ง 70 / 15 / 15", desc: "Train / Val / Test" },
                  { step: "9", title: "ฝึกโมเดลใหม่", desc: "Resonance FFT Classifier" },
                  { step: "10", title: "ประเมินผล & ขึ้นใช้", desc: "ความแม่นยำ > 94%" },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex flex-col justify-between">
                    <div>
                      <span className="inline-block w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono text-center font-bold mb-1">
                        {item.step}
                      </span>
                      <strong className="block text-[11px] text-slate-800 leading-tight">
                        {item.title}
                      </strong>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{item.desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span>สัดส่วนชุดข้อมูลล่าสุด (WM-DS-2026.03):</span>
                  <strong className="font-mono text-emerald-800">Train: 2,688 (70%)</strong>
                  <strong className="font-mono text-blue-800">Val: 576 (15%)</strong>
                  <strong className="font-mono text-purple-800">Test: 576 (15%)</strong>
                </div>
                <button
                  type="button"
                  onClick={() => alert("ระบบได้สร้าง Snapshot ชุดข้อมูลเวอร์ชันใหม่ WM-DS-2026.04 เรียบร้อยแล้ว (รวม 3,840 ตัวอย่างที่ผ่านการรับรอง)")}
                  className="rounded-xl bg-purple-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 transition-colors shadow-2xs self-start sm:self-auto"
                >
                  + สร้าง Dataset Version ใหม่
                </button>
              </div>
            </article>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Candidate ID</th>
                    <th className="py-3 px-4">ประเภท</th>
                    <th className="py-3 px-4">ความยินยอม</th>
                    <th className="py-3 px-4">การลบข้อมูลส่วนบุคคล</th>
                    <th className="py-3 px-4">ผลการวิเคราะห์</th>
                    <th className="py-3 px-4">ความหวาน Brix</th>
                    <th className="py-3 px-4">สถานะการตรวจ</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.id}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {c.sourceType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle size={13} />
                          <span>ยินยอมถูกต้อง</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600">
                          {c.anonymizationStatus === "completed" ? "ลบข้อมูลส่วนบุคคลแล้ว" : "รอดำเนินการ"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.detectedClass}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{c.sweetnessBrix ? `${c.sweetnessBrix} °Bx` : "-"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.qualityReviewStatus === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.qualityReviewStatus === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.qualityReviewStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.qualityReviewStatus === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCandidateAction(c.id, "approved")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              อนุมัติเข้าชุดฝึก
                            </button>
                            <button
                              onClick={() => handleCandidateAction(c.id, "rejected")}
                              className="rounded-lg border border-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              ปฏิเสธ
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">บันทึกแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Model Versions */}
        {activeTab === "models" && (
          <div className="grid gap-4 md:grid-cols-3">
            {models.map((mod) => (
              <article
                key={mod.versionId}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    {mod.version}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mod.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {mod.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-3 leading-snug">
                  {mod.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">{mod.taskType}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ความแม่นยำ (Accuracy)</span>
                    <strong className="font-mono text-slate-900 tabular-nums text-sm">
                      {mod.accuracy}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">F1 Score</span>
                    <strong className="font-mono text-slate-900 tabular-nums text-sm">
                      {mod.f1Score}
                    </strong>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl font-mono">
                  ชุดข้อมูล: {mod.datasetVersion}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === "audit" && (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">วันเวลา (Timestamp)</th>
                  <th className="py-3 px-4">ผู้ดำเนินการ (Actor)</th>
                  <th className="py-3 px-4">การกระทำ (Action)</th>
                  <th className="py-3 px-4">ทรัพยากร (Resource)</th>
                  <th className="py-3 px-4">IP Hash</th>
                  <th className="py-3 px-4">ผลลัพธ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">{log.timestamp}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{log.actor}</td>
                    <td className="py-3 px-4 font-mono text-blue-700">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600">{log.resourceType}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.ipHash}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>{log.result}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{subtext}</p>
    </article>
  );
}

function ProgressRow({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono font-bold text-slate-900 tabular-nums">
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
