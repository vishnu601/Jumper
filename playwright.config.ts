import { defineConfig, devices } from '@playwright/test';

const CHANNEL = process.env.PLAYWRIGHT_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  /*
   * Uses the Chrome installed on this machine rather than Playwright's own
   * download. Set PLAYWRIGHT_CHANNEL='' in CI after `playwright install` to
   * fall back to the bundled Chromium.
   */
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 5'], channel: CHANNEL } },
  ],
  webServer: {
    command: 'npm run build && npx next start --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
