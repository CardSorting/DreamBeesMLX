/**
 * [LAYER: CORE]
 * Coordinates domain logic between UI and infrastructure adapters.
 */

import { GenerationDetail } from '../domain/models/GenerationDetail';
import { GenerationRepository, PermissionError } from '../infrastructure/GenerationRepository';
import { formatParameters } from '../domain/services/GenerationMetadataFormatter';

export class GenerationOrchestrator {
  constructor(private repository: GenerationRepository) {}

  /**
   * Main entry point: fetches full generation details for display.
   */
  async fetchFullGeneration(generationId: string): Promise<GenerationDetail> {
    try {
      const raw = await this.repository.getById(generationId);
      
      // Enrich raw data with formatting logic
      const enriched = this.enrichWithMetadata(raw);
      
      return enriched;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Could not load picture: ${generationId}`);
    }
  }

  /**
   * Fetches N most recent generations for the user.
   */
  async fetchRecentGenerations(limit: number = 20): Promise<GenerationDetail[]> {
    try {
      const rawGenerations = await this.repository.getAllGenerations();
      
      // Sort by createdAt (newest first)
      const sorted = [...rawGenerations].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      // Limit results
      return sorted.slice(0, limit);
    } catch (error) {
      throw new Error('Failed to load recent generations');
    }
  }

  /**
   * Formats raw generation data into enriched domain model.
   * Applies formatting services from domain layer.
   */
  private enrichWithMetadata(raw: GenerationDetail & { firestoreImageId?: string }): GenerationDetail {
    const params = raw.parameters || {};
    const enriched = {
      id: raw.id,
      userId: raw.userId,
      createdAt: raw.createdAt || Date.now(),
      imageUrl: raw.imageUrl,
      previewUrl: raw.previewUrl,
      prompt: raw.prompt,
      negativePrompt: raw.negativePrompt,
      modelId: raw.modelId,
      modelType: raw.modelType,
      seed: raw.seed,
      parameters: {
        size: params.size,
        steps: params.steps,
        guidanceScale: params.guidanceScale,
        quality: params.quality,
        style: params.style,
        format: params.format,
      },
      generationTime: raw.generationTime,
      revision: raw.revision || 1,
    } as GenerationDetail & { firestoreImageId?: string };
    if (raw.firestoreImageId) enriched.firestoreImageId = raw.firestoreImageId;
    return enriched;
  }
}