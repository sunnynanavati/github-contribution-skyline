import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { GitHubSkyline } from '../../src/react';
import { installDomMocks } from './setup';

describe('React wrapper', () => {
  beforeEach(() => installDomMocks());

  it('mounts, reacts to props, and cleans up', () => {
    const view = render(<GitHubSkyline contributions={[{ date: '2026-09-26', count: 4 }]} palette="red" reducedMotion />);
    const host = view.container.firstElementChild as HTMLElement;
    expect(host.shadowRoot).not.toBeNull();
    view.rerender(<GitHubSkyline contributions={[{ date: '2026-09-26', count: 4 }]} palette="blue" reducedMotion />);
    expect(host.style.getPropertyValue('--gcs-surface')).toBe('#071522');
    view.unmount();
    expect(host.shadowRoot?.childElementCount).toBe(0);
  });
});
