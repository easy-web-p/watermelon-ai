import { AuthShell } from '../../components/layout/MarketingShell';
import { AuthAside } from './SignIn';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { Link } from '../../lib/router';

/** Password recovery must not enumerate accounts or pretend an SMS was sent. */
export function AccountRecovery() {
  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex flex-col gap-5">
        <Badge tone="primary"><Icon name="lock_reset" size={14} />กู้คืนบัญชี</Badge>
        <h1 className="text-headline-lg font-bold text-on-surface">ลืมรหัสผ่าน?</h1>
        <div role="status" className="rounded-lg border border-outline-variant/30 bg-surface-low p-5">
          <p className="text-body-lg font-semibold text-on-surface">การรีเซ็ตรหัสผ่านด้วย SMS หรืออีเมลยังไม่เปิดใช้งาน</p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            ระบบยังไม่มีบริการส่งรหัส OTP หรืออีเมลรีเซ็ตที่ยืนยันได้ จึงไม่ค้นหาหรือแสดงรายชื่อบัญชีจากเบอร์โทรศัพท์และอีเมลของผู้อื่น
          </p>
        </div>
        <p className="text-body-md text-on-surface-variant">
          หากเคยลงชื่อเข้าใช้ด้วย Google ให้กลับไปใช้บัญชี Google เดิม หากใช้รหัสผ่านอย่างเดียว โปรดติดต่อผู้ดูแลระบบเพื่อขอวิธียืนยันตัวตนที่ปลอดภัย
        </p>
        <p className="text-body-md font-semibold text-on-surface">เจ้าหน้าที่จะไม่ขอรหัส OTP หรือรหัสผ่านจากคุณ</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/signin" className="text-label-lg font-semibold text-primary hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    </AuthShell>
  );
}
