import { test, expect, Page } from '@playwright/test';

// --- CONFIGURAÇÃO ---
const BASE_URL = 'http://localhost:3000';
const TEST_BYPASS_SECRET = 'dev-bypass-secret-123';

// Gera e-mail único por execução para evitar conflitos
const timestamp = Date.now();
const TEST_USER = {
    name: 'Playwright Rotas',
    email: `rotas-${timestamp}@teste.com`,
    password: '123456',
};

// --- HELPERS ---

async function signupAndLogin(page: Page) {
    // Cria usuário via API
    const signupResponse = await page.request.post(`${BASE_URL}/api/auth/signup`, {
        data: {
            name: TEST_USER.name,
            email: TEST_USER.email,
            password: TEST_USER.password,
            planType: 'free',
        },
    });
    expect(signupResponse.ok(), 'Falha ao criar usuário de teste').toBeTruthy();

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

async function createDemanda(page: Page, index: number) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const prazoValue = tomorrow.toISOString().split('T')[0];

    await page.click('button:has-text("Nova Demanda")');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[name="nome_solicitante"]').fill(`Solicitante Rota ${index}`);
    await modal.locator('input[name="cep"]').fill('93010193');
    await modal.locator('input[name="cep"]').blur();
    await page.waitForTimeout(1000);
    await modal.locator('input[name="numero"]').fill(`${index}`);

    const descricaoLocator = modal.locator('[name="descricao"]');
    await descricaoLocator.waitFor({ state: 'visible', timeout: 5000 });
    await descricaoLocator.fill(`Descrição Demanda Rota ${index}`);
    await modal.locator('input[name="prazo"]').fill(prazoValue);

    // Tipo de Demanda
    await modal.getByRole('combobox', { name: /Tipo de Demanda/i }).click();
    const listbox = page.getByRole('listbox');
    await listbox.waitFor({ state: 'visible', timeout: 5000 });
    await listbox.getByRole('option', { disabled: false }).first().click();
    await expect(listbox).not.toBeVisible();

    await modal.locator('button:has-text("Registrar Demanda")').click();

    // Espera sucesso
    const successLocator = page.locator('text=Demanda Registrada com Sucesso!');
    await successLocator.waitFor({ state: 'visible', timeout: 15000 });
    await page.click('button:has-text("Fechar")');

    // Espera a demanda aparecer na lista
    await page.waitForSelector(`text=Solicitante Rota ${index}`, { timeout: 5000 }).catch(() => { });
}

async function cleanupUser(page: Page) {
    await page.request.post(`${BASE_URL}/api/test/cleanup`, {
        headers: {
            'Content-Type': 'application/json',
            'x-test-bypass': TEST_BYPASS_SECRET,
        },
        data: {
            type: 'DEMANDAS_AND_ROTAS',
            email: TEST_USER.email,
        },
    });
}

// --- TESTES ---

test.describe('Gestão de Rotas: Fluxo Completo', () => {
    test('Deve criar demandas, montar uma rota, visualizar e deletar', async ({ page }) => {
        test.setTimeout(90000);

        await test.step('1. Cadastrar, logar e limpar dados', async () => {
            await signupAndLogin(page);
            await cleanupUser(page);
            await page.goto(`${BASE_URL}/demandas`);
            await page.waitForSelector('button:has-text("Nova Demanda")', {
                state: 'visible',
                timeout: 10000,
            });
        });

        await test.step('2. Criar 2 demandas para a rota', async () => {
            // Garante que estamos na visualização de lista para poder selecionar linhas
            await page.getByLabel('lista').click();
            await page.waitForTimeout(2000); // Espera a transição

            await createDemanda(page, 1);
            await createDemanda(page, 2);
        });

        await test.step('3. Selecionar demandas e criar rota', async () => {
            // Seleciona a primeira demanda clicando na linha
            const row = page.getByRole('row').filter({ hasText: "Solicitante Rota 1" }).first();
            await row.waitFor({ state: 'visible', timeout: 10000 });
            await row.click();

            // Clica em "Criar Rota"
            const criarRotaButton = page.getByRole('button', { name: /Criar Rota/i });
            await expect(criarRotaButton).toBeVisible({ timeout: 10000 });
            await criarRotaButton.click();

            // Preenche o modal
            const rotaModal = page.getByRole('dialog', { name: 'Criar Nova Rota' });
            await expect(rotaModal).toBeVisible({ timeout: 10000 });

            await rotaModal.getByRole('textbox', { name: 'Nome da Rota' }).fill('Rota Teste Playwright');
            await rotaModal.getByRole('combobox', { name: /Responsável/i }).click();
            await page.getByRole('option').first().click();

            const saveButton = rotaModal.getByRole('button', { name: 'Salvar Rota' });
            await expect(saveButton).toBeEnabled({ timeout: 5000 });
            await saveButton.click();

            // Espera modal fechar (sucesso)
            await expect(rotaModal).not.toBeVisible({ timeout: 15000 });
        });

        await test.step('4. Navegar para Rotas e verificar criação', async () => {
            await page.goto(`${BASE_URL}/rotas`);
            await expect(page.locator('text=Rota Teste Playwright')).toBeVisible({ timeout: 10000 });
        });

        await test.step('5. Limpar dados de teste', async () => {
            await cleanupUser(page);
        });
    });
});
