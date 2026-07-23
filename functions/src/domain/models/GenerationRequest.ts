/**
 * [LAYER: DOMAIN]
 * Purpose: Pure business logic models for generation
 * What belongs here: Generation status, timestamps, business rules
 * What to avoid: I/O, external imports
 * Principle: Domain-agnostic, testable with zero mocks
 */

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationRequest {
  id: string;
  prompt: string;
  modelId: string;
  userId: string;
  status: GenerationStatus;
  imageUrl?: string;
  error?: string;

  // Timestamps (milliseconds since epoch)
  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  // Time estimation properties
  estimatedDurationSeconds?: number;
  hasProgressEstimate: boolean;
}

export interface GenerationProgress {
  percentage: number;
  currentStage: string;
  totalStages?: number;
}

export class GenerationRequestFactory {
  /**
   * Creates a new generation request with required fields
   */
  static create(props: Omit<GenerationRequest, 'status' | 'createdAt'>): GenerationRequest {
    return {
      id: props.id,
      status: 'pending',
      createdAt: Date.now(),
      ...props
    };
  }

  /**
   * Updates status with timestamp if appropriate
   */
  static updateWithStatus(
    request: GenerationRequest,
    newStatus: GenerationStatus
  ): GenerationRequest {
    const updates: Partial<GenerationRequest> = {
      status: newStatus,
      createdAt: request.createdAt
    };

    if (newStatus === 'processing' && !request.startedAt) {
      updates.startedAt = Date.now();
    }

    if (newStatus === 'completed' && !request.completedAt) {
      updates.completedAt = Date.now();
    }

    return { ...request, ...updates };
  }

  /**
   * Sets an estimated duration for the generation
   */
  static withEstimatedDuration(
    request: GenerationRequest,
    estimatedSeconds: number
  ): GenerationRequest {
    return {
      ...request,
      estimatedDurationSeconds: estimatedSeconds,
      hasProgressEstimate: true
    };
  }
}