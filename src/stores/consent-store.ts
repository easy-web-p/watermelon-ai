import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserConsentState } from "@/types/consent";

interface ConsentStore extends UserConsentState {
  acceptAllCookies: () => void;
  rejectOptionalCookies: () => void;
  updateConsent: (data: Partial<UserConsentState>) => void;
  resetConsent: () => void;
}

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      hasSelectedCookies: false,
      essentialCookies: true,
      analyticsCookies: false,
      allowTraining: false, // Default is STRICT OPT-IN per PDPA guidelines
      allowImageStorage: true,
      allowAudioStorage: true,
      allowResearch: false,
      privacyPolicyVersion: "2026.1-pdpa",
      consentedAt: null,
      withdrawnAt: null,

      acceptAllCookies: () =>
        set({
          hasSelectedCookies: true,
          analyticsCookies: true,
          consentedAt: new Date().toISOString(),
        }),

      rejectOptionalCookies: () =>
        set({
          hasSelectedCookies: true,
          analyticsCookies: false,
          consentedAt: new Date().toISOString(),
        }),

      updateConsent: (data) =>
        set((state) => ({
          ...state,
          ...data,
          consentedAt: new Date().toISOString(),
        })),

      resetConsent: () =>
        set({
          hasSelectedCookies: false,
          analyticsCookies: false,
          allowTraining: false,
          allowImageStorage: false,
          allowAudioStorage: false,
          allowResearch: false,
          withdrawnAt: new Date().toISOString(),
        }),
    }),
    {
      name: "watermelon-ai-consent",
    },
  ),
);
