declare module 'virtual:skyline-preview' {
  const preview: import('../../src/server').GitHubContributions | null;
  export default preview;
}
