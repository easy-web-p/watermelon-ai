import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisionCompareCard } from './VisionCompareCard';

describe('VisionCompareCard', () => {
  it('does not present a class or confidence as a finding when the engine abstains', () => {
    render(<VisionCompareCard compareResult={{
      success: true,
      engine: 'wide9',
      disclaimer: 'ข้อสังเกตเท่านั้น',
      prediction: { class_id: 'powdery_mildew', confidence: 0.99, abstain: true },
    }} />);

    expect(screen.getByText('ยังไม่สามารถอ่านภาพนี้ได้')).toBeInTheDocument();
    expect(screen.getByText('ไม่มีคะแนนที่ใช้สรุปได้')).toBeInTheDocument();
    expect(screen.queryByText('99%')).not.toBeInTheDocument();
    expect(screen.queryByText('powdery_mildew')).not.toBeInTheDocument();
  });

  it('labels Claude confidence as a self-assessment and shows its real summary field', () => {
    render(<VisionCompareCard compareResult={{
      success: true,
      engine: 'claude',
      disclaimer: 'ข้อสังเกตเท่านั้น',
      prediction: {
        class_id: 'unknown',
        confidence: 0.8,
        summary_th: 'เห็นจุดบนใบ แต่ยังยืนยันโรคไม่ได้',
        observations: ['แผลสีเหลือง'],
      },
    }} />);

    expect(screen.getByText('เห็นจุดบนใบ แต่ยังยืนยันโรคไม่ได้')).toBeInTheDocument();
    expect(screen.getByText('แผลสีเหลือง')).toBeInTheDocument();
    expect(screen.getByText(/คะแนนประเมินตนเองของโมเดล/)).toBeInTheDocument();
    expect(screen.queryByText('unknown')).not.toBeInTheDocument();
  });

  it('does not claim Wide-9 is calibrated because a checkpoint has a temperature', () => {
    render(<VisionCompareCard compareResult={{
      success: true,
      engine: 'wide9',
      disclaimer: 'ข้อสังเกตเท่านั้น',
      prediction: { class_id: 'healthy', confidence: 0.7, calibration: { fitted: true } },
    }} />);

    expect(screen.getByText('ยังไม่ปรับเทียบ')).toBeInTheDocument();
    expect(screen.getByText(/คะแนนโมเดลยังไม่ปรับเทียบ/)).toBeInTheDocument();
    expect(screen.queryByText('ปรับเทียบแล้ว')).not.toBeInTheDocument();
  });
});
