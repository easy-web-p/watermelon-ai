export interface UserConsentState {
  hasSelectedCookies: boolean;
  essentialCookies: boolean;
  analyticsCookies: boolean;
  allowTraining: boolean;
  allowImageStorage: boolean;
  allowAudioStorage: boolean;
  allowResearch: boolean;
  privacyPolicyVersion: string;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

export interface TrainingCandidate {
  id: string;
  sourceType: "chat" | "audio" | "image" | "correction";
  sourceId: string;
  userConsentValid: boolean;
  anonymizationStatus: "pending" | "completed" | "flagged";
  qualityReviewStatus: "pending" | "approved" | "rejected";
  detectedClass: string;
  sweetnessBrix?: number;
  variety?: string;
  createdAt: string;
}

export interface ModelVersionInfo {
  versionId: string;
  name: string;
  version: string;
  taskType: "knock-acoustic-classifier" | "image-ripeness-detector" | "thai-watermelon-llm";
  datasetVersion: string;
  accuracy: number;
  f1Score: number;
  status: "active" | "training" | "candidate" | "deprecated";
  deployedAt: string;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  action: "login" | "analyze_audio" | "export_data" | "delete_chat" | "update_consent" | "model_deploy";
  resourceType: string;
  ipHash: string;
  result: "success" | "denied" | "failed";
  timestamp: string;
}
