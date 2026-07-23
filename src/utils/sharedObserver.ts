/**
 * [LAYER: PLUMBING]
 * A highly optimized, shared IntersectionObserver manager to avoid creating
 * hundreds of separate observer instances in the browser.
 */

type Callback = (isIntersecting: boolean) => void;

class IntersectionObserverManager {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, Callback>();
  private rootMargin: string;

  constructor(rootMargin = '800px') {
    this.rootMargin = rootMargin;
  }

  private getObserver(): IntersectionObserver {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const cb = this.callbacks.get(entry.target);
            if (cb) {
              cb(entry.isIntersecting);
            }
          }
        },
        { rootMargin: this.rootMargin }
      );
    }
    return this.observer;
  }

  public observe(element: Element, callback: Callback) {
    this.callbacks.set(element, callback);
    this.getObserver().observe(element);
  }

  public unobserve(element: Element) {
    this.callbacks.delete(element);
    if (this.observer) {
      this.observer.unobserve(element);
    }
    // Clean up observer and manager registry if no elements left to watch
    if (this.callbacks.size === 0) {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      managers.delete(this.rootMargin);
    }
  }
}

// Map rootMargin strings to their respective shared managers
const managers = new Map<string, IntersectionObserverManager>();

/**
 * Observes an element using a shared IntersectionObserver instance based on rootMargin.
 * Returns an unsubscribe/cleanup function.
 */
export function observeElement(element: Element, callback: Callback, rootMargin = '800px'): () => void {
  let manager = managers.get(rootMargin);
  if (!manager) {
    manager = new IntersectionObserverManager(rootMargin);
    managers.set(rootMargin, manager);
  }
  manager.observe(element, callback);
  
  return () => {
    manager?.unobserve(element);
  };
}
