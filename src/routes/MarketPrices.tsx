import { useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';

type PriceObservation = {
  id: string;
  market: string;
  grade: string;
  priceBahtKg: number;
  observedAt: string;
  source: string;
};

const STORAGE_KEY = 'watermelon-market-observations-v1';

function readObservations(): { rows: PriceObservation[]; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rows: [], error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((row) =>
      row && typeof row === 'object' &&
      typeof row.market === 'string' &&
      typeof row.grade === 'string' &&
      typeof row.source === 'string' &&
      typeof row.observedAt === 'string' &&
      typeof row.priceBahtKg === 'number' &&
      Number.isFinite(row.priceBahtKg)
    )) throw new Error('ข้อมูลราคาที่เคยบันทึกมีรูปแบบไม่ถูกต้อง');
    return { rows: parsed as PriceObservation[], error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : 'อ่านข้อมูลราคาที่บันทึกไว้ไม่ได้',
    };
  }
}

export function MarketPrices() {
  const [initial] = useState(readObservations);
  const [rows, setRows] = useState(initial.rows);
  const [error, setError] = useState<string | null>(initial.error);
  const [market, setMarket] = useState('');
  const [grade, setGrade] = useState('');
  const [priceText, setPriceText] = useState('');
  const [source, setSource] = useState('');
  const [observedAt, setObservedAt] = useState(new Date().toLocaleDateString('sv-SE'));

  const average = rows.length
    ? rows.reduce((total, row) => total + row.priceBahtKg, 0) / rows.length
    : null;

  function saveObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceBahtKg = Number(priceText);
    if (!market.trim() || !grade.trim() || !source.trim() || !observedAt ||
        !Number.isFinite(priceBahtKg) || priceBahtKg <= 0 || priceBahtKg > 1000) {
      setError('กรุณากรอกตลาด เกรด ราคา 0–1,000 บาท/กก. วันที่ และแหล่งที่มาของราคาจริงให้ครบ');
      return;
    }
    const next = [{
      id: crypto.randomUUID(),
      market: market.trim(),
      grade: grade.trim(),
      priceBahtKg,
      observedAt,
      source: source.trim(),
    }, ...rows];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setRows(next);
      setError(null);
      setMarket('');
      setGrade('');
      setPriceText('');
      setSource('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'บันทึกราคาในอุปกรณ์นี้ไม่สำเร็จ');
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={<Badge tone="outline">ข้อมูลที่ผู้ใช้บันทึกเอง</Badge>}
          title="บันทึกราคาแตงโม"
          description="ยังไม่มีแหล่งราคาตลาดสดที่เชื่อมต่อและตรวจสอบได้ หน้านี้จะแสดงเฉพาะราคาที่คุณกรอกพร้อมวันที่และแหล่งที่มา ไม่สร้างราคา แนวโน้ม หรือวันตัดผลผลิตเอง"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-title-lg font-bold text-on-surface">เพิ่มราคาที่ตรวจสอบแล้ว</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">ข้อมูลเก็บในเบราว์เซอร์ของอุปกรณ์นี้ ไม่ใช่ราคากลางหรือข้อมูลเรียลไทม์</p>
            <form onSubmit={saveObservation} className="mt-4 grid gap-3">
              <label className="text-label-md">ตลาดหรือผู้รับซื้อ
                <input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-3" value={market} onChange={(event) => setMarket(event.target.value)} maxLength={100} required />
              </label>
              <label className="text-label-md">เกรด/สายพันธุ์ที่ผู้ขายระบุ
                <input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-3" value={grade} onChange={(event) => setGrade(event.target.value)} maxLength={100} required />
              </label>
              <label className="text-label-md">ราคา (บาท/กก.)
                <input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-3" type="number" min="0.01" max="1000" step="0.01" value={priceText} onChange={(event) => setPriceText(event.target.value)} required />
              </label>
              <label className="text-label-md">วันที่ทราบราคา
                <input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-3" type="date" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required />
              </label>
              <label className="text-label-md">แหล่งที่มา เช่น ใบเสนอราคา/ชื่อผู้แจ้ง
                <input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-3" value={source} onChange={(event) => setSource(event.target.value)} maxLength={150} required />
              </label>
              {error ? <p role="alert" className="text-body-md text-error">{error}</p> : null}
              <Button variant="primary" size="md" type="submit"><Icon name="save" size={18} />บันทึกราคา</Button>
            </form>
          </Card>
          <Card>
            <h2 className="text-title-lg font-bold text-on-surface">ราคาที่คุณบันทึก</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {average === null ? 'ยังไม่มีข้อมูลราคา' : `เฉลี่ยจาก ${rows.length} รายการที่คุณกรอก: ${average.toFixed(2)} บาท/กก. (ไม่ใช่ราคาเฉลี่ยตลาด)`}
            </p>
            <div className="mt-4 overflow-x-auto">
              {rows.length ? (
                <table className="w-full text-left text-body-md">
                  <thead><tr><th className="p-2">วันที่</th><th className="p-2">ตลาด/เกรด</th><th className="p-2">บาท/กก.</th><th className="p-2">แหล่งที่มา</th></tr></thead>
                  <tbody>{rows.map((row) => (
                    <tr key={row.id} className="border-t border-outline-variant">
                      <td className="p-2">{row.observedAt}</td>
                      <td className="p-2">{row.market}<br />{row.grade}</td>
                      <td className="p-2">{row.priceBahtKg.toFixed(2)}</td>
                      <td className="p-2">{row.source}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <p className="text-body-md text-on-surface-variant">บันทึกราคาและแหล่งที่มาก่อน ระบบจึงจะแสดงผลเปรียบเทียบได้</p>}
            </div>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
