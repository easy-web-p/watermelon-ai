import { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';

export function GeminiApiKeyModal({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
  onClearKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string | null;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
}) {
  const [inputKey, setInputKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputKey(currentKey || '');
      setShowPassword(false);
      setError(null);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError('กรุณากรอก API Key หรือกด "ลบคีย์" หากต้องการใช้โหมดฟรี');
      return;
    }
    if (!trimmed.startsWith('AIza')) {
      setError('API Key ของ Google AI Studio มักจะขึ้นต้นด้วย "AIza..." กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    setError(null);
    onSaveKey(trimmed);
  };

  const maskedKey = currentKey
    ? `${currentKey.slice(0, 6)}••••••••${currentKey.slice(-4)}`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-key-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-surface-lowest shadow-2xl overflow-hidden border border-outline-variant/30 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4 bg-surface-low">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="key" size={22} />
            </span>
            <div>
              <h2 id="gemini-key-title" className="text-title-md font-bold text-on-surface">
                ตั้งค่า Gemini API Key
              </h2>
              <p className="text-caption text-on-surface-variant">
                แชทถาม-ตอบได้ไม่จำกัดด้วย Gemini 2.5 Flash
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="flex size-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status Banner */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-semibold text-on-surface">สถานะการเชื่อมต่อ:</span>
              {currentKey ? (
                <Badge tone="primary" className="bg-secondary-container text-on-secondary-fixed-variant">
                  ✓ ตั้งค่าคีย์แล้ว (พร้อมใช้งาน)
                </Badge>
              ) : (
                <Badge tone="neutral">โหมดคลังความรู้ฟรี (7 หัวข้อ)</Badge>
              )}
            </div>
            {currentKey && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-caption font-mono text-outline">{maskedKey}</span>
                <button
                  type="button"
                  onClick={onClearKey}
                  className="cursor-pointer text-caption font-semibold text-error hover:underline inline-flex items-center gap-1"
                >
                  <Icon name="delete" size={14} />
                  ลบคีย์ออก
                </button>
              </div>
            )}
          </div>

          {/* Guide */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-body-sm space-y-2">
            <p className="font-bold text-primary flex items-center gap-1.5">
              <Icon name="help_outline" size={18} />
              วิธีขอรับ Gemini API Key ฟรี (30 วินาที):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant text-caption leading-relaxed pl-1">
              <li>
                เปิด{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Google AI Studio (aistudio.google.com)
                  <Icon name="open_in_new" size={12} />
                </a>
              </li>
              <li>ล็อกอินด้วยบัญชี Google ของคุณ แล้วคลิก <strong>Create API Key</strong></li>
              <li>คัดลอกคีย์ที่ได้มาวางในช่องด้านล่าง แล้วกด <strong>บันทึกคีย์</strong></li>
            </ol>
            <p className="text-[11px] text-outline pt-1">
              💡 ฟรี 100% ไม่มีค่าบริการสำหรับโหมดมาตรฐานของ Google AI Studio
            </p>
          </div>

          {/* Key Input */}
          <div className="space-y-1.5">
            <label htmlFor="gemini-key-input" className="text-label-md font-bold text-on-surface flex items-center justify-between">
              <span>Google Gemini API Key:</span>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-caption text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={14} />
                {showPassword ? 'ซ่อนคีย์' : 'แสดงคีย์'}
              </button>
            </label>
            <div className="relative">
              <input
                id="gemini-key-input"
                type={showPassword ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setError(null);
                }}
                placeholder="วางคีย์ AIzaSy... ที่นี่"
                className="w-full rounded-xl border border-outline bg-surface-lowest px-4 py-2.5 text-body-md text-on-surface font-mono placeholder:font-sans placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {error && <p role="alert" className="text-caption text-error pt-1">{error}</p>}
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 rounded-lg bg-surface-container-lowest p-3 text-caption text-outline border border-outline-variant/20">
            <Icon name="lock" size={16} className="text-secondary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>ปลอดภัย:</strong> คีย์ของคุณจะถูกจัดเก็บใน Browser LocalStorage บนเครื่องของคุณเท่านั้น จะไม่มีการส่งคีย์ไปเก็บที่เซิร์ฟเวอร์ของเรา และคำขอแชทจะส่งตรงไปยัง Google API
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-outline-variant/20 px-6 py-3.5 bg-surface-low">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-4 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-label-md font-bold text-on-primary shadow-cta hover:bg-primary-container transition-all active:scale-95"
          >
            <Icon name="save" size={16} />
            บันทึกและเปิดใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}
