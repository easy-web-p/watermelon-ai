import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LineChart, type Series } from './LineChart';

/**
 * The chart does its own axis maths on whatever the market endpoint returned,
 * so the degenerate inputs are the interesting ones: no data at all, and a
 * price that did not move. Both produced a broken chart rather than a useful
 * one.
 */

const LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

function paths(container: HTMLElement) {
  return [...container.querySelectorAll('path')].map((node) => node.getAttribute('d') ?? '');
}

describe('LineChart', () => {
  it('plots a normal series', () => {
    const series: Series[] = [{ name: 'ราคาหน้าสวน', color: '#ba0035', points: [12, 14, 13, 15, 16, 15, 17] }];

    const { container } = render(<LineChart series={series} labels={LABELS} />);

    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    for (const d of drawn) expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('renders an empty state instead of throwing when there is no data', () => {
    // `Math.min()` of nothing is Infinity and the destructured lead series was
    // undefined, so reading `lead.color` took the whole route down.
    expect(() => render(<LineChart series={[]} labels={LABELS} />)).not.toThrow();

    const { container } = render(<LineChart series={[]} labels={LABELS} />);
    expect(container.textContent).toContain('ยังไม่มีข้อมูล');
  });

  it('ignores a series that carries no points', () => {
    const series: Series[] = [
      { name: 'ว่าง', color: '#006a3d', points: [] },
      { name: 'ราคาหน้าสวน', color: '#ba0035', points: [12, 13, 14, 13, 12, 13, 14] },
    ];

    const { container } = render(<LineChart series={series} labels={LABELS} />);

    for (const d of paths(container)) expect(d).not.toMatch(/NaN|Infinity/);
    expect(container.textContent).not.toContain('ยังไม่มีข้อมูล');
  });

  it('still draws a flat series, where every value is identical', () => {
    // A week at one price is ordinary. It made max === min, so the y scale
    // divided by zero and every coordinate came out NaN: an empty SVG box.
    const series: Series[] = [{ name: 'ราคาคงที่', color: '#ba0035', points: [12, 12, 12, 12, 12, 12, 12] }];

    const { container } = render(<LineChart series={series} labels={LABELS} />);

    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    for (const d of drawn) expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('tolerates a non-finite value inside the series', () => {
    const series: Series[] = [
      { name: 'ราคา', color: '#ba0035', points: [12, Number.NaN, 14, 13, 12, 13, 14] },
    ];

    const { container } = render(<LineChart series={series} labels={LABELS} />);

    // The axis range is computed from the finite values only.
    for (const d of paths(container)) expect(d).not.toMatch(/Infinity/);
  });

  it('does not collide keys when a label repeats', () => {
    const repeated = ['ม.ค.', 'ก.พ.', 'ม.ค.', 'ก.พ.', 'ม.ค.', 'ก.พ.', 'ม.ค.'];
    const series: Series[] = [{ name: 'ราคา', color: '#ba0035', points: [1, 2, 3, 4, 5, 6, 7] }];

    const { container } = render(<LineChart series={series} labels={repeated} />);

    // Three label positions are rendered (index 0, 3, 6); duplicate React keys
    // would have dropped one of them.
    expect(container.querySelectorAll('text').length).toBeGreaterThanOrEqual(3);
  });
});
