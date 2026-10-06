import { useMemo, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { TankMixer } from '../components/domain/TankMixer';
import { cn } from '../lib/cn';
import { PRODUCTS, PRODUCT_KINDS, type ProductKind } from '../data/inputs';

type Filter = 'ทั้งหมด' | ProductKind;
const FILTERS: readonly Filter[] = ['ทั้งหมด', ...PRODUCT_KINDS];

const KIND_TONE: Record<ProductKind, string> = {
  ปุ๋ย: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  สารกำจัดโรคพืช: 'bg-primary-fixed text-on-primary-fixed-variant',
  สารกำจัดแมลง: 'bg-error-container text-on-error-container',
  ชีวภัณฑ์: 'bg-secondary-container text-on-secondary-fixed-variant',
  ธาตุอาหารเสริม: 'bg-surface-high text-on-surface-variant',
};

export function FertilizerDirectory() {
  const [filter, setFilter] = useState<Filter>('ทั้งหมด');
  const [query, setQuery] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      if (filter !== 'ทั้งหมด' && product.kind !== filter) return false;
      if (organicOnly && !product.organic) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.active.toLowerCase().includes(needle) ||
        product.targets.some((target) => target.toLowerCase().includes(needle))
      );
    });
  }, [filter, query, organicOnly]);

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="science" size={14} />
              คลังข้อมูลปัจจัยการผลิต {PRODUCTS.length} รายการ
            </Badge>
          }
          title="ปุ๋ย & สารอารักขาพืชสำหรับแตงโม"
          description="ค้นหาสารออกฤทธิ์ กลุ่มกลไกฤทธิ์ (FRAC/IRAC) อัตราผสม ระยะที่ควรใช้ และระยะปลอดภัยก่อนเก็บเกี่ยว พร้อมคำแนะนำการสลับกลุ่มยาเพื่อป้องกันการดื้อยา"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setMixerOpen(true)}>
              <Icon name="calculate" size={18} />
              เครื่องคำนวณอัตราผสม
            </Button>
          }
        />

        <Card className="mb-5 border-l-4 border-primary bg-melon-tint">
          <div className="flex items-start gap-3">
            <Icon name="shield" size={22} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h2 className="text-title-md font-bold text-on-surface">หลักการสลับกลุ่มยาป้องกันการดื้อยา</h2>
              <p className="mt-1 max-w-[75ch] text-body-md text-on-surface-variant">
                ห้ามใช้สารกลุ่มกลไกฤทธิ์เดียวกันติดต่อกันเกิน 2 ครั้ง ควรสลับกลุ่ม FRAC/IRAC ทุกรอบการพ่น
                และเว้นระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ตามที่ระบุอย่างเคร่งครัด เพื่อให้ผลผลิตผ่านมาตรฐาน GAP
                และตรวจสารตกค้างได้
              </p>
            </div>
          </div>
        </Card>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-lowest px-4 py-2.5 shadow-sm sm:max-w-sm">
            <Icon name="search" size={18} className="text-outline" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อการค้า สารออกฤทธิ์ หรือโรค/แมลงเป้าหมาย..."
              className="w-full min-w-0 border-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={cn(
                  'cursor-pointer rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                  filter === item
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-surface-lowest px-4 py-2.5 shadow-sm">
            <input
              type="checkbox"
              checked={organicOnly}
              onChange={(event) => setOrganicOnly(event.target.checked)}
              className="size-4 accent-secondary"
            />
            <span className="text-label-md font-semibold text-on-surface">เฉพาะชีวภัณฑ์/อินทรีย์</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <Card key={product.id} as="article" className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-title-md font-bold text-on-surface">{product.name}</h3>
                  <p className="mt-0.5 text-caption text-on-surface-variant">{product.active}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
                    KIND_TONE[product.kind],
                  )}
                >
                  {product.kind}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {product.group ? <Badge tone="outline">{product.group}</Badge> : null}
                {product.organic ? (
                  <Badge tone="secondary">
                    <Icon name="eco" size={12} />
                    ปลอดภัย ใช้ได้ถึงวันเก็บเกี่ยว
                  </Badge>
                ) : null}
                {product.rotate ? (
                  <Badge tone="primary">
                    <Icon name="sync" size={12} />
                    ต้องสลับกลุ่ม
                  </Badge>
                ) : null}
              </div>

              <dl className="flex flex-col gap-2 rounded-md bg-surface-low p-3 text-body-md">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-on-surface-variant">อัตราผสม</dt>
                  <dd className="text-right font-bold text-on-surface">{product.rate}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-on-surface-variant">ระยะที่ใช้</dt>
                  <dd className="text-right text-on-surface">{product.stage}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-on-surface-variant">PHI ก่อนเก็บเกี่ยว</dt>
                  <dd className={cn('text-right font-bold', product.phi > 0 ? 'text-primary' : 'text-secondary')}>
                    {product.phi > 0 ? `${product.phi} วัน` : 'ไม่ต้องเว้นระยะ'}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="mb-1.5 text-caption font-semibold tracking-wider text-outline uppercase">เป้าหมายการใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.targets.map((target) => (
                    <span
                      key={target}
                      className="rounded-full bg-surface-container px-2.5 py-1 text-caption text-on-surface-variant"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3">
                <span className="text-label-lg font-bold text-secondary">{product.price}</span>
                <Button variant="quiet" size="sm" onClick={() => setMixerOpen(true)}>
                  คำนวณปริมาณ
                  <Icon name="arrow_forward" size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <Icon name="science_off" size={40} className="text-outline" />
            <p className="text-title-md font-bold text-on-surface">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            <Button
              className="mt-2"
              onClick={() => {
                setQuery('');
                setFilter('ทั้งหมด');
                setOrganicOnly(false);
              }}
            >
              ล้างตัวกรองทั้งหมด
            </Button>
          </Card>
        ) : null}

        <Card className="mt-6">
          <CardHeader
            icon="sync_alt"
            iconTone="secondary"
            title="ตารางสลับกลุ่มยาแนะนำ (4 รอบการพ่น)"
            subtitle="ใช้หมุนเวียนเพื่อไม่ให้เชื้อราและแมลงสร้างความต้านทาน"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { round: 'รอบที่ 1', day: 'วันที่ 0', product: 'แอนทราโคล (FRAC M3)', tone: 'bg-surface-low' },
              { round: 'รอบที่ 2', day: 'วันที่ 7', product: 'อามิสตาร์ (FRAC 11)', tone: 'bg-melon-tint' },
              { round: 'รอบที่ 3', day: 'วันที่ 14', product: 'เมทาแลกซิล (FRAC 4)', tone: 'bg-surface-low' },
              { round: 'รอบที่ 4', day: 'วันที่ 21', product: 'ไตรโคเดอร์มา (ชีวภัณฑ์)', tone: 'bg-mint-mist' },
            ].map((item) => (
              <div key={item.round} className={cn('rounded-md p-4', item.tone)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label-lg font-bold text-on-surface">{item.round}</span>
                  <Badge tone="outline">{item.day}</Badge>
                </div>
                <p className="mt-2 text-body-md text-on-surface-variant">{item.product}</p>
              </div>
            ))}
          </div>
        </Card>
        <TankMixer open={mixerOpen} onClose={() => setMixerOpen(false)} />
      </PageContainer>
    </AppShell>
  );
}
