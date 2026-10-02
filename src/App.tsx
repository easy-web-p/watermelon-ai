/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { SettingsView } from "@/components/settings/SettingsView";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { PromptsView } from "@/components/prompts/PromptsView";
import { FoldersView } from "@/components/folders/FoldersView";
import { KnowledgeView } from "@/components/knowledge/KnowledgeView";
import { HelpView } from "@/components/help/HelpView";
import { WatermelonLabView } from "@/components/lab/WatermelonLabView";
import { WatermelonSimulatorView } from "@/components/simulator/WatermelonSimulatorView";
import { WatermelonVarietiesView } from "@/components/varieties/WatermelonVarietiesView";
import { ForbiddenView } from "@/components/errors/ForbiddenView";
import { NotFoundView } from "@/components/errors/NotFoundView";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { canAccessRoute } from "@/lib/route-permissions";
import { AudioSamplePreset } from "@/types/chat";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname || "/";
    }
    return "/";
  });

  const { setCurrentConversation } = useChatStore();

  useEffect(() => {
    function handlePopState() {
      setCurrentRoute(window.location.pathname || "/");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleNavigate(route: string) {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", route);
    }
    setCurrentRoute(route);
  }

  // Handle prompt insertion
  function handleUsePrompt(promptText: string) {
    useChatStore.getState().setDraftText(promptText);
    handleNavigate("/chat");
  }

  function handleSendPresetToChat(preset: AudioSamplePreset) {
    useChatStore.getState().setMode("knock-analysis");
    useChatStore
      .getState()
      .setDraftText(
        `ช่วยวิเคราะห์เสียงเคาะตัวอย่าง: ${preset.title} (${preset.frequencyHz} Hz) ว่าแตงโมผลนี้สุกและหวานเพียงใด`
      );
    handleNavigate("/chat");
  }

  const { currentUser, isAuthenticated } = useAuthStore();

  // Enforce Route Guard (RBAC + Authentication)
  const access = canAccessRoute(currentUser.role, currentRoute, isAuthenticated);
  if (!access.allowed) {
    return (
      <div className="min-h-screen bg-[#FFFBEF]">
        <ForbiddenView onNavigate={handleNavigate} />
        <CookieBanner onNavigateSettings={() => handleNavigate("/settings")} />
      </div>
    );
  }

  // Match route
  let view = null;
  if (currentRoute === "/" || currentRoute === "") {
    view = <LandingPage onNavigate={handleNavigate} />;
  } else if (currentRoute.startsWith("/chat")) {
    const parts = currentRoute.split("/");
    const convId = parts.length > 2 && parts[2] ? parts[2] : undefined;
    view = (
      <ChatWorkspace
        initialConversationId={convId}
        onNavigate={handleNavigate}
        currentRoute={currentRoute}
      />
    );
  } else if (currentRoute === "/lab") {
    view = (
      <WatermelonLabView
        onNavigate={handleNavigate}
        onSendPresetToChat={handleSendPresetToChat}
      />
    );
  } else if (currentRoute === "/simulator") {
    view = <WatermelonSimulatorView onNavigate={handleNavigate} />;
  } else if (currentRoute === "/varieties") {
    view = <WatermelonVarietiesView onNavigate={handleNavigate} />;
  } else if (currentRoute === "/settings") {
    view = <SettingsView onNavigate={handleNavigate} />;
  } else if (currentRoute === "/admin") {
    view = <AdminDashboard onNavigate={handleNavigate} />;
  } else if (currentRoute === "/prompts") {
    view = (
      <PromptsView
        onNavigate={handleNavigate}
        onUsePrompt={handleUsePrompt}
      />
    );
  } else if (currentRoute === "/folders") {
    view = <FoldersView onNavigate={handleNavigate} />;
  } else if (currentRoute === "/knowledge") {
    view = <KnowledgeView onNavigate={handleNavigate} />;
  } else if (currentRoute === "/help") {
    view = <HelpView onNavigate={handleNavigate} />;
  } else {
    // 404 Not Found (Playful watermelon 404)
    view = <NotFoundView onNavigate={handleNavigate} />;
  }

  return (
    <div className="min-h-screen bg-[#FFFBEF]">
      <PwaInstallBanner />
      {view}
      <CookieBanner onNavigateSettings={() => handleNavigate("/settings")} />
      <OfflineIndicator />
    </div>
  );
}
