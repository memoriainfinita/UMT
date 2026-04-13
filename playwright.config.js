// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  reporter: [['list']],
  webServer: {
    command: 'npx http-server public -p 8080 --silent',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
