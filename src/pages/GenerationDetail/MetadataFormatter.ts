/**
 * [LAYER: INFRASTRUCTURE]
 */

import type { GenerationDetail } from '../../domain/models/GenerationDetail';
import { getAspectRatioOption } from '../../lib/aspectRatios';

function formatShape(value?: string): string | null {
    if (!value) return null;
    const option = getAspectRatioOption(value);
    return option ? `${option.label} (${option.value})` : value;
}

/**
 * Formats generation parameters into a user-friendly string.
 * @param generation - The generation data with parameters
 * @returns Formatted parameters string
 */
export function formatParameters(generation: GenerationDetail): string {
    const parts: string[] = [];

    const shape = formatShape(generation.parameters?.size);
    if (shape) {
        parts.push(`Shape: ${shape}`);
    }

    if (generation.parameters?.steps) {
        parts.push(`${generation.parameters.steps} steps`);
    }

    if (generation.parameters?.guidanceScale) {
        parts.push(`Guidance: ${generation.parameters.guidanceScale}`);
    }

    if (generation.parameters?.quality) {
        parts.push(`Mode: ${generation.parameters.quality.toUpperCase()}`);
    }

    if (generation.parameters?.style) {
        parts.push(`${generation.parameters.style} preset`);
    }

    if (generation.parameters?.format) {
        parts.push(`${generation.parameters.format.toUpperCase()}`);
    }

    return parts.filter(Boolean).join(' · ');
}

/**
 * Formats generation date into a localized time string.
 * @param createdAt - Timestamp of generation creation
 * @returns Formatted date string
 */
export function formatDateTime(createdAt: number): string {
    if (!createdAt) return 'Unknown date';

    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Extracts metadata fields from generation for display in grids.
 * @param generation - The generation data
 * @returns Array of metadata items
 */
export function getMetadataItems(generation: GenerationDetail) {
    const items = [];

    if (generation.id) {
        items.push({
            label: 'Generation ID',
            value: generation.id.slice(0, 12),
            type: 'id' as const
        });
    }

    if (generation.modelId) {
        items.push({
            label: 'Model',
            value: generation.modelId,
            type: 'model' as const
        });
    }

    if (generation.userId) {
        items.push({
            label: 'Created by',
            value: 'Me',
            type: 'user' as const
        });
    }

    if (generation.generationTime) {
        items.push({
            label: 'Generation time',
            value: formatDuration(generation.generationTime),
            type: 'time' as const
        });
    }

    const shape = formatShape(generation.parameters?.size);
    if (shape) {
        items.push({
            label: 'Shape',
            value: shape,
            type: 'view' as const
        });
    }

    return items;
}

/**
 * Formats duration in milliseconds into human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
