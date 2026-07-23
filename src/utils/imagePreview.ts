/**
 * [LAYER: PLUMBING]
 * Stateless utility functions for image optimization and preview generation.
 */

/**
 * Generates an optimized preview URL for grid views.
 * Creates a smaller, lower-resolution version of the image.
 * Pattern mimics CDN query parameter optimization.
 */
export function generatePreviewUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  if (!originalUrl.startsWith('http')) return originalUrl;
  
  try {
    const urlObj = new URL(originalUrl);
    
    // Add preview parameters (simulate CDN optimization)
    urlObj.searchParams.set('preview', 'true');
    urlObj.searchParams.set('width', '512');
    urlObj.searchParams.set('quality', 'normal');
    
    return urlObj.toString();
  } catch {
    // If URL is not parseable, return original
    return originalUrl;
  }
}

/**
 * Generates a full-resolution hero URL for detail pages.
 * Ensures high quality for large displays.
 */
export function generateHeroUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  if (!originalUrl.startsWith('http')) return originalUrl;
  
  try {
    const urlObj = new URL(originalUrl);
    
    // Add hero parameters for high-res display
    urlObj.searchParams.set('quality', 'high');
    urlObj.searchParams.set('format', 'original');
    
    return urlObj.toString();
  } catch {
    // If URL is not parseable, return original
    return originalUrl;
  }
}

/**
 * Generates a thumbnail URL for compressed displays.
 * Smallest possible size for quick loading.
 */
export function generateThumbnailUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  if (!originalUrl.startsWith('http')) return originalUrl;
  
  try {
    const urlObj = new URL(originalUrl);
    urlObj.searchParams.set('width', '256');
    urlObj.searchParams.set('quality', 'compressed');
    
    return urlObj.toString();
  } catch {
    return originalUrl;
  }
}

/**
 * Optimizes an image URL based on its intended use.
 */
export function optimizeImageUrl(originalUrl: string, mode: 'preview' | 'hero' | 'thumbnail' = 'preview'): string {
  switch (mode) {
    case 'hero':
      return generateHeroUrl(originalUrl);
    case 'thumbnail':
      return generateThumbnailUrl(originalUrl);
    default:
      return generatePreviewUrl(originalUrl);
  }
}

/**
 * Checks if an image URL is actually a local file path.
 */
export function isLocalFile(url: string): boolean {
  return url.startsWith('file://') || url.startsWith('local:');
}