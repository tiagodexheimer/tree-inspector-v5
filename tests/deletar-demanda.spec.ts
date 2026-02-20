import { test, expect, Page } from '@playwright/test';

// --- CONFIGURAÇÃO ---
const BASE_URL = 'http://localhost:3000';
const TEST_BYPASS_SECRET = 'dev-bypass-secret-123';
const timestamp = Date.now();
const TEST_USER = {
    name: 'Playwright Delete',
    email: `delete-${timestamp}@teste.com`,
    password: '123456',
};

// --- HELPERS ---

async function signupAndLogin(page: Page) {
    const signupResponse = await page.request.post(`${BASE_URL}/api/auth/signup`, {
        data: {
            name: TEST_USER.name,
            email: TEST_USER.email,
            password: TEST_USER.password,
            planType: 'free',
        },
    });
    expect(signupResponse.ok(), 'Falha ao criar usuário de teste').toBeTruthy();

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
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

test.describe('Deletar Demanda: Fluxo com Confirmação', () => {

    test('Deve criar uma demanda, deletá-la e confirmar que foi removida', async ({ page }) => {
        test.setTimeout(60000);

        const nomeSolicitante = `Solicitante Delete ${timestamp}`;
        const descricao = `Demanda para deletar ${timestamp}`;

        await test.step('1. Cadastrar, logar e limpar dados', async () => {
            await signupAndLogin(page);
            await cleanupUser(page);
            await page.goto(`${BASE_URL}/demandas`);

            // Garante visualização de lista
            await page.getByLabel('lista').click();
            await page.waitForTimeout(2000);

            await page.waitForSelector('button:has-text("Nova Demanda")', {
                state: 'visible',
                timeout: 10000,
            });
        });

        await test.step('2. Criar demanda para deletar', async () => {
            await page.click('button:has-text("Nova Demanda")');
            const modal = page.getByRole('dialog');
            await expect(modal).toBeVisible({ timeout: 5000 });

            await modal.locator('input[name="nome_solicitante"]').fill(nomeSolicitante);
            await modal.locator('input[name="cep"]').fill('93010193');
            await modal.locator('input[name="cep"]').blur();
            await page.waitForTimeout(1000);
            await modal.locator('input[name="numero"]').fill('999');

            const descricaoLocator = modal.locator('[name="descricao"]');
            await descricaoLocator.waitFor({ state: 'visible', timeout: 5000 });
            await descricaoLocator.fill(descricao);

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
        });

        await test.step('3. Verificar que a demanda existe na lista', async () => {
            // Recarrega para garantir que a lista está atualizada
            await page.reload();
            await page.getByLabel('lista').click();

            // Verifica que a demanda aparece (pelo nome do solicitante que agora está na tabela)
            const row = page.getByRole('row').filter({ hasText: nomeSolicitante }).first();
            await expect(row).toBeVisible({ timeout: 15000 });
        });

        await test.step('4. Selecionar e deletar a demanda', async () => {
            // Seleciona a demanda clicando na linha
            const demandaItem = page.getByRole('row').filter({ hasText: nomeSolicitante }).first();
            await demandaItem.click();

            // Clica no botão de deletar (pode ser "Excluir Selecionadas" ou ícone de lixeira)
            const deleteButton = page.getByRole('button', { name: /Excluir|Deletar/i }).first();
            await deleteButton.click();

            // Confirma no diálogo de confirmação
            const confirmDialog = page.getByRole('dialog');
            await expect(confirmDialog).toBeVisible({ timeout: 5000 });

            const confirmButton = confirmDialog.getByRole('button', { name: /Confirmar|Excluir|Sim/i });
            await confirmButton.click();
        });

        await test.step('5. Verificar que a demanda foi removida', async () => {
            // Espera a lista atualizar
            await page.waitForTimeout(2000);
            await expect(page.locator(`text=${descricao}`)).not.toBeVisible({ timeout: 10000 });
        });

        await test.step('6. Limpar dados de teste', async () => {
            await cleanupUser(page);
        });
    });
});
