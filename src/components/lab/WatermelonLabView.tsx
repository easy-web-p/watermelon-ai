import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Disc,
  ExternalLink,
  Eye,
  FileAudio,
  FlaskConical,
  Layers,
  MessageSquare,
  Play,
  Plus,
  Scale,
  Sparkles,
  Volume2,
  Waves,
  X,
  Sliders,
} from "lucide-react";
import {
  AUDIO_SAMPLE_PRESETS,
  createWatermelonSpecimen,
  getWatermelonSpecimens,
  saveGroundTruth,
} from "@/lib/api";
import {
  AudioSamplePreset,
  GroundTruth,
  WatermelonSpecimen,
} from "@/types/chat";
import { WatermelonCertificateModal } from "@/components/lab/WatermelonCertificateModal";
import { AcousticCalibrationModal } from "@/components/lab/AcousticCalibrationModal";

interface WatermelonLabViewProps {
  onNavigate: (route: string) => void;
  onSendPresetToChat: (preset: AudioSamplePreset) => void;
}

export function WatermelonLabView({
  onNavigate,
  onSendPresetToChat,
}: WatermelonLabViewProps) {
  const [specimens, setSpecimens] = useState<WatermelonSpecimen[]>([]);
  const [selectedSpecimen, setSelectedSpecimen] = useState<WatermelonSpecimen | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Modals
  const [showAddSpecimen, setShowAddSpecimen] = useState(false);
  const [showGroundTruthModal, setShowGroundTruthModal] = useState<string | null>(null);
  const [certificateSpecimen, setCertificateSpecimen] = useState<WatermelonSpecimen | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);

  // New Specimen Form
  const [code, setCode] = useState("");
  const [variety, setVariety] = useState("พันธุ์กินรี (Kinnaree)");
  const [weight, setWeight] = useState(4.0);
  const [farm, setFarm] = useState("แปลงสุพรรณบุรี");
  const [shape, setShape] = useState<"กลม" | "ยาวรี" | "รี">("รี");
  const [spotColor, setSpotColor] = useState<"ขาวซีด" | "เหลืองอ่อน" | "เหลืองนวลอมครีม">("เหลืองนวลอมครีม");
  const [stem, setStem] = useState<"เขียวสด" | "เริ่มคดงอแห้ง" | "แห้งสนิท">("เริ่มคดงอแห้ง");

  // Ground Truth Form
  const [gtClass, setGtClass] = useState<GroundTruth["ripenessClass"]>("สุกพอดี (หวานฉ่ำ)");
  const [gtGrade, setGtGrade] = useState(4);
  const [gtBrix, setGtBrix] = useState(12.2);
  const [gtColor, setGtColor] = useState<GroundTruth["fleshColor"]>("แดงสด");
  const [gtHollow, setGtHollow] = useState(false);
  const [gtCrisp, setGtCrisp] = useState(5);
  const [gtJuice, setGtJuice] = useState(5);
  const [gtDefect, setGtDefect] = useState<GroundTruth["defectStatus"]>("ปกติ");
  const [gtAssessor, setGtAssessor] = useState("ผู้ประเมินมาตรฐานสวน");
  const [gtNotes, setGtNotes] = useState("");

  useEffect(() => {
    getWatermelonSpecimens().then((data) => {
      setSpecimens(data);
      if (data.length > 0) setSelectedSpecimen(data[0]);
    });
  }, []);

  function handlePlayAudio(preset: AudioSamplePreset) {
    if (activePlayingId === preset.id) {
      setActivePlayingId(null);
      return;
    }
    const audio = new Audio(preset.audioUrl);
    setActivePlayingId(preset.id);
    audio.play().catch(() => {});
    audio.onended = () => setActivePlayingId(null);
  }

  async function handleCreateSpecimen(e: React.FormEvent) {
    e.preventDefault();
    const newSpecimen = await createWatermelonSpecimen({
      watermelonCode: code || `WM-${Date.now().toString().slice(-4)}`,
      varietyName: variety,
      weightKg: Number(weight),
      harvestDate: new Date().toISOString().split("T")[0],
      daysAfterHarvest: 2,
      farmLocation: farm,
      shape,
      skinPattern: "เปลือกลายริ้วเขียวสลับดำ ผิวนวล",
      groundSpotColor: spotColor,
      stemCondition: stem,
      predictedAnalysis: {
        maturityClass: "สุกพอดี (หวานฉ่ำ)",
        maturityGrade: 4,
        confidence: 0.92,
        qualityStatus: "passed",
        detectedImpacts: 4,
        dominantFrequencyHz: 135,
        sweetnessEstimateBrix: 12.1,
        recommendations: ["เสียงกังวานในย่าน 135 Hz ผิวเริ่มนวล"],
      },
    });

    setSpecimens([newSpecimen, ...specimens]);
    setSelectedSpecimen(newSpecimen);
    setShowAddSpecimen(false);
    setCode("");
  }

  async function handleSaveGroundTruth(e: React.FormEvent) {
    e.preventDefault();
    if (!showGroundTruthModal) return;

    const gt = await saveGroundTruth(showGroundTruthModal, {
      ripenessGrade: Number(gtGrade),
      ripenessClass: gtClass,
      sweetnessBrix: Number(gtBrix),
      fleshFirmnessKgCm2: 1.18,
      fleshColor: gtColor,
      hollownessStatus: gtHollow,
      crispnessScore: Number(gtCrisp),
      juiceScore: Number(gtJuice),
      defectStatus: gtDefect,
      assessorName: gtAssessor,
      notes: gtNotes,
    });

    setSpecimens((prev) =>
      prev.map((s) => (s.watermelonId === showGroundTruthModal ? { ...s, groundTruth: gt } : s))
    );
    if (selectedSpecimen?.watermelonId === showGroundTruthModal) {
      setSelectedSpecimen({ ...selectedSpecimen, groundTruth: gt });
    }
    setShowGroundTruthModal(null);
  }

  return (
    <main className="min-h-screen bg-[#FFFBEF] p-4 sm:p-6 lg:p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("/chat")}
              className="flex items-center gap-2 text-sm font-semibold text-green-900 hover:text-green-700 transition-colors"
            >
              <ArrowLeft size={18} />
              <span>กลับสู่หน้าแชท</span>
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-semibold text-green-800 bg-lime-100 px-3 py-0.5 rounded-full border border-lime-200">
              Fruit Inspection & Acoustic Lab
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalibration(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-colors"
              title="สอบเทียบโมเดล AI และปรับจูนไมโครโฟน"
            >
              <Sliders size={16} />
              <span>สอบเทียบไมค์ & สายพันธุ์</span>
            </button>

            <button
              onClick={() => setShowAddSpecimen(true)}
              className="flex items-center gap-2 rounded-2xl bg-green-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-green-800 transition-colors"
            >
              <Plus size={16} />
              <span>บันทึกตัวอย่างแตงโมใหม่</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-2xl shadow-xs">
              🍉
            </span>
            <span>แล็บตรวจคลื่นเสียง & บันทึกผลผ่าจริง (Ground Truth Lab)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-3xl leading-relaxed">
            ทดลองฟังตัวอย่างเสียงเคาะแตงโมในแต่ละระยะสุกแก่ บันทึกข้อมูลตัวอย่างแตงโม (Watermelons) และเปรียบเทียบผลทำนายของ AI กับผลผ่าจริง (Ground Truth Validation) เพื่อยกระดับความแม่นยำของแบบจำลอง
          </p>
        </div>

        {/* Audio Sample Test Bench */}
        <section className="mb-10 rounded-3xl border border-lime-200 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                ชุดทดสอบคลื่นเสียงมาตรฐาน (Acoustic Presets)
              </span>
              <h2 className="text-lg font-bold text-green-950">
                ทดลองส่งคลื่นเสียงเคาะแตงโม 3 ระยะเข้าสู่ AI
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              คลิกเพื่อฟังเสียงจริง หรือส่งไปวิเคราะห์ในแชททันที
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {AUDIO_SAMPLE_PRESETS.map((preset) => {
              const isPlaying = activePlayingId === preset.id;
              const isRipe = preset.expectedClass.includes("สุกพอดี");
              const isUnripe = preset.expectedClass.includes("อ่อน");

              return (
                <div
                  key={preset.id}
                  className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between ${
                    isPlaying
                      ? "border-green-600 bg-lime-50/80 ring-2 ring-lime-200"
                      : "border-lime-200/90 bg-[#FFFDF7] hover:border-lime-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isRipe
                            ? "bg-emerald-100 text-emerald-800"
                            : isUnripe
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {preset.expectedClass}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-700">
                        {preset.frequencyHz} Hz
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-green-950">{preset.title}</h3>
                    <p className="text-xs text-green-800/80 font-medium mt-0.5">
                      {preset.variety}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                      {preset.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-600 border-t border-lime-100 pt-2">
                      <span>ความหวานเป้าหมาย:</span>
                      <strong className="font-mono text-green-950">{preset.sweetnessBrix} °Bx</strong>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(preset)}
                      className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPlaying
                          ? "bg-red-500 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Waves size={15} className="animate-pulse" />
                          <span>กำลังเล่นเสียง...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={15} />
                          <span>ฟังเสียงเคาะ</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSendPresetToChat(preset)}
                      className="rounded-xl bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 transition-colors flex items-center gap-1 cursor-pointer"
                      title="ส่งเสียงนี้ไปวิเคราะห์ในแชท"
                    >
                      <span>ตรวจในแชท</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Specimens & Ground Truths Main Workspace */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* List of Specimens */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-green-950 text-base flex items-center gap-2">
                <FlaskConical size={18} className="text-green-700" />
                <span>ตัวอย่างแตงโมในฐานข้อมูล ({specimens.length})</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">ตาราง watermelons</span>
            </div>

            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {specimens.map((specimen) => {
                const isSelected = selectedSpecimen?.watermelonId === specimen.watermelonId;
                const hasGt = Boolean(specimen.groundTruth);

                return (
                  <article
                    key={specimen.watermelonId}
                    onClick={() => setSelectedSpecimen(specimen)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-green-600 bg-white ring-2 ring-green-100 shadow-sm"
                        : "border-lime-200 bg-white hover:bg-lime-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-green-950">
                          {specimen.watermelonCode}
                        </span>
                        <span className="text-xs text-gray-500">· {specimen.varietyName}</span>
                      </div>
                      {hasGt ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>ผ่าตรวจแล้ว</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          รอผ่าตรวจ
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-600 bg-gray-50/70 p-2 rounded-xl">
                      <div>
                        <span className="text-gray-400 block text-[10px]">น้ำหนัก</span>
                        <span className="font-mono font-bold text-gray-800">{specimen.weightKg} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">AI คาดการณ์</span>
                        <span className="font-semibold text-emerald-800 truncate block">
                          {specimen.predictedAnalysis?.maturityClass || "รอดำเนินการ"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Brix จริง</span>
                        <span className="font-mono font-bold text-amber-900">
                          {specimen.groundTruth?.sweetnessBrix ? `${specimen.groundTruth.sweetnessBrix} °Bx` : "-"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Detailed Specimen Card + Ground Truth Comparison */}
          <div className="lg:col-span-7">
            {selectedSpecimen ? (
              <div className="rounded-3xl border border-lime-200 bg-white p-6 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-lime-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-green-950">
                        {selectedSpecimen.watermelonCode}
                      </span>
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold">
                        {selectedSpecimen.varietyName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      แหล่งปลูก: {selectedSpecimen.farmLocation} · เก็บเกี่ยวเมื่อ {selectedSpecimen.harvestDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {selectedSpecimen.predictedAnalysis && (
                      <button
                        type="button"
                        onClick={() => setCertificateSpecimen(selectedSpecimen)}
                        className="rounded-xl border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="ออกใบรับรองผลวิเคราะห์แตงโมลูกนี้"
                      >
                        <Award size={14} className="text-amber-700" />
                        <span>ออกใบรับรองคุณภาพ</span>
                      </button>
                    )}

                    {!selectedSpecimen.groundTruth ? (
                      <button
                        onClick={() => setShowGroundTruthModal(selectedSpecimen.watermelonId)}
                        className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <ClipboardCheck size={14} />
                        <span>บันทึกผลผ่าตรวจจริง</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowGroundTruthModal(selectedSpecimen.watermelonId)}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        แก้ไขผลผ่าตรวจ
                      </button>
                    )}
                  </div>
                </div>

                {/* External Physical Properties */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    ลักษณะทางกายภาพภายนอก (Physical Condition)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-lime-50/60 border border-lime-100">
                      <span className="text-gray-500 block text-[10px]">น้ำหนักผล</span>
                      <strong className="font-mono text-gray-900 text-sm">{selectedSpecimen.weightKg} กก.</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-lime-50/60 border border-lime-100">
                      <span className="text-gray-500 block text-[10px]">รูปทรงผล</span>
                      <strong className="text-gray-900 text-sm">{selectedSpecimen.shape}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-lime-50/60 border border-lime-100">
                      <span className="text-gray-500 block text-[10px]">รอยแต้มดิน (Ground Spot)</span>
                      <strong className="text-amber-900 text-sm">{selectedSpecimen.groundSpotColor}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-lime-50/60 border border-lime-100">
                      <span className="text-gray-500 block text-[10px]">สภาพขั้วแตงโม</span>
                      <strong className="text-gray-900 text-sm">{selectedSpecimen.stemCondition}</strong>
                    </div>
                  </div>
                </div>

                {/* Side by Side: AI Prediction VS Ground Truth */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* AI Prediction Box */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-700" />
                        <span>ผลทำนาย AI (Acoustic Model)</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-800">
                        {Math.round((selectedSpecimen.predictedAnalysis?.confidence || 0.9) * 100)}%
                      </span>
                    </div>

                    <p className="text-lg font-extrabold text-emerald-900">
                      {selectedSpecimen.predictedAnalysis?.maturityClass}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      ระดับความสุก {selectedSpecimen.predictedAnalysis?.maturityGrade}/5 · ความถี่ {selectedSpecimen.predictedAnalysis?.dominantFrequencyHz} Hz
                    </p>

                    <div className="mt-3 pt-3 border-t border-emerald-200/60 flex justify-between items-baseline text-xs">
                      <span className="text-gray-500">ประเมินความหวาน:</span>
                      <span className="font-mono text-base font-extrabold text-emerald-950">
                        {selectedSpecimen.predictedAnalysis?.sweetnessEstimateBrix} °Bx
                      </span>
                    </div>
                  </div>

                  {/* Ground Truth Box */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <ClipboardCheck size={14} className="text-amber-700" />
                        <span>ผลผ่าจริง (Ground Truth)</span>
                      </span>
                      {selectedSpecimen.groundTruth && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {selectedSpecimen.groundTruth.assessedAt}
                        </span>
                      )}
                    </div>

                    {selectedSpecimen.groundTruth ? (
                      <div>
                        <p className="text-lg font-extrabold text-amber-950">
                          {selectedSpecimen.groundTruth.ripenessClass}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          เกรดจริง {selectedSpecimen.groundTruth.ripenessGrade}/5 · สีเนื้อ: {selectedSpecimen.groundTruth.fleshColor}
                        </p>

                        <div className="mt-3 pt-3 border-t border-amber-200/60 flex justify-between items-baseline text-xs">
                          <span className="text-gray-500">ความหวานจริง (Brix Refractometer):</span>
                          <span className="font-mono text-base font-extrabold text-amber-950">
                            {selectedSpecimen.groundTruth.sweetnessBrix} °Bx
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] text-gray-600 flex justify-between">
                          <span>สถานะไส้ล้ม/กลวง:</span>
                          <span className="font-semibold text-gray-900">
                            {selectedSpecimen.groundTruth.hollownessStatus ? "⚠️ พบโพรงอากาศ (ไส้ล้ม)" : "✅ เนื้อแน่นสมบูรณ์"}
                          </span>
                        </div>

                        {selectedSpecimen.groundTruth.notes && (
                          <p className="mt-2 text-[11px] text-gray-500 bg-white/70 p-2 rounded-lg border border-amber-200/50">
                            "{selectedSpecimen.groundTruth.notes}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-gray-400">
                        <span>ยังไม่ได้ผ่าตรวจผลจริง</span>
                        <button
                          onClick={() => setShowGroundTruthModal(selectedSpecimen.watermelonId)}
                          className="mt-2 block mx-auto text-amber-800 font-bold underline"
                        >
                          กดเพื่อบันทึกผลผ่าตรวจ
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation Analysis */}
                {selectedSpecimen.groundTruth && selectedSpecimen.predictedAnalysis && (
                  <div className="rounded-2xl border border-lime-200 bg-linear-to-r from-lime-50 to-emerald-50 p-4 text-xs text-green-950">
                    <p className="font-bold flex items-center gap-1.5 text-sm mb-1">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>ผลการเปรียบเทียบ AI vs ข้อเท็จจริง (Model Validation)</span>
                    </p>
                    <p className="leading-5 text-gray-700">
                      ค่าความคลาดเคลื่อนความหวาน (Brix Error):{" "}
                      <strong className="font-mono text-green-900">
                        {Math.abs(
                          selectedSpecimen.groundTruth.sweetnessBrix -
                            (selectedSpecimen.predictedAnalysis.sweetnessEstimateBrix ?? 12.0)
                        ).toFixed(1)}{" "}
                        °Bx
                      </strong>{" "}
                      · การจำแนกความสุก:{" "}
                      <strong>
                        {selectedSpecimen.groundTruth.ripenessClass ===
                        selectedSpecimen.predictedAnalysis.maturityClass
                          ? "ถูกต้องตรงกัน (Match 100%)"
                          : "มีความแตกต่างเล็กน้อย"}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
                เลือกตัวอย่างแตงโมเพื่อดูรายละเอียด
              </div>
            )}
          </div>
        </section>

        {/* Modal: Add Watermelon Specimen */}
        {showAddSpecimen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-lime-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-green-950">ลงทะเบียนแตงโมตัวอย่างใหม่</h2>
                <button
                  onClick={() => setShowAddSpecimen(false)}
                  className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSpecimen} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รหัสแตงโม (Watermelon Code)
                    </label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="เช่น WM-2026-SP05"
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      สายพันธุ์
                    </label>
                    <select
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
                    >
                      <option value="พันธุ์กินรี (Kinnaree)">พันธุ์กินรี (Kinnaree)</option>
                      <option value="พันธุ์ตอร์ปิโด (Torpedo)">พันธุ์ตอร์ปิโด (Torpedo)</option>
                      <option value="พันธุ์ซอนญ่า (Sonya)">พันธุ์ซอนญ่า (Sonya)</option>
                      <option value="พันธุ์ไดอาน่า (Diana / เนื้อเหลือง)">พันธุ์ไดอาน่า (เนื้อเหลือง)</option>
                      <option value="พันธุ์ไร้เมล็ด (Seedless)">พันธุ์ไร้เมล็ด (Seedless)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      น้ำหนัก (กก.)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      แหล่งปลูก / แปลงวิจัย
                    </label>
                    <input
                      required
                      value={farm}
                      onChange={(e) => setFarm(e.target.value)}
                      placeholder="เช่น แปลงสุพรรณบุรี ดอนเจดีย์"
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รูปทรง
                    </label>
                    <select
                      value={shape}
                      onChange={(e) => setShape(e.target.value as "กลม" | "ยาวรี" | "รี")}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                    >
                      <option value="รี">รี</option>
                      <option value="ยาวรี">ยาวรี</option>
                      <option value="กลม">กลม</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รอยแต้มดิน
                    </label>
                    <select
                      value={spotColor}
                      onChange={(e) => setSpotColor(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                    >
                      <option value="เหลืองนวลอมครีม">เหลืองนวลอมครีม</option>
                      <option value="เหลืองอ่อน">เหลืองอ่อน</option>
                      <option value="ขาวซีด">ขาวซีด</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      สภาพขั้ว
                    </label>
                    <select
                      value={stem}
                      onChange={(e) => setStem(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                    >
                      <option value="เริ่มคดงอแห้ง">เริ่มคดงอแห้ง</option>
                      <option value="แห้งสนิท">แห้งสนิท</option>
                      <option value="เขียวสด">เขียวสด</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSpecimen(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-700 py-2.5 text-xs font-semibold text-white hover:bg-green-800"
                  >
                    บันทึกตัวอย่าง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Ground Truth Assessment Form */}
        {showGroundTruthModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-amber-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <ClipboardCheck size={18} />
                  </span>
                  <h2 className="text-base font-bold text-gray-900">
                    บันทึกผลจริงหลังผ่าแตงโม (Ground Truth)
                  </h2>
                </div>
                <button
                  onClick={() => setShowGroundTruthModal(null)}
                  className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGroundTruth} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ระดับความสุกจริง (Class)
                    </label>
                    <select
                      value={gtClass}
                      onChange={(e) => setGtClass(e.target.value as GroundTruth["ripenessClass"])}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600"
                    >
                      <option value="สุกพอดี (หวานฉ่ำ)">สุกพอดี (หวานฉ่ำ)</option>
                      <option value="อ่อนเกินไป">อ่อนเกินไป</option>
                      <option value="สุกเกิน/ไส้ล้ม">สุกเกิน/ไส้ล้ม</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ความหวานจริง (°Brix Refractometer)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={gtBrix}
                      onChange={(e) => setGtBrix(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-green-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      สีเนื้อใน
                    </label>
                    <select
                      value={gtColor}
                      onChange={(e) => setGtColor(e.target.value as GroundTruth["fleshColor"])}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                    >
                      <option value="แดงสด">แดงสด</option>
                      <option value="แดงเข้ม">แดงเข้ม</option>
                      <option value="ชมพูอ่อน">ชมพูอ่อน</option>
                      <option value="เหลืองทอง">เหลืองทอง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ความผิดปกติ (Defects)
                    </label>
                    <select
                      value={gtDefect}
                      onChange={(e) => setGtDefect(e.target.value as GroundTruth["defectStatus"])}
                      className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                    >
                      <option value="ปกติ">ปกติ ไม่พบความผิดปกติ</option>
                      <option value="ไส้ล้ม">ไส้ล้ม (Hollow Heart)</option>
                      <option value="เนื้อช้ำ">เนื้อช้ำ/ฉ่ำน้ำเกิน</option>
                      <option value="แกนแข็ง">แกนกลางแข็งดิบ</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="hollowCheck"
                    checked={gtHollow}
                    onChange={(e) => setGtHollow(e.target.checked)}
                    className="h-4 w-4 accent-amber-600 cursor-pointer"
                  />
                  <label htmlFor="hollowCheck" className="text-xs font-semibold text-amber-950 cursor-pointer">
                    พบโพรงอากาศกลางลูก (ไส้ล้ม / Hollow Core)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่อผู้ตรวจ / ผู้เชี่ยวชาญ
                  </label>
                  <input
                    required
                    value={gtAssessor}
                    onChange={(e) => setGtAssessor(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={gtNotes}
                    onChange={(e) => setGtNotes(e.target.value)}
                    placeholder="เช่น เมล็ดแก่สีดำ เนื้อละเอียดกรอบมาก..."
                    className="w-full rounded-xl border border-gray-200 p-2 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowGroundTruthModal(null)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    บันทึกผลผ่าจริง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AcousticCalibrationModal
          isOpen={showCalibration}
          onClose={() => setShowCalibration(false)}
        />
      </div>
    </main>
  );
}
