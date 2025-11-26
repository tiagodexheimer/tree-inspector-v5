import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // CORRECTION: Pointing to the 'tests' folder as per your project structure
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Configura o servidor de desenvolvimento para subir antes dos testes
 webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Já existia:
      POSTGRES_URL: 'postgresql://test_user:test_password@localhost:5433/test_db',
      // +++ CORREÇÕES +++
      NEXTAUTH_SECRET: 'segredo-de-teste-ci', // Resolve MissingSecret
      // Adicione outras chaves de API se forem essenciais para a inicialização:
      GOOGLE_MAPS_API_KEY: 'test-api-key-playwright', 
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Você pode descomentar outros navegadores se quiser
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
});