/**
 * [LAYER: DOMAIN]
 * Pure business logic for formatting generation metadata into user-friendly text.
 */

import { GenerationParameters } from '../models/GenerationDetail';

/**
 * Formats AI parameters into user-friendly human-readable text.
 * Based on industry patterns from Midjourney, DALL-E, and Stable Diffusion users.
 */
export function formatParameters(params: GenerationParameters): string {
  const parts: string[] = [];
  
  if (params.size) parts.push(`Size: ${params.size}`);
  if (params.steps) parts.push(`${params.steps} steps`);
  if (params.guidanceScale !== undefined)
    parts.push(`Guidance: ${params.guidanceScale}`);
  if (params.quality) parts.push(`Mode: ${params.quality.toUpperCase()}`);
  if (params.style) parts.push(`${params.style} preset`);
  if (params.format) parts.push(`${params.format.toUpperCase()}`);
  
  return parts.filter(Boolean).join(' · ');
}

/**
 * Calculates a rough aesthetic quality score (0-100) based on metadata.
 * Used for showing "Quality" indicators on generation cards.
 */
export function calculateQualityScore(params: GenerationParameters): number {
  let score = 50; // Base score
  if (params.steps && params.steps >= 30) score += 15;
  if (params.steps && params.steps >= 50) score += 10;
  if (params.quality === 'hd' || params.quality === 'ultra') score += 20;
  if (params.format === 'webp' || params.format === 'png') score += 5;
  return Math.min(100, Math.max(0, score));
}

/**
 * Extracts just the early part of a prompt for display in small cards.
 */
export function truncatePromptForDisplay(prompt: string, maxLength: number = 80): string {
  if (prompt.length <= maxLength) return prompt;
  return prompt.slice(0, maxLength) + '...';
}

/**
 * Formats a timestamp for display in a readable format.
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Provides a descriptive label for the generation type.
 */
export function getGenerationTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    'image-to-image': 'Image to Image',
    'text-to-image': 'Text to Image',
    'img2img-enhance': 'Enhance Image'
  };
  return labels[type] || 'Generation';
}