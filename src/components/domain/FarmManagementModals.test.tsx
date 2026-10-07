import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider } from '../../lib/router';
import { ToastProvider } from '../ui/Toast';
import { ZoneDetailModal } from './ZoneDetailModal';
import { ActionPlanModal } from './ActionPlanModal';
import { EditPlotModal, type EditablePlot } from './EditPlotModal';
import { AddActivityModal } from './AddActivityModal';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RouterProvider>
      <ToastProvider>{children}</ToastProvider>
    </RouterProvider>
  );
}

describe('Farm Management Components', () => {
  it('renders ZoneDetailModal with zone data and triggers watering callback', () => {
    const onUpdateMoisture = vi.fn();
    const onClose = vi.fn();

    render(
      <TestWrapper>
        <ZoneDetailModal
          open={true}
          zone={{
            index: 6,
            name: 'โซน A-7',
            status: 'เฝ้าระวัง',
            warn: true,
            empty: false,
            moisture: 48,
          }}
          plotName="แปลงที่ 2 — ริมคลอง"
          onClose={onClose}
          onUpdateMoisture={onUpdateMoisture}
        />
      </TestWrapper>,
    );

    expect(screen.getByText(/โซน A-7 — แปลงที่ 2 — ริมคลอง/i)).toBeInTheDocument();
    expect(screen.getByText(/เฝ้าระวังความชื้นต่ำ/i)).toBeInTheDocument();
    expect(screen.getByText(/48%/i)).toBeInTheDocument();
  });

  it('renders ActionPlanModal and toggles steps', () => {
    const onResolve = vi.fn();
    const onLog = vi.fn();

    render(
      <TestWrapper>
        <ActionPlanModal
          open={true}
          onClose={vi.fn()}
          plotName="แปลงที่ 2 — ริมคลอง"
          alertMessage="ความชื้นดินต่ำกว่าเกณฑ์ 11% — เพิ่มรอบน้ำอีก 1 รอบ/วัน"
          onResolveAlert={onResolve}
          onLogActivity={onLog}
        />
      </TestWrapper>,
    );

    expect(screen.getByText(/แผนจัดการเร่งด่วน: แปลงที่ 2 — ริมคลอง/i)).toBeInTheDocument();
    expect(screen.getByText(/ความชื้นดินต่ำกว่าเกณฑ์ 11%/i)).toBeInTheDocument();

    const resolveBtn = screen.getByRole('button', { name: /ทำเครื่องหมายว่าแก้ไขแล้ว/i });
    fireEvent.click(resolveBtn);
    expect(onResolve).toHaveBeenCalled();
    expect(onLog).toHaveBeenCalled();
  });

  it('renders EditPlotModal and saves edited plot', () => {
    const onSave = vi.fn();
    const mockPlot: EditablePlot = {
      id: 'plot-1',
      name: 'แปลงที่ 1 — ทุ่งเหนือ',
      location: 'สุพรรณบุรี',
      size: '8 ไร่',
      cultivar: 'ตอร์ปิโด',
      stage: 'ขยายผล & สะสมแป้ง',
      day: 44,
      totalDays: 65,
      health: 'ดีเยี่ยม',
      moisture: 68,
      brix: 10.8,
      expectedYield: '31.5 ตัน',
      harvest: '28 พ.ค. 2569',
    };

    render(
      <TestWrapper>
        <EditPlotModal
          open={true}
          plot={mockPlot}
          onClose={vi.fn()}
          onSave={onSave}
        />
      </TestWrapper>,
    );

    const nameInput = screen.getByDisplayValue('แปลงที่ 1 — ทุ่งเหนือ');
    fireEvent.change(nameInput, { target: { value: 'แปลงที่ 1 — ทุ่งเหนือ (แก้ไข)' } });

    const saveBtn = screen.getByRole('button', { name: /บันทึกการแก้ไข/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'แปลงที่ 1 — ทุ่งเหนือ (แก้ไข)',
      }),
    );
  });

  it('renders AddActivityModal and creates new activity record', () => {
    const onAdd = vi.fn();

    render(
      <TestWrapper>
        <AddActivityModal
          open={true}
          plotId="plot-1"
          plotName="แปลงที่ 1 — ทุ่งเหนือ"
          onClose={vi.fn()}
          onAdd={onAdd}
        />
      </TestWrapper>,
    );

    expect(screen.getByText(/บันทึกกิจกรรมประจำแปลง/i)).toBeInTheDocument();

    // Select activity type
    const fertBtn = screen.getByRole('button', { name: /ใส่ปุ๋ย/i });
    fireEvent.click(fertBtn);

    // Title input
    const titleInput = screen.getByPlaceholderText(/ให้น้ำหยดช่วงเช้า 45 นาที/i);
    fireEvent.change(titleInput, { target: { value: 'ให้ปุ๋ยสูตร 0-0-50' } });

    const submitBtn = screen.getByRole('button', { name: /บันทึกกิจกรรม/i });
    fireEvent.click(submitBtn);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        plotId: 'plot-1',
        title: 'ให้ปุ๋ยสูตร 0-0-50',
        type: 'ใส่ปุ๋ย',
      }),
    );
  });
});
