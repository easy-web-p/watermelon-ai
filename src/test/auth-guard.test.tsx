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

  it('allows unauthenticated access inside AppShell as guest without login gate', () => {
    window.location.hash = '#/cultivation';

    render(
      <ToastProvider>
        <RouterProvider>
          <AppShell>
            <div data-testid="protected-content">Farm Data</div>
          </AppShell>
        </RouterProvider>
      </ToastProvider>,
    );

    expect(
      screen.queryByRole('heading', { name: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน' }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Farm Data')).toBeInTheDocument();
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
            <div data-testid="protected-content">Farm Data</div>
          </AppShell>
        </RouterProvider>
      </ToastProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน' })).not.toBeInTheDocument();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Farm Data')).toBeInTheDocument();
  });
});
