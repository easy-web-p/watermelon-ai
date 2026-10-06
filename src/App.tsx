import { lazy, Suspense, useEffect } from 'react';
import type { ComponentType } from 'react';
import { RouterProvider, useRouter, useScrollReset } from './lib/router';
import { LogoMark } from './components/brand/Logo';
import { Icon } from './components/ui/Icon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useAuth } from './store/auth';

/**
 * Every screen is code-split: farmers often open this on mobile data in the
 * field, so only the route they asked for gets downloaded.
 */
const Landing = lazy(() => import('./routes/Landing').then((m) => ({ default: m.Landing })));
const ChatAssistant = lazy(() => import('./routes/ChatAssistant').then((m) => ({ default: m.ChatAssistant })));
const SweetnessScanner = lazy(() => import('./routes/SweetnessScanner').then((m) => ({ default: m.SweetnessScanner })));
const CultivationGuide = lazy(() => import('./routes/CultivationGuide').then((m) => ({ default: m.CultivationGuide })));
const MarketPrices = lazy(() => import('./routes/MarketPrices').then((m) => ({ default: m.MarketPrices })));
const FertilizerDirectory = lazy(() =>
  import('./routes/FertilizerDirectory').then((m) => ({ default: m.FertilizerDirectory })),
);
const FarmPlots = lazy(() => import('./routes/FarmPlots').then((m) => ({ default: m.FarmPlots })));
const SupportedDiseases = lazy(() =>
  import('./routes/SupportedDiseases').then((m) => ({ default: m.SupportedDiseases })),
);
const Pricing = lazy(() => import('./routes/Pricing').then((m) => ({ default: m.Pricing })));
const Checkout = lazy(() => import('./routes/Checkout').then((m) => ({ default: m.Checkout })));
const PaymentSuccess = lazy(() => import('./routes/PaymentSuccess').then((m) => ({ default: m.PaymentSuccess })));
const Billing = lazy(() => import('./routes/Billing').then((m) => ({ default: m.Billing })));
const AccountSettings = lazy(() => import('./routes/AccountSettings').then((m) => ({ default: m.AccountSettings })));
const Security = lazy(() => import('./routes/Security').then((m) => ({ default: m.Security })));
const LineAlerts = lazy(() => import('./routes/LineAlerts').then((m) => ({ default: m.LineAlerts })));
const About = lazy(() => import('./routes/About').then((m) => ({ default: m.About })));
const Research = lazy(() => import('./routes/Research').then((m) => ({ default: m.Research })));
const DataDispute = lazy(() => import('./routes/DataDispute').then((m) => ({ default: m.DataDispute })));
const Support = lazy(() => import('./routes/Support').then((m) => ({ default: m.Support })));
const PrivacyPolicy = lazy(() => import('./routes/Legal').then((m) => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./routes/Legal').then((m) => ({ default: m.TermsOfService })));
const StatusPage = lazy(() => import('./routes/StatusPage').then((m) => ({ default: m.StatusPage })));
const SignIn = lazy(() => import('./routes/auth/SignIn').then((m) => ({ default: m.SignIn })));
const Register = lazy(() => import('./routes/auth/Register').then((m) => ({ default: m.Register })));
const Otp = lazy(() => import('./routes/auth/Otp').then((m) => ({ default: m.Otp })));
const AccountRecovery = lazy(() =>
  import('./routes/auth/AccountRecovery').then((m) => ({ default: m.AccountRecovery })),
);
const Recipes = lazy(() => import('./routes/Recipes').then((m) => ({ default: m.Recipes })));
const ApiDocs = lazy(() => import('./routes/ApiDocs').then((m) => ({ default: m.ApiDocs })));
const DiseaseScan = lazy(() => import('./routes/DiseaseScan').then((m) => ({ default: m.DiseaseScan })));
const PrivacyRequests = lazy(() =>
  import('./routes/PrivacyRequests').then((m) => ({ default: m.PrivacyRequests })),
);
const AiEvaluation = lazy(() =>
  import('./routes/AiEvaluation').then((m) => ({ default: m.AiEvaluation })),
);

const ScannerBlocked = () => <StatusPage code="403" />;

/** Static routes. The dynamic `/status/:code` is matched separately. */
const ROUTES: Record<string, ComponentType> = {
  '/': Landing,
  '/chat': ChatAssistant,
  '/scanner': ScannerBlocked,
  '/cultivation': CultivationGuide,
  '/market': MarketPrices,
  '/fertilizer': FertilizerDirectory,
  '/recipes': Recipes,
  '/plots': FarmPlots,
  '/diseases': SupportedDiseases,
  '/disease-scan': DiseaseScan,
  '/pricing': Pricing,
  '/checkout': Checkout,
  '/payment-success': PaymentSuccess,
  '/billing': Billing,
  '/settings': AccountSettings,
  '/security': Security,
  '/alerts': LineAlerts,
  '/about': About,
  '/research': Research,
  '/evaluation': AiEvaluation,
  '/ai-metrics': AiEvaluation,
  '/api-docs': ApiDocs,
  '/data-dispute': DataDispute,
  '/support': Support,
  '/privacy': PrivacyPolicy,
  '/privacy/requests': PrivacyRequests,
  '/terms': TermsOfService,
  '/signin': SignIn,
  '/login': SignIn,
  '/register': Register,
  '/otp': Otp,
  '/recover': AccountRecovery,
  '/gmail-recover': AccountRecovery,
  '/email-recover': AccountRecovery,
};

function RouteFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface" role="status">
      <LogoMark size={56} className="animate-pulse" />
      <p className="text-body-md text-on-surface-variant">กำลังโหลด...</p>
    </div>
  );
}

/**
 * Routes accessible without signing in.
 * All other routes require an authenticated user.
 */
const PUBLIC_ROUTES = new Set([
  '/',
  '/evaluation',
  '/ai-metrics',
  '/research',
  '/signin',
  '/login',
  '/register',
  '/otp',
  '/recover',
  '/gmail-recover',
  '/email-recover',
  '/privacy',
  '/terms',
]);

function AuthGateRequired({ path }: { path: string }) {
  const { navigate } = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  }

  const redirectUrl = `/signin?redirect=${encodeURIComponent(path + (typeof window !== 'undefined' ? window.location.search || '' : ''))}`;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12 text-center"
      role="alert"
    >
      <div className="relative mb-6">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
          <Icon name="lock" size={40} />
        </div>
        <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-surface-lowest text-lg shadow-sm">
          🍉
        </span>
      </div>
      <h1 className="text-headline-sm font-bold text-on-surface sm:text-headline-md">
        กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน
      </h1>
      <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
        ฟังก์ชันและข้อมูลในระบบ Watermelon AI สงวนสิทธิ์สำหรับสมาชิก กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนเข้าถึงหน้านี้
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(redirectUrl)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-lg font-semibold text-on-primary shadow-sm transition-transform active:scale-95"
        >
          <Icon name="login" size={18} />
          เข้าสู่ระบบ / ลงทะเบียน
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-lowest px-6 py-2.5 text-label-lg font-semibold text-on-surface transition-all hover:bg-surface-container active:scale-95"
        >
          <Icon name="arrow_back" size={18} />
          กลับสู่หน้าแรก
        </button>
      </div>
    </div>
  );
}

function Screen() {
  const { path, navigate } = useRouter();
  const user = useAuth((state) => state.user);
  const toast = useToast();
  useScrollReset(path);

  const statusMatch = path.match(/^\/status\/(\d{3})$/);
  if (statusMatch) return <StatusPage code={statusMatch[1]} />;

  const isPublic = PUBLIC_ROUTES.has(path);

  useEffect(() => {
    if (!user && !isPublic) {
      toast.info('กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน');
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';
      navigate(`/signin?redirect=${encodeURIComponent(path + search)}`, { replace: true });
    }
  }, [user, isPublic, path, navigate, toast]);

  if (!user && !isPublic) {
    return <AuthGateRequired path={path} />;
  }

  if (path === '/chat' || path.startsWith('/chat/')) return <ChatAssistant />;

  const Route = ROUTES[path];
  if (Route) return <Route />;

  return <StatusPage code="404" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider>
          <Suspense fallback={<RouteFallback />}>
            <Screen />
          </Suspense>
        </RouterProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
