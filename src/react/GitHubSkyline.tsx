// The library build preserves the Next.js client boundary on dist/react.js.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from 'react';

import { createSkyline } from '../core/SkylineController.js';
import type { SkylineController, SkylineOptions } from '../core/types.js';

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
  const latestOptionsRef = useRef(options);
  latestOptionsRef.current = options;
  const previousOptionsRef = useRef(options);

  useEffect(() => {
    if (!hostRef.current) return;
    controllerRef.current = createSkyline(hostRef.current, {
      ...initialOptionsRef.current,
      onPaletteChange: (value) => {
        latestOptionsRef.current.onPaletteChange?.(value);
        if (latestOptionsRef.current.palette !== undefined) controllerRef.current?.update({ palette: latestOptionsRef.current.palette });
      },
      onHeightScaleChange: (value) => {
        latestOptionsRef.current.onHeightScaleChange?.(value);
        if (latestOptionsRef.current.heightScale !== undefined) controllerRef.current?.update({ heightScale: latestOptionsRef.current.heightScale });
      },
      onBuildingDetailChange: (value) => {
        latestOptionsRef.current.onBuildingDetailChange?.(value);
        if (latestOptionsRef.current.buildingDetail !== undefined) controllerRef.current?.update({ buildingDetail: latestOptionsRef.current.buildingDetail });
      },
    });
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previous = previousOptionsRef.current;
    const changed: Partial<SkylineOptions> = {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(options)] as Array<keyof SkylineOptions>);
    for (const key of keys) {
      if (key === 'onPaletteChange' || key === 'onHeightScaleChange' || key === 'onBuildingDetailChange') continue;
      if (!Object.is(previous[key], options[key])) Object.assign(changed, { [key]: options[key] });
    }
    if (Object.keys(changed).length) controllerRef.current?.update(changed);
    previousOptionsRef.current = options;
  });

  useImperativeHandle(forwardedRef, () => ({
    setView: (view, immediate) => controllerRef.current?.setView(view, immediate),
    getView: () => controllerRef.current?.getView() ?? options.initialView ?? 'skyline',
    focus: () => controllerRef.current?.focus(),
    isAnimating: () => controllerRef.current?.isAnimating() ?? false,
  }), [options.initialView]);

  return <div ref={hostRef} className={className} style={style} suppressHydrationWarning />;
});
