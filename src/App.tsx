import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { RouterProvider, useRouter, useScrollReset } from './lib/router';
import { LogoMark } from './components/brand/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

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

/** Static routes. The dynamic `/status/:code` is matched separately. */
const ROUTES: Record<string, ComponentType> = {
  '/': Landing,
  '/chat': ChatAssistant,
  '/scanner': SweetnessScanner,
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

function Screen() {
  const { path } = useRouter();
  useScrollReset(path);

  const statusMatch = path.match(/^\/status\/(\d{3})$/);
  if (statusMatch) return <StatusPage code={statusMatch[1]} />;

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
