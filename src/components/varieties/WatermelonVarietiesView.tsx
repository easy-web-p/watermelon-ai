import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  Info,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

interface Props {
  onNavigate: (route: string) => void;
}

export interface VarietyDetail {
  id: string;
  nameThai: string;
  nameEng: string;
  fleshColor: "แดง" | "เหลือง";
  shape: "กลมรี" | "กลม" | "ยาวตอร์ปิโด";
  seedType: "มีเมล็ด" | "ไร้เมล็ด";
  averageWeightKg: string;
  typicalBrix: string;
  harvestDays: string;
  rindCharacteristics: string;
  fleshTexture: string;
  optimalResonanceHz: string;
  recommendedUse: string;
  growingRegions: string;
  audioSignatureNote: string;
  badgeColor: string;
}

export const WATERMELON_VARIETIES: VarietyDetail[] = [
  {
    id: "khinri",
    nameThai: "พันธุ์กินรี (Khinri)",
    nameEng: "Citrullus lanatus 'Khinri'",
    fleshColor: "แดง",
    shape: "กลมรี",
    seedType: "มีเมล็ด",
    averageWeightKg: "4.0 – 6.0 กก.",
    typicalBrix: "12.0 – 13.5 °Bx",
    harvestDays: "65 – 70 วัน",
    rindCharacteristics: "เปลือกสีเขียวอ่อน ลายริ้วเขียวเข้มคมชัด เปลือกหนาปานกลาง (~1.0 ซม.)",
    fleshTexture: "เนื้อสีแดงสดใส ละเอียดเป็นเนื้อทราย กรอบฉ่ำน้ำ ไส้ไม่แตกง่าย",
    optimalResonanceHz: "130 – 140 Hz",
    recommendedUse: "รับประทานผลสด ปั่นสมูทตี้ ตลาดระดับพรีเมียม",
    growingRegions: "สุพรรณบุรี, กาญจนบุรี, ชัยนาท, นครสวรรค์",
    audioSignatureNote: "เมื่อสุกจัดเนื้อจะอมน้ำและสะสมน้ำตาลสม่ำเสมอ ส่งผลให้ความถี่หลักอยู่นิ่งที่ ~134 Hz พร้อมการสั่นสะท้อนกังวาน ไม่ทึบอับ",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  {
    id: "sonya",
    nameThai: "พันธุ์ซอนญ่า (Sonya / Sonya Plus)",
    nameEng: "Citrullus lanatus 'Sonya'",
    fleshColor: "แดง",
    shape: "กลมรี",
    seedType: "มีเมล็ด",
    averageWeightKg: "3.5 – 5.5 กก.",
    typicalBrix: "11.5 – 13.0 °Bx",
    harvestDays: "60 – 65 วัน",
    rindCharacteristics: "ผิวเขียวเข้มมาก ลายแถบดำกลืนไปกับผิว เปลือกเหนียว ทนการกระแทกระหว่างขนส่ง",
    fleshTexture: "เนื้อสีแดงเข้มจัด แน่นกรอบ เส้นใยละเอียด ทนการสุกค้างต้น",
    optimalResonanceHz: "135 – 145 Hz",
    recommendedUse: "ส่งออกระยะไกล ขายตลาดค้าส่งและห้างสรรพสินค้า",
    growingRegions: "นครปฐม, ราชบุรี, ขอนแก่น, สกลนคร",
    audioSignatureNote: "เนื่องจากเปลือกเหนียวตึงกว่ากินรี ความถี่เสียงเคาะจึงสูงกว่าเล็กน้อย (~138 Hz) ถือว่าสุกพร้อมตัด",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
  },
  {
    id: "torpedo",
    nameThai: "พันธุ์ตอร์ปิโด (Torpedo / Sugar Baby Long)",
    nameEng: "Citrullus lanatus 'Torpedo'",
    fleshColor: "แดง",
    shape: "ยาวตอร์ปิโด",
    seedType: "มีเมล็ด",
    averageWeightKg: "6.0 – 9.5 กก.",
    typicalBrix: "11.0 – 12.5 °Bx",
    harvestDays: "70 – 78 วัน",
    rindCharacteristics: "ผลทรงกระบอกยาว ปลายมน เปลือกหนา 1.2–1.5 ซม. ทนการกดทับได้สูง",
    fleshTexture: "เนื้อแน่นฉ่ำน้ำ รสหวานนุ่ม ไม่เละง่าย ให้ปริมาณเนื้อเยอะคุ้มค่า",
    optimalResonanceHz: "118 – 132 Hz",
    recommendedUse: "ทำแตงโมชิ้นขายหน้าร้าน น้ำแตงโมคั้นสด ร้านอาหารและบุฟเฟต์",
    growingRegions: "กาญจนบุรี, ปราจีนบุรี, ประจวบคีรีขันธ์",
    audioSignatureNote: "ด้วยรูปทรงกระบอกและปริมาตรผลที่ยาวกว่า คลื่นสะท้อนความถี่ต่ำกว่าปกติ (~122 Hz) ไม่ควรเข้าใจผิดว่าเป็นแตงโมไส้กลวง",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
  },
  {
    id: "diana",
    nameThai: "พันธุ์ไดอาน่า / แตงโมเนื้อเหลือง (Diana Gold)",
    nameEng: "Citrullus lanatus 'Diana Yellow'",
    fleshColor: "เหลือง",
    shape: "กลม",
    seedType: "มีเมล็ด",
    averageWeightKg: "3.0 – 4.5 กก.",
    typicalBrix: "12.0 – 14.0 °Bx",
    harvestDays: "60 – 65 วัน",
    rindCharacteristics: "เปลือกสีเขียวสว่าง ลายริ้วถี่บาง เปลือกค่อนข้างบาง ต้องระวังการกระแทก",
    fleshTexture: "เนื้อสีเหลืองทองอร่าม กลิ่นหอมคล้ายน้ำผึ้งและเกสรดอกไม้ หวานแหลมชื่นใจ",
    optimalResonanceHz: "140 – 152 Hz",
    recommendedUse: "ผลไม้จัดจานระดับโรงแรม ร้านคาเฟ่ ของขวัญเทศกาล",
    growingRegions: "เชียงใหม่, พิษณุโลก, นครราชสีมา",
    audioSignatureNote: "เนื้อมีความหนาแน่นละเอียดมากและเปลือกบาง เสียงเคาะจะมีความแหลมใสก้องกังวานเด่นชัด (~146 Hz)",
    badgeColor: "bg-yellow-100 text-yellow-900 border-yellow-300",
  },
  {
    id: "boeing",
    nameThai: "พันธุ์โบอิ้ง 787 (Boeing 787)",
    nameEng: "Citrullus lanatus 'Boeing 787'",
    fleshColor: "แดง",
    shape: "กลมรี",
    seedType: "มีเมล็ด",
    averageWeightKg: "4.5 – 6.5 กก.",
    typicalBrix: "12.0 – 13.0 °Bx",
    harvestDays: "65 – 70 วัน",
    rindCharacteristics: "ผิวเขียวเข้มลายพาดกว้าง คมชัด ติดผลดก ผิวตึงเงางาม",
    fleshTexture: "เนื้อสีแดงชาด เนื้อแน่นกรอบทนฝน ไม่แตกง่ายเมื่อโดนสภาพอากาศแปรปรวน",
    optimalResonanceHz: "132 – 142 Hz",
    recommendedUse: "ตลาดสดทั่วไป ตลาดส่งออก และแปลงเกษตรอุตสาหกรรม",
    growingRegions: "เพชรบูรณ์, กำแพงเพชร, อุดรธานี",
    audioSignatureNote: "มีค่า SNR สูง ชัดเจน เสียงเคาะจะมี 3-4 Impact Peaks ชัดเจนเมื่อเคาะด้วยข้อนิ้ว",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  {
    id: "seedless",
    nameThai: "พันธุ์ไร้เมล็ด (Triploid Seedless)",
    nameEng: "Citrullus lanatus var. 'Seedless'",
    fleshColor: "แดง",
    shape: "กลม",
    seedType: "ไร้เมล็ด",
    averageWeightKg: "5.0 – 7.0 กก.",
    typicalBrix: "12.5 – 13.8 °Bx",
    harvestDays: "75 – 82 วัน",
    rindCharacteristics: "ลายริ้วเขียวอ่อนสลับเข้ม เปลือกแข็งแรง ปลูกยากกว่าพันธุ์ทั่วไป",
    fleshTexture: "ไม่มีเมล็ดดำกวนใจ เนื้อแน่นฉ่ำสม่ำเสมอตลอดผล ไม่พบปัญหาไส้ล้มง่าย",
    optimalResonanceHz: "135 – 146 Hz",
    recommendedUse: "ซูเปอร์มาร์เก็ตพรีเมียม ร้านอาหารสุขภาพ เด็กและผู้สูงอายุ",
    growingRegions: "สระบุรี, นครราชสีมา, เพชรบุรี",
    audioSignatureNote: "เนื้อในไม่มีช่องว่างของรังไข่เมล็ด คลื่นเดินทางผ่านเนื้อได้เรียบเนียนที่สุด ไม่มีฮาร์มอนิกผิดเพี้ยน",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
  },
];

export function WatermelonVarietiesView({ onNavigate }: Props) {
  const [search, setSearch] = useState("");
  const [fleshFilter, setFleshFilter] = useState<"all" | "แดง" | "เหลือง">("all");
  const [seedFilter, setSeedFilter] = useState<"all" | "มีเมล็ด" | "ไร้เมล็ด">("all");
  const [selectedVariety, setSelectedVariety] = useState<VarietyDetail | null>(null);

  const filtered = WATERMELON_VARIETIES.filter((v) => {
    const matchSearch =
      v.nameThai.toLowerCase().includes(search.toLowerCase()) ||
      v.nameEng.toLowerCase().includes(search.toLowerCase()) ||
      v.growingRegions.toLowerCase().includes(search.toLowerCase()) ||
      v.rindCharacteristics.toLowerCase().includes(search.toLowerCase());

    const matchFlesh = fleshFilter === "all" || v.fleshColor === fleshFilter;
    const matchSeed = seedFilter === "all" || v.seedType === seedFilter;

    return matchSearch && matchFlesh && matchSeed;
  });

  function handleChatAboutVariety(variety: VarietyDetail) {
    useChatStore.getState().setMode("general");
    useChatStore
      .getState()
      .setDraftText(
        `ฉันสนใจแตงโม ${variety.nameThai}: ช่วยแนะนำวิธีการเลือกซื้อ การดูขั้วและจุดนอนดิน รวมถึงแนวทางการเคาะเสียงช่วง ${variety.optimalResonanceHz} ให้ได้ผลหวานที่สุด`
      );
    onNavigate("/chat");
  }

  function handleSimulateVariety(variety: VarietyDetail) {
    onNavigate("/simulator");
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-lime-200/80 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/chat")}
              className="flex items-center gap-1.5 rounded-xl border border-lime-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-lime-50 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>กลับสู่แชท</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍉</span>
              <h1 className="font-extrabold text-green-950 text-base sm:text-lg">
                สารานุกรมสายพันธุ์แตงโมไทย (Cultivar Encyclopedia)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/simulator")}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition-colors cursor-pointer shadow-2xs"
            >
              <Waves size={14} className="text-cyan-700" />
              <span>เปิดเครื่องจำลองเคาะ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Banner */}
        <section className="rounded-3xl border border-lime-200 bg-linear-to-r from-emerald-800 to-green-900 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-300/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
              คู่มือเกษตรและผู้บริโภค
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black">
              ฐานข้อมูลลักษณะทางกายภาพและความถี่เสียงเคาะ
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-lime-100/90 leading-relaxed">
              แตงโมแต่ละสายพันธุ์มีความหนาของเปลือก โครงสร้างเนื้อทราย และปริมาณน้ำตาลที่แตกต่างกัน
              ส่งผลให้ย่านความถี่เสียงเคาะที่บ่งบอกความสุกพอดี (Optimal Resonance) แตกต่างกัน
              ข้อมูลชุดนี้ใช้เป็นมาตรฐานสอบเทียบสำหรับโมเดลแตงโม AI
            </p>
          </div>
          <div className="absolute right-4 bottom-2 text-8xl opacity-15 select-none pointer-events-none hidden sm:block">
            🍉
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="rounded-2xl border border-lime-200 bg-white p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อพันธุ์, แหล่งปลูก, หรือลักษณะ..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-green-600 focus:bg-white outline-none"
            />
          </div>

          {/* Flesh color tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 text-[11px] font-medium mr-1">สีเนื้อ:</span>
            <button
              type="button"
              onClick={() => setFleshFilter("all")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                fleshFilter === "all"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setFleshFilter("แดง")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                fleshFilter === "แดง"
                  ? "bg-rose-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🔴 เนื้อแดง
            </button>
            <button
              type="button"
              onClick={() => setFleshFilter("เหลือง")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                fleshFilter === "เหลือง"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🟡 เนื้อเหลือง
            </button>
          </div>

          {/* Seed filter tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 text-[11px] font-medium mr-1">เมล็ด:</span>
            <button
              type="button"
              onClick={() => setSeedFilter("all")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                seedFilter === "all"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setSeedFilter("มีเมล็ด")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                seedFilter === "มีเมล็ด"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              มีเมล็ด
            </button>
            <button
              type="button"
              onClick={() => setSeedFilter("ไร้เมล็ด")}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition-colors cursor-pointer ${
                seedFilter === "ไร้เมล็ด"
                  ? "bg-purple-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ไร้เมล็ด
            </button>
          </div>
        </section>

        {/* Varieties Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-lime-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black text-green-950 flex items-center gap-1.5">
                      <span>{item.fleshColor === "แดง" ? "🍉" : "🟡"}</span>
                      <span>{item.nameThai}</span>
                    </h3>
                    <span className="text-[11px] text-gray-400 italic block font-mono">
                      {item.nameEng}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border shrink-0 ${item.badgeColor}`}
                  >
                    {item.typicalBrix}
                  </span>
                </div>

                {/* Key stats pill row */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="rounded-xl bg-gray-50 p-2 border border-gray-100">
                    <span className="text-[10px] text-gray-400 block">ทรงผล</span>
                    <strong className="text-gray-800 font-bold">{item.shape}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 border border-gray-100">
                    <span className="text-[10px] text-gray-400 block">น้ำหนักผล</span>
                    <strong className="text-gray-800 font-bold">{item.averageWeightKg}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 border border-gray-100">
                    <span className="text-[10px] text-gray-400 block">อายุเก็บเกี่ยว</span>
                    <strong className="text-gray-800 font-bold">{item.harvestDays}</strong>
                  </div>
                </div>

                {/* Acoustic sweet-spot badge */}
                <div className="mt-3 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 p-2.5 text-xs text-cyan-950 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Volume2 size={14} className="text-cyan-700" />
                    <span>ความถี่สุกพอดี:</span>
                  </span>
                  <span className="font-mono font-black text-cyan-900 bg-white px-2 py-0.5 rounded-lg border border-cyan-200">
                    {item.optimalResonanceHz}
                  </span>
                </div>

                {/* Characteristics */}
                <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-3">
                  {item.rindCharacteristics}
                </p>

                {/* Growing regions */}
                <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-gray-700">แหล่งปลูกสำคัญ:</span>
                  <span className="truncate">{item.growingRegions}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariety(item)}
                  className="flex-1 rounded-xl bg-lime-100/80 px-3 py-2 text-xs font-bold text-green-950 hover:bg-lime-200 transition-colors text-center cursor-pointer"
                >
                  ดูรายละเอียดเชิงลึก
                </button>
                <button
                  type="button"
                  onClick={() => handleChatAboutVariety(item)}
                  title="คุยกับ AI เกี่ยวกับพันธุ์นี้"
                  className="rounded-xl border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>

        {/* Deep Detail Modal */}
        {selectedVariety && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {selectedVariety.fleshColor === "แดง" ? "🍉" : "🟡"}
                    </span>
                    <h3 className="text-xl font-extrabold text-green-950">
                      {selectedVariety.nameThai}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono italic">
                    {selectedVariety.nameEng}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVariety(null)}
                  className="rounded-xl bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Specifications table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl bg-lime-50/80 p-3 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">ค่าความหวาน</span>
                  <strong className="text-sm font-black text-green-900">
                    {selectedVariety.typicalBrix}
                  </strong>
                </div>
                <div className="rounded-xl bg-lime-50/80 p-3 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">ความถี่เสียงเคาะสุก</span>
                  <strong className="text-sm font-black text-cyan-900 font-mono">
                    {selectedVariety.optimalResonanceHz}
                  </strong>
                </div>
                <div className="rounded-xl bg-lime-50/80 p-3 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">น้ำหนักเฉลี่ย</span>
                  <strong className="text-sm font-black text-gray-800">
                    {selectedVariety.averageWeightKg}
                  </strong>
                </div>
                <div className="rounded-xl bg-lime-50/80 p-3 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">ระยะเก็บเกี่ยว</span>
                  <strong className="text-sm font-black text-gray-800">
                    {selectedVariety.harvestDays}
                  </strong>
                </div>
              </div>

              {/* Acoustic Signature Profile Box */}
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 text-xs space-y-1">
                <strong className="text-cyan-950 font-bold flex items-center gap-1.5 text-sm">
                  <Waves size={16} className="text-cyan-700" />
                  <span>พฤติกรรมอะคูสติกส์และคลื่นเสียงเคาะเฉพาะพันธุ์:</span>
                </strong>
                <p className="text-cyan-900 leading-relaxed">
                  {selectedVariety.audioSignatureNote}
                </p>
              </div>

              {/* Flesh and Rind Detail */}
              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <strong className="text-gray-900 block mb-0.5">ลักษณะเปลือกและลาย:</strong>
                  <p className="text-gray-600">{selectedVariety.rindCharacteristics}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <strong className="text-gray-900 block mb-0.5">สัมผัสเนื้อและรสชาติ:</strong>
                  <p className="text-gray-600">{selectedVariety.fleshTexture}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <strong className="text-gray-900 block mb-0.5">ตลาดและการนำไปใช้:</strong>
                  <p className="text-gray-600">{selectedVariety.recommendedUse}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleSimulateVariety(selectedVariety);
                  }}
                  className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Waves size={14} className="text-cyan-700" />
                  <span>ลองจำลองเสียงเคาะใน Simulator</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleChatAboutVariety(selectedVariety);
                  }}
                  className="rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageSquare size={14} />
                  <span>แชทปรึกษา AI เรื่องพันธุ์นี้</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
