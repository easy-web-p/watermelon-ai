import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RouterProvider } from '../../lib/router';
import { FloatingHistoryBackButton } from './FloatingHistoryBackButton';

describe('FloatingHistoryBackButton', () => {
  beforeEach(() => {
    window.location.hash = '#/';
    sessionStorage.clear();
  });

  it('renders the circular back button on the screen', () => {
    render(
      <RouterProvider>
        <FloatingHistoryBackButton />
      </RouterProvider>,
    );

    const button = screen.getByRole('button', { name: 'ย้อนกลับ' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles the history menu when clicked and shows upward history', async () => {
    // Simulate navigation history in sessionStorage
    sessionStorage.setItem(
      'wm_navigation_history_v1',
      JSON.stringify(['/evaluation', '/diseases', '/market']),
    );

    render(
      <RouterProvider>
        <FloatingHistoryBackButton />
      </RouterProvider>,
    );

    const mainBtn = screen.getByRole('button', { name: 'ย้อนกลับ' });
    
    // Open menu
    fireEvent.click(mainBtn);
    expect(mainBtn).toHaveAttribute('aria-expanded', 'true');

    // Should display history items
    expect(screen.getByRole('menu', { name: 'ประวัติหน้าที่เคยเข้าชม' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า การวัดผลโมเดล AI' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า โรคแตงโมที่รองรับ' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า เช็กราคาตลาดแตงโม' })).toBeInTheDocument();

    // The most recent item (first in list) has the largest size (size-[52px])
    const mostRecentBtn = screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า การวัดผลโมเดล AI' });
    expect(mostRecentBtn.className).toContain('size-[52px]');

    // Older item has smaller size
    const olderBtn = screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า โรคแตงโมที่รองรับ' });
    expect(olderBtn.className).toContain('size-[44px]');
  });

  it('navigates to selected history item when clicked', () => {
    sessionStorage.setItem(
      'wm_navigation_history_v1',
      JSON.stringify(['/evaluation']),
    );

    render(
      <RouterProvider>
        <FloatingHistoryBackButton />
      </RouterProvider>,
    );

    const mainBtn = screen.getByRole('button', { name: 'ย้อนกลับ' });
    fireEvent.click(mainBtn);

    const evalItem = screen.getByRole('menuitem', { name: 'ย้อนกลับไปหน้า การวัดผลโมเดล AI' });
    fireEvent.click(evalItem);

    expect(window.location.hash).toBe('#/evaluation');
  });

  it('closes history menu when Escape key is pressed', () => {
    sessionStorage.setItem(
      'wm_navigation_history_v1',
      JSON.stringify(['/evaluation']),
    );

    render(
      <RouterProvider>
        <FloatingHistoryBackButton />
      </RouterProvider>,
    );

    const mainBtn = screen.getByRole('button', { name: 'ย้อนกลับ' });
    fireEvent.click(mainBtn);
    expect(mainBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mainBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
