/**
 * [LAYER: CORE]
 * Handles navigation logic between different views.
 * Provides consistent URL patterns and back navigation.
 */

/**
 * Generates the URL for a generation detail page.
 * Pattern: /generation/:id
 */
export class NavigationHandler {
  static generationDetail(generationId: string): string {
    return `/generation/${generationId}`;
  }

  /**
   * Generates a back link based on the current page context.
   * Returns the most logical previous page.
   */
  static generateBackLink(currentPath: string, currentUserId?: string): string {
    if (!currentPath || currentPath === '/') {
      return '/';
    }
    
    // If we're in a generation detail, go back to profile/history
    if (currentPath.includes('/generation/')) {
      return '/u/profile';
    }
    
    // If we're in user profile, go to model feed
    if (currentPath.includes('/u/')) {
      return '/';
    }
    
    // Default fallback
    return '/';
  }

  /**
   * Checks if a path is a generation detail page.
   * Useful for showing context-sensitive actions.
   */
  static isGenerationDetail(path: string): boolean {
    return path.startsWith('/generation/');
  }

  /**
   * Extracts the generation ID from a detail page path.
   */
  static extractGenerationId(path: string): string | null {
    const match = path.match(/^\/generation\/([^/]+)$/);
    return match ? match[1] : null;
  }
}