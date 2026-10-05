import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Segmented } from './Segmented';
import { Meter } from './Meter';

const MODES = [
  { value: 'consumer', label: 'โหมดผู้บริโภค' },
  { value: 'grower', label: 'โหมดเกษตรกร' },
] as const;

describe('Segmented', () => {
  it('marks only the selected option as the active tab', () => {
    render(<Segmented options={MODES} value="grower" onChange={() => {}} label="โหมด" />);

    expect(screen.getByRole('tab', { name: 'โหมดเกษตรกร' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'โหมดผู้บริโภค' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the chosen value on click', () => {
    const onChange = vi.fn();
    render(<Segmented options={MODES} value="grower" onChange={onChange} label="โหมด" />);

    screen.getByRole('tab', { name: 'โหมดผู้บริโภค' }).click();
    expect(onChange).toHaveBeenCalledWith('consumer');
  });

  it('labels the group for screen readers', () => {
    render(<Segmented options={MODES} value="grower" onChange={() => {}} label="โหมดการตอบ" />);
    expect(screen.getByRole('tablist', { name: 'โหมดการตอบ' })).toBeInTheDocument();
  });
});

describe('Meter', () => {
  it('exposes the value to assistive tech', () => {
    render(<Meter value={82} label="ความเสี่ยงระบาด" />);

    const meter = screen.getByRole('meter', { name: 'ความเสี่ยงระบาด' });
    expect(meter).toHaveAttribute('aria-valuenow', '82');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values instead of overflowing the track', () => {
    const { rerender } = render(<Meter value={160} label="เกิน" />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');

    rerender(<Meter value={-40} label="ติดลบ" />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
  });
});
