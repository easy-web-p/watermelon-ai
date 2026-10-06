import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider } from '../lib/router';
import { ToastProvider } from '../components/ui/Toast';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../store/auth';

describe('Authentication Route Guard', () => {
  beforeEach(() => {
    useAuth.setState({ user: null, token: null, error: null, status: 'idle' });
  });

  it('blocks unauthenticated access inside AppShell and displays login prompt', () => {
    window.location.hash = '#/cultivation';

    render(
      <ToastProvider>
        <RouterProvider>
          <AppShell>
            <div data-testid="protected-content">Secret Farm Data</div>
          </AppShell>
        </RouterProvider>
      </ToastProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน' }),
    ).toBeInTheDocument();
    expect(screen.getByText('เข้าสู่ระบบ / ลงทะเบียน')).toBeInTheDocument();
    expect(screen.getByText('กลับสู่หน้าแรก')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('allows access inside AppShell when user is authenticated', async () => {
    window.location.hash = '#/cultivation';
    useAuth.setState({
      user: {
        id: 'usr-123',
        name: 'นายสมชาย เกษตรกร',
        phone: '0812345678',
        role: 'user',
        organization: 'สวนแตงโมสมชาย',
      },
      token: 'jwt-token-123',
    });

    render(
      <ToastProvider>
        <RouterProvider>
          <AppShell>
            <div data-testid="protected-content">Secret Farm Data</div>
          </AppShell>
        </RouterProvider>
      </ToastProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน' })).not.toBeInTheDocument();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Farm Data')).toBeInTheDocument();
  });
});
