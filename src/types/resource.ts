/**
 * Master type contracts for Watermelon AI based on Master Specification
 */

/** Standardized UI state lifecycle for asynchronous data and views */
export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty'; suggestion?: string }
  | { status: 'offline'; cachedAt?: string }
  | {
      status: 'error';
      code: string;
      message: string;
      requestId?: string;
      retryable: boolean;
    };

/** Vision diagnosis verdict status */
export type DiseaseStatus =
  | 'diagnosed'
  | 'suspect'
  | 'healthy'
  | 'inconclusive'
  | 'unusable';

/** Structured Vision model result contract */
export interface DiseaseResult {
  id: string;
  status: DiseaseStatus;
  predictedClass:
    | 'Anthracnose'
    | 'Downy_Mildew'
    | 'Healthy'
    | 'Mosaic_Virus'
    | null;
  scores: Record<string, number>;
  scoreType: 'raw_softmax' | 'calibrated';
  confidence: number | null;
  quality: {
    accepted: boolean;
    reasons: string[];
  };
  supportedScope: 'watermelon_leaf';
  modelVersion: string;
  pipelineVersion: string;
  recommendationIds: string[];
  warnings: string[];
  createdAt: string;
  requestId: string;
}

/** Agricultural reference metadata and provenance tracking */
export interface ReferenceMetadata {
  id: string;
  version: string;
  sourceTitle: string;
  sourceUrl?: string;
  jurisdiction: 'TH';
  reviewedAt: string;
  reviewedBy: string;
  status: 'draft' | 'approved' | 'expired' | 'withdrawn';
}

/** 8-tier Role-Based Access Control (RBAC) */
export type UserRole =
  | 'guest'
  | 'farmer'
  | 'farm_manager'
  | 'agronomist'
  | 'support'
  | 'researcher'
  | 'admin'
  | 'super_admin';

/** Payment state machine */
export type PaymentState =
  | 'created'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'expired'
  | 'cancelled';
