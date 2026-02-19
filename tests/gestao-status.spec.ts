import { test, expect, Page } from '@playwright/test';

// --- CONFIGURAÇÃO ---
const BASE_URL = 'http://localhost:3000';
const timestamp = Date.now();
const TEST_USER = {
    name: 'Playwright Status',
    email: `status-${timestamp}@teste.com`,
    password: '123456',
};

// --- HELPERS ---

async function signupAndLogin(page: Page) {
    const signupResponse = await page.request.post(`${BASE_URL}/api/auth/signup`, {
        data: {
            name: TEST_USER.name,
            email: TEST_USER.email,
            password: TEST_USER.password,
            planType: 'pro',
        },
    });
    expect(signupResponse.ok(), 'Falha ao criar usuário de teste').toBeTruthy();

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

// --- TESTES ---

test.describe('Gestão de Status: CRUD Completo', () => {
    const statusName = `Status Teste ${timestamp}`;
    const statusNameEdited = `Status Editado ${timestamp}`;

    test('Deve criar, editar e deletar um status personalizado', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('1. Logar e navegar para Gerenciar Status', async () => {
            await signupAndLogin(page);
            await page.goto(`${BASE_URL}/gerenciar/status`);
            await page.waitForLoadState('networkidle');
        });

        await test.step('2. Criar novo status', async () => {
            // Abre modal de criação
            const addButton = page.getByRole('button', { name: /Novo Status|Adicionar/i });
            await addButton.click();

            // Preenche o formulário
            const modal = page.getByRole('dialog');
            await expect(modal).toBeVisible({ timeout: 5000 });

            await modal.getByRole('textbox', { name: /Nome/i }).fill(statusName);

            // Salva
            const saveButton = modal.getByRole('button', { name: /Salvar/i });
            await saveButton.click();

            // Verifica que o status aparece na lista
            await expect(page.locator(`text=${statusName}`)).toBeVisible({ timeout: 10000 });
        });

        await test.step('3. Editar o status criado', async () => {
            // Encontra o botão de editar na linha do status
            const statusRow = page.locator(`tr:has-text("${statusName}")`).first();
            const editButton = statusRow.getByRole('button', { name: /Editar|edit/i }).first();
            await editButton.click();

            // Edita o nome no modal
            const modal = page.getByRole('dialog');
            await expect(modal).toBeVisible({ timeout: 5000 });

            const nameField = modal.getByRole('textbox', { name: /Nome/i });
            await nameField.clear();
            await nameField.fill(statusNameEdited);

            const saveButton = modal.getByRole('button', { name: /Salvar/i });
            await saveButton.click();

            // Verifica que o nome foi atualizado
            await expect(page.locator(`text=${statusNameEdited}`)).toBeVisible({ timeout: 10000 });
            // Verifica que o nome antigo não aparece mais
            await expect(page.locator(`text=${statusName}`)).not.toBeVisible();
        });

        await test.step('4. Deletar o status editado', async () => {
            // Encontra o botão de deletar
            const statusRow = page.locator(`tr:has-text("${statusNameEdited}")`).first();
            const deleteButton = statusRow.getByRole('button', { name: /Excluir|Deletar|delete/i }).first();
            await deleteButton.click();

            // Confirma a deleção no diálogo
            const confirmButton = page.getByRole('button', { name: /Confirmar|Excluir|Sim/i });
            await confirmButton.click();

            // Espera o diálogo sumir
            await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

            // Verifica que o status não está mais NA TABELA
            await expect(page.locator('table')).not.toContainText(statusNameEdited, { timeout: 10000 });
        });
    });
});
