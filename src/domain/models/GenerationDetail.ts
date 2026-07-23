/**
 * [LAYER: DOMAIN]
 * Pure business data contracts for generation details.
 */

export interface GenerationDetail {
  // Identification
  id: string;
  userId: string;
  createdAt: number;
  
  // Visual Content
  imageUrl: string;
  previewUrl?: string; // Low-res preview for grid
  variantUrls?: string[]; // For comparison view
  
  // Prompt & AI Context
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  modelType?: 'image-to-image' | 'text-to-image' | 'img2img-enhance';
  seed?: number; // For reproducibility
  
  // Generation Metadata
  parameters?: GenerationParameters;
  generationTime?: number; // ms
  revision?: number; // For iterative refinements
}

export interface GenerationParameters {
  size?: string; // '1024x1024', '512x512', etc.
  steps?: number; // Inference steps
  guidanceScale?: number; // CFG scale
  quality?: 'standard' | 'hd' | 'ultra'; // Quality tier
  style?: string; // Chosen style preset
  format?: 'png' | 'jpeg' | 'webp';
}

/**
 * Validates if generation data meets display requirements.
 */
export function isGenerationDisplayable(data: Partial<GenerationDetail>): boolean {
  return Boolean(data.id && data.prompt && data.imageUrl);
}

/**
 * Validates required fields for generation entities.
 */
export function validateGeneration(data: any): asserts data is GenerationDetail {
  if (!data.id) {
    throw new Error('Generation ID is required');
  }
  if (!data.prompt) {
    throw new Error('Generation prompt is required');
  }
  if (!data.imageUrl) {
    throw new Error('Generation image URL is required');
  }
  if (!data.userId) {
    throw new Error('User ID is required');
  }
}