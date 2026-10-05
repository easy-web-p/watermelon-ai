import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiseaseResultCard } from './DiseaseResultCard';
import { RouterProvider } from '../../lib/router';
import { buildDetection, type ModelClass, type VisionPrediction } from '../../lib/diseaseModel';
import { MODEL_CLASSES } from '../../lib/diseaseModel';

/**
 * This card is the last thing between a model output and a farmer's spray
 * decision, so the thing worth testing is what it says when the verdict is
 * *not* a plain diagnosis.
 *
 * It used to switch on `status` with a two-way ternary: `diagnosed` got the
 * severity badges, `inconclusive` got "ยังสรุปไม่ได้", and everything else
 * fell through to "ไม่พบอาการโรคในภาพ". Engine v3 added `suspect` (one crop
 * clearly shows disease) and `unusable` (the photo is not of a readable leaf),
 * and both would have rendered as "no disease found" — the exact opposite of
 * what they mean. The card now reads `STATUS_PRESENTATION`, and these tests
 * pin that down for every status the model can produce.
 */

function prediction(winner: ModelClass, confidence: number, extra: Partial<VisionPrediction> = {}) {
  const others = MODEL_CLASSES.filter((c) => c !== winner);
  const share = (1 - confidence) / others.length;
  const scores = Object.fromEntries(
    MODEL_CLASSES.map((c) => [c, c === winner ? confidence : share]),
  ) as Record<ModelClass, number>;
  return { class_id: winner, confidence, scores, model_version: 'test@card', ...extra };
}

/** The card renders a `<Link>`, which needs a router above it. */
function show(result: Parameters<typeof DiseaseResultCard>[0]['result'], imageUrl?: string) {
  return render(
    <RouterProvider>
      <DiseaseResultCard result={result} imageUrl={imageUrl} />
    </RouterProvider>,
  );
}

const SUSPECT = buildDetection(
  prediction('Downy_Mildew', 0.86, {
    engine_version: '3.0.0',
    mode: 'balanced',
    abstain: false,
    aggregation: {
      source_region: 'q-bl',
      escalated_from_healthy: true,
      supporting_tiles: ['q-bl'],
      agrees_with_frame_runner_up: true,
      frame_class_id: 'Healthy',
      frame_confidence: 0.94,
      frame_runner_up: 'Downy_Mildew',
      regions_scored: 5,
    },
    regions: [
      {
        name: 'q-bl',
        box: [0, 0.45, 0.55, 1],
        class_id: 'Downy_Mildew',
        confidence: 0.86,
        tissue_fraction: 0.9,
      },
    ],
  }),
);

const UNUSABLE = buildDetection(
  prediction('Anthracnose', 0.97, {
    engine_version: '3.0.0',
    mode: 'balanced',
    abstain: true,
    quality: {
      verdict: 'unusable',
      usable: false,
      reasons: ['ไม่พบเนื้อใบในภาพ (เจอเพียง 2% ของเฟรม) ให้ถ่ายใกล้ขึ้นจนใบเต็มกรอบภาพ'],
      focus_score: 210,
      leaf_fraction: 0.02,
    },
  }),
);

describe('a crop-level finding', () => {
  it('is never shown as "no disease found"', () => {
    show(SUSPECT);
    expect(screen.queryByText('ไม่พบอาการโรคในภาพ')).toBeNull();
    expect(screen.getByText('พบจุดน่าสงสัย ต้องยืนยันด้วยตา')).toBeInTheDocument();
  });

  it('shows the disease severity, because the disease is just as severe if present', () => {
    show(SUSPECT);
    expect(screen.getByText(/ความรุนแรง:/)).toBeInTheDocument();
    expect(screen.getByText(`ระดับ ${SUSPECT.severity_level}/5`)).toBeInTheDocument();
  });

  it('carries the pre-harvest interval alongside the chemical advice', () => {
    show(SUSPECT);
    expect(screen.getByText('สารเคมีควบคุม')).toBeInTheDocument();
    expect(screen.getByText('ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI)')).toBeInTheDocument();
    expect(screen.getByText(SUSPECT.phi_note)).toBeInTheDocument();
  });

  it('marks the area of the photo the farmer should go and look at', () => {
    const { container } = show(SUSPECT, 'blob:leaf.jpg');
    const marker = container.querySelector('span[aria-hidden].absolute');
    expect(marker).not.toBeNull();
    // Matches `regions[0].box` = [0, 0.45, 0.55, 1].
    const { left, top, width, height } = (marker as HTMLElement).style;
    expect(parseFloat(left)).toBeCloseTo(0, 4);
    expect(parseFloat(top)).toBeCloseTo(45, 4);
    expect(parseFloat(width)).toBeCloseTo(55, 4);
    expect(parseFloat(height)).toBeCloseTo(55, 4);
  });
});

describe('an unreadable photo', () => {
  it('is never shown as "no disease found"', () => {
    show(UNUSABLE);
    expect(screen.queryByText('ไม่พบอาการโรคในภาพ')).toBeNull();
    expect(screen.getByText('ภาพนี้ใช้ตรวจไม่ได้')).toBeInTheDocument();
  });

  it('shows no confidence figure, because nothing was measured', () => {
    show(UNUSABLE);
    expect(screen.queryByText(/ความมั่นใจของโมเดล/)).toBeNull();
    expect(screen.queryByText(/ความมั่นใจ 97/)).toBeNull();
  });

  it('tells the farmer what to change about the photo', () => {
    show(UNUSABLE);
    expect(screen.getByText('ภาพนี้ตรวจไม่ได้')).toBeInTheDocument();
    expect(screen.getByText(/ให้ถ่ายใกล้ขึ้นจนใบเต็มกรอบภาพ/)).toBeInTheDocument();
  });

  it('offers no treatment advice at all', () => {
    show(UNUSABLE);
    expect(screen.queryByText('สารเคมีควบคุม')).toBeNull();
    expect(screen.queryByText('ชีวภัณฑ์ทางเลือก')).toBeNull();
  });
});

describe('the ordinary verdicts still render as they did', () => {
  it('a diagnosis shows the severity and the full plan', () => {
    show(buildDetection(prediction('Anthracnose', 0.95)));
    expect(screen.getByText(/ความรุนแรง:/)).toBeInTheDocument();
    expect(screen.getByText('สารเคมีควบคุม')).toBeInTheDocument();
    expect(screen.getByText('พบอาการเข้าลักษณะโรค')).toBeInTheDocument();
  });

  it('a healthy leaf says so, and keeps the false-negative warning', () => {
    const healthy = buildDetection(prediction('Healthy', 0.97));
    show(healthy);
    expect(screen.getByText('ไม่พบอาการโรคในภาพ')).toBeInTheDocument();
    expect(screen.queryByText('สารเคมีควบคุม')).toBeNull();
    expect(screen.getByText(/ไม่ได้แปลว่าไม่มีโรค/)).toBeInTheDocument();
  });

  it('an inconclusive result asks for a better photo instead of naming a disease', () => {
    show(buildDetection(prediction('Downy_Mildew', 0.4)));
    expect(screen.getByText('ยังสรุปไม่ได้')).toBeInTheDocument();
    expect(screen.queryByText('สารเคมีควบคุม')).toBeNull();
  });

  it('a v2 record with no engine fields renders without complaint', () => {
    // Rows written before engine v3 are read back by this card.
    show(buildDetection(prediction('Mosaic_Virus', 0.93)));
    expect(screen.getByText('พบอาการเข้าลักษณะโรค')).toBeInTheDocument();
    expect(screen.queryByText(/เครื่องยนต์/)).toBeNull();
    expect(screen.queryByText(/วัดจากสีภาพ/)).toBeNull();
  });
});

describe('the measured lesion area', () => {
  it('is shown as its own number, labelled as coming from the pixels', () => {
    show(
      buildDetection(
        prediction('Anthracnose', 0.95, {
          engine_version: '3.0.0',
          mode: 'deep',
          abstain: false,
          lesions: {
            measured: true,
            healthy_fraction: 0.69,
            chlorotic_fraction: 0.11,
            necrotic_fraction: 0.2,
            discolored_fraction: 0.31,
          },
        }),
      ),
    );
    expect(screen.getByText(/วัดจากสีภาพ: เนื้อใบเปลี่ยนสี 31%/)).toBeInTheDocument();
    expect(screen.getByText(/เครื่องยนต์ 3.0.0 \/ deep/)).toBeInTheDocument();
  });

  it('says when the confidence has not been calibrated', () => {
    show(
      buildDetection(
        prediction('Anthracnose', 0.95, {
          engine_version: '3.0.0',
          mode: 'balanced',
          abstain: false,
          calibration: { temperature: 1, fitted: false, note: 'raw' },
        }),
      ),
    );
    expect(screen.getByText(/คะแนนดิบ ยังไม่ปรับเทียบ/)).toBeInTheDocument();
  });
});
