/** Market telemetry for the daily price screen. Figures are in THB per kg. */

export type MarketRow = {
  market: string;
  org: string;
  province: string;
  gradeA: string;
  gradeB: string;
  gradeC: string;
  trend: { value: string; direction: 'up' | 'down' | 'flat' };
  demand: string;
};

export const MARKET_ROWS: readonly MarketRow[] = [
  {
    market: 'ตลาดไท',
    org: 'โซนผลไม้แตงโม แผง 4–12',
    province: 'คลองหลวง, ปทุมธานี',
    gradeA: '22.00 – 24.50',
    gradeB: '17.50 – 19.00',
    gradeC: '11.00 – 13.00',
    trend: { value: '+1.00 ฿', direction: 'up' },
    demand: 'รับซื้อไม่อั้น',
  },
  {
    market: 'ตลาดสี่มุมเมือง',
    org: 'อาคารผลไม้ฤดูกาล ล็อก 2',
    province: 'รังสิต, ปทุมธานี',
    gradeA: '21.50 – 24.00',
    gradeB: '17.00 – 18.50',
    gradeC: '11.50 – 12.50',
    trend: { value: '+0.50 ฿', direction: 'up' },
    demand: 'ความต้องการสูง',
  },
  {
    market: 'ตลาดศรีเมือง',
    org: 'ศูนย์กระจายสินค้าแตงโมภาคตะวันตก',
    province: 'เมืองราชบุรี, ราชบุรี',
    gradeA: '20.50 – 22.50',
    gradeB: '16.50 – 17.50',
    gradeC: '10.00 – 11.50',
    trend: { value: 'ทรงตัว', direction: 'flat' },
    demand: 'ซื้อขายปกติ',
  },
  {
    market: 'ตลาดกลางผักและผลไม้ขอนแก่น',
    org: 'จุดรวบรวมสินค้าแตงโมอีสานตอนกลาง',
    province: 'เมืองขอนแก่น, ขอนแก่น',
    gradeA: '22.50 – 25.00',
    gradeB: '18.00 – 19.50',
    gradeC: '12.00 – 13.50',
    trend: { value: '+1.50 ฿', direction: 'up' },
    demand: 'แย่งซื้อหน้าร้าน',
  },
  {
    market: 'สหกรณ์การเกษตรแตงโมยโสธร',
    org: 'ราคาประมูลหน้าลานสหกรณ์',
    province: 'มหาชนะชัย, ยโสธร',
    gradeA: '19.00 – 21.00',
    gradeB: '15.00 – 16.50',
    gradeC: '9.50 – 10.50',
    trend: { value: 'ทรงตัว', direction: 'flat' },
    demand: 'ประมูลรอบบ่าย 14:00',
  },
] as const;

export type PriceSeries = { name: string; color: string; points: readonly number[] };

/** 15-day wholesale averages, THB/kg, oldest first. */
export const PRICE_SERIES: readonly PriceSeries[] = [
  {
    name: 'ชอนญ่า พลัส',
    color: '#ba0035',
    points: [18.2, 18.0, 18.6, 19.1, 19.4, 20.2, 20.8, 21.4, 22.0, 22.6, 23.1, 23.8, 24.4, 25.0, 25.5],
  },
  {
    name: 'กินรี 202',
    color: '#1b6b44',
    points: [15.8, 15.6, 16.0, 16.3, 16.5, 16.9, 17.2, 17.4, 17.7, 18.0, 18.2, 18.4, 18.7, 18.9, 19.0],
  },
  {
    name: 'ตอร์ปิโด (เกรด A)',
    color: '#906f70',
    points: [14.1, 14.0, 14.4, 14.6, 14.9, 15.2, 15.4, 15.5, 15.9, 16.2, 16.4, 16.6, 16.9, 17.1, 17.3],
  },
] as const;

export const PRICE_DAYS = [
  '1 พ.ค.',
  '2 พ.ค.',
  '3 พ.ค.',
  '4 พ.ค.',
  '5 พ.ค.',
  '6 พ.ค.',
  '7 พ.ค.',
  '8 พ.ค.',
  '9 พ.ค.',
  '10 พ.ค.',
  '11 พ.ค.',
  '12 พ.ค.',
  '13 พ.ค.',
  '14 พ.ค.',
  '15 พ.ค.',
] as const;
