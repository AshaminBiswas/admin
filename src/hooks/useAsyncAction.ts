import { useState, useRef, useEffect, useCallback } from 'react';

export type AsyncActionState = 'idle' | 'loading' | 'success' | 'error';
export type AsyncActionMode = 'download' | 'view' | 'copy';

export interface UseAsyncActionOptions {
  mode?: AsyncActionMode;
  successDurationMs?: number; // default: 800ms
  errorDurationMs?: number;   // default: 2500ms
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export interface UseAsyncActionResult {
  state: AsyncActionState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  errorMessage: string | null;
  execute: (actionFn?: () => Promise<void> | void) => Promise<void>;
  reset: () => void;
  ariaLiveMessage: string;
}

export function useAsyncAction(
  defaultAction?: () => Promise<void> | void,
  options: UseAsyncActionOptions = {}
): UseAsyncActionResult {
  const {
    mode = 'download',
    successDurationMs = 800,
    errorDurationMs = 2500,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<AsyncActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearTimer();
    if (isMountedRef.current) {
      setState('idle');
      setErrorMessage(null);
    }
  }, []);

  const execute = useCallback(
    async (overrideAction?: () => Promise<void> | void) => {
      // Prevent double trigger while loading
      if (state === 'loading') return;

      const actionToRun = overrideAction || defaultAction;
      if (!actionToRun) return;

      clearTimer();
      setState('loading');
      setErrorMessage(null);

      try {
        await actionToRun();

        if (!isMountedRef.current) return;

        if (mode === 'download' || mode === 'copy') {
          setState('success');
          onSuccess?.();
          resetTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setState('idle');
            }
          }, successDurationMs);
        } else {
          // 'view' mode: instantly return to idle so modal / tab opens cleanly without lingering checkmark
          setState('idle');
          onSuccess?.();
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const msg = err?.message || 'Action failed. Please try again.';
        setState('error');
        setErrorMessage(msg);
        onError?.(err);

        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setState('idle');
            setErrorMessage(null);
          }
        }, errorDurationMs);
      }
    },
    [state, defaultAction, mode, successDurationMs, errorDurationMs, onSuccess, onError]
  );

  const ariaLiveMessage =
    state === 'loading'
      ? mode === 'download'
        ? 'Preparing your download…'
        : mode === 'copy'
        ? 'Copying to clipboard…'
        : 'Loading content…'
      : state === 'success'
      ? mode === 'download'
        ? 'Download complete'
        : 'Copied successfully'
      : state === 'error'
      ? errorMessage || 'Action failed'
      : '';

  return {
    state,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    errorMessage,
    execute,
    reset,
    ariaLiveMessage,
  };
}
