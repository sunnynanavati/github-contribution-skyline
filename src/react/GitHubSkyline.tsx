import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from 'react';

import { createSkyline } from '../core/SkylineController';
import type { SkylineController, SkylineOptions } from '../core/types';

export interface GitHubSkylineProps extends SkylineOptions {
  className?: string;
  style?: HTMLAttributes<HTMLDivElement>['style'];
}

export interface GitHubSkylineHandle {
  setView: SkylineController['setView'];
  getView: SkylineController['getView'];
  focus: SkylineController['focus'];
  isAnimating: SkylineController['isAnimating'];
}

export const GitHubSkyline = forwardRef<GitHubSkylineHandle, GitHubSkylineProps>(function GitHubSkyline(
  { className, style, ...options },
  forwardedRef,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SkylineController | null>(null);
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    if (!hostRef.current) return;
    controllerRef.current = createSkyline(hostRef.current, initialOptionsRef.current);
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(options);
  });

  useImperativeHandle(forwardedRef, () => ({
    setView: (view, immediate) => controllerRef.current?.setView(view, immediate),
    getView: () => controllerRef.current?.getView() ?? options.initialView ?? 'skyline',
    focus: () => controllerRef.current?.focus(),
    isAnimating: () => controllerRef.current?.isAnimating() ?? false,
  }), [options.initialView]);

  return <div ref={hostRef} className={className} style={style} suppressHydrationWarning />;
});
