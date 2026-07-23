type ToastOptions = {
  id?: string;
  duration?: number;
  [key: string]: any;
};

type ToastModule = typeof import('react-hot-toast');
type ToastMethod = 'success' | 'error' | 'loading';

let toastModulePromise: Promise<ToastModule> | null = null;

const loadToast = () => {
  toastModulePromise ??= import('react-hot-toast');
  return toastModulePromise;
};

const makeToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const notify = (method: ToastMethod, message: string, options: ToastOptions = {}) => {
  const id = options.id ?? makeToastId();
  void loadToast().then(({ default: hotToast }) => {
    hotToast[method](message, { ...options, id });
  });
  return id;
};

export const preloadToast = () => {
  void loadToast();
};

export const toast = {
  success: (message: string, options?: ToastOptions) => notify('success', message, options),
  error: (message: string, options?: ToastOptions) => notify('error', message, options),
  loading: (message: string, options?: ToastOptions) => notify('loading', message, options),
  dismiss: (id?: string) => {
    void loadToast().then(({ default: hotToast }) => {
      hotToast.dismiss(id);
    });
  },
};

export default toast;
