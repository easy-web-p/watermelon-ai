import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { LogoMark } from './brand/Logo';
import { Icon } from './ui/Icon';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors so a bug in one screen shows a recoverable page
 * instead of a blank white app — which, in the field, is indistinguishable
 * from the phone having died.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface px-6 text-center">
        <LogoMark size={64} />

        <div>
          <h1 className="text-headline-md font-bold text-on-surface">เกิดข้อผิดพลาดที่ไม่คาดคิด</h1>
          <p className="mx-auto mt-2 max-w-md text-body-lg text-on-surface-variant">
            หน้านี้โหลดไม่สำเร็จ ข้อมูลแปลงและภาพถ่ายของคุณยังปลอดภัย ไม่สูญหาย
          </p>
        </div>

        <pre className="max-w-xl max-h-60 overflow-x-auto rounded-md bg-surface-low p-4 text-left text-caption text-on-surface-variant whitespace-pre-wrap">
          {import.meta.env.DEV ? (error.stack || error.message) : error.message}
        </pre>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'caches' in window) {
                void caches.keys().then((keys) => {
                  for (const key of keys) void caches.delete(key);
                });
              }
              window.location.reload();
            }}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-label-lg font-semibold text-on-primary shadow-cta transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="refresh" size={18} />
            ลองใหม่อีกครั้ง
          </button>
          <a
            href="#/"
            onClick={() => this.setState({ error: null })}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-primary/25 px-6 text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="home" size={18} />
            กลับไปหน้าแรก
          </a>
        </div>

        <p className="flex items-center gap-1.5 text-caption text-on-surface-variant">
          <Icon name="support_agent" size={14} className="text-secondary" />
          หากยังพบปัญหา ติดต่อ LINE: @WatermelonAI หรือโทร 02-123-4567
        </p>
      </div>
    );
  }
}
