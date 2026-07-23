/**
 * [LAYER: PLUMBING]
 * Stateless utility functions for user feedback and notifications.
 */

import toast from './lazyToast';

/**
 * Core toast notification function with type handling.
 */
export function showToast(message: string, type: 'success' | 'error' | 'loading' = 'success', id?: string): string {
  if (type === 'loading') {
    return toast.loading(message, { id });
  }
  
  if (type === 'error') {
    return toast.error(message, { id, duration: 5000 });
  }
  
  return toast.success(message, { id, duration: 3000 });
}

/**
 * Copies text to clipboard and shows success feedback.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showToast('Failed to copy', 'error');
    throw error;
  }
}

/**
 * Simulates a file download action for an image.
 */
export async function downloadImage(url: string, filename?: string): Promise<void> {
  showToast('Preparing download...', 'loading', 'download');
  
  let blobUrl: string | null = null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.dismiss('download');
    showToast('Download complete', 'success');
  } catch (error) {
    console.error('Failed to download image:', error);
    toast.dismiss('download');
    showToast('Download failed', 'error');
    throw error;
  } finally {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

/**
 * Shows a loading state for asynchronous operations.
 */
export function showLoading(message: string, id?: string): string {
  return showToast(message, 'loading', id);
}

/**
 * Shows a success state for completed operations.
 */
export function showSuccess(message: string, id?: string): void {
  const currentToast = document.getElementById(id || 'toast-0');
  if (currentToast) {
    toast.dismiss(id);
  }
  showToast(message, 'success', id);
}

/**
 * Shows an error state for failed operations.
 */
export function showError(message: string, id?: string): void {
  toast.dismiss(id);
  showToast(message, 'error', id);
}

/**
 * Converts a duration in milliseconds to a human-readable format.
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}
