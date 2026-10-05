import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KnockResultCard } from './KnockResultCard';
import type { KnockAnalysis } from '../../lib/api';

/**
 * This card renders turns read back out of the database, not just fresh API
 * responses. The seeded `conv-1` analysis — and every record written before the
 * probability distribution was added — has no `probabilities`, so restoring
 * that conversation used to throw inside render and the error boundary
 * swallowed the entire thread.
 */

const COMPLETE: KnockAnalysis = {
  maturityClass: 'สุกพอดี (หวานฉ่ำ)',
  maturityGrade: 4,
  confidence: 0.94,
  qualityStatus: 'passed',
  detectedImpacts: 4,
  dominantFrequencyHz: 134,
  snrDb: 28,
  sweetnessEstimateBrix: 12.2,
  resonanceDecayRate: 54,
  probabilities: { unripe: 0.04, ripe: 0.92, overripe: 0.04 },
  recommendations: ['เสียงเคาะกังวาน ไม่ทึบอับ'],
};

/** Shape of the knockAnalysis stored in the seeded conv-1 message. */
const LEGACY_PARTIAL = {
  maturityClass: 'สุกพอดี (หวานฉ่ำ)',
  maturityGrade: 4,
  confidence: 0.94,
  qualityStatus: 'passed',
  detectedImpacts: 4,
  dominantFrequencyHz: 134,
  snrDb: 28,
  sweetnessEstimateBrix: 12.2,
  recommendations: ['เสียงเคาะกังวาน ไม่ทึบอับ'],
} as KnockAnalysis;

describe('KnockResultCard', () => {
  it('renders a complete analysis', () => {
    render(<KnockResultCard result={COMPLETE} />);

    expect(screen.getByText('สุกพอดี (หวานฉ่ำ)')).toBeInTheDocument();
    expect(screen.getByText('12.2')).toBeInTheDocument();
    expect(screen.getByText('134 Hz')).toBeInTheDocument();
    expect(screen.getByText('การกระจายความน่าจะเป็น')).toBeInTheDocument();
  });

  it('renders a stored record that has no probability distribution', () => {
    expect(() => render(<KnockResultCard result={LEGACY_PARTIAL} />)).not.toThrow();

    expect(screen.getByText('สุกพอดี (หวานฉ่ำ)')).toBeInTheDocument();
    // The section is dropped rather than rendered empty or with zero bars.
    expect(screen.queryByText('การกระจายความน่าจะเป็น')).not.toBeInTheDocument();
  });

  it('shows a dash instead of the text "undefined" for a missing metric', () => {
    render(<KnockResultCard result={LEGACY_PARTIAL} />);

    // `resonanceDecayRate` is absent from the stored record and used to be
    // interpolated straight into the tile.
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('survives an all-but-empty record without throwing', () => {
    const bare = { maturityClass: '', recommendations: [] } as unknown as KnockAnalysis;

    expect(() => render(<KnockResultCard result={bare} />)).not.toThrow();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
