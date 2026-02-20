import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal do Sistema', () => {

  test('Deve conseguir logar e criar uma demanda', async ({ page, request }) => {
    // --- ETAPA DE PREPARAÇÃO (SETUP) ---
    const timestamp = Date.now();
    const emailTeste = `teste-${timestamp}@teste.com`;
    const senhaTeste = '123456';
    const nomeSolicitante = `Solicitante ${timestamp}`;
    // [CORREÇÃO] Tornamos a DESCRIÇÃO única, pois é ela que aparece no Card visível
    const descricaoUnica = `Teste Auto Playwright ${timestamp}`;

    console.log(`Criando usuário de teste: ${emailTeste}`);

    const signupResponse = await request.post('http://localhost:3000/api/auth/signup', {
      data: {
        name: 'Usuário Playwright',
        email: emailTeste,
        password: senhaTeste,
        planType: 'free'
      }
    });
    expect(signupResponse.ok(), 'Falha ao criar usuário de teste via API').toBeTruthy();

    // --- LOGIN ---
    await page.goto('/login');
    await page.fill('input[name="email"]', emailTeste);
    await page.fill('input[name="password"]', senhaTeste);
    await page.click('button[type="submit"]');

    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    } catch (e) {
      const errorAlert = page.locator('.MuiAlert-message');
      if (await errorAlert.isVisible()) {
        const text = await errorAlert.textContent();
        throw new Error(`Login falhou com mensagem na tela: ${text}`);
      }
      throw e;
    }

    await page.goto('/demandas');
    await expect(page).toHaveURL(/\/demandas/);

    // --- CRIAR DEMANDA ---
    await page.click('button:has-text("Nova Demanda")');

    // [CORREÇÃO] Escopo dentro do modal para evitar seletores ambíguos
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[name="nome_solicitante"]').fill(nomeSolicitante);
    await modal.locator('input[name="cep"]').fill('90000-000');
    await modal.locator('input[name="cep"]').blur();
    await page.waitForTimeout(1000);

    await modal.locator('input[name="numero"]').fill('123');

    // [CORREÇÃO] Usamos a descrição única aqui
    const descricaoLocator = modal.locator('[name="descricao"]');
    await descricaoLocator.waitFor({ state: 'visible', timeout: 5000 });
    await descricaoLocator.fill(descricaoUnica);

    // [CORREÇÃO] Seletor robusto para Tipo de Demanda (MUI Select)
    await modal.getByRole('combobox', { name: /Tipo de Demanda/i }).click();
    const optionPoda = page.getByRole('option', { name: 'Poda' }).first();
    await optionPoda.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { });
    if (await optionPoda.isVisible()) {
      await optionPoda.click();
    } else {
      const firstOption = page.getByRole('option').first();
      await firstOption.click();
    }

    await modal.locator('button:has-text("Registrar Demanda")').click();

    // Verificar Sucesso
    await expect(page.locator('text=Demanda Registrada com Sucesso!')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Fechar")');

    // --- VERIFICAÇÃO NA LISTA ---
    await page.reload();
    await expect(page.getByRole('heading', { name: /Gestão de Demandas/i })).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Buscar por protocolo');

    // Filtramos pelo nome (o backend busca por nome)
    await searchInput.clear();
    await searchInput.fill(nomeSolicitante);

    await page.waitForTimeout(2000);

    // [CORREÇÃO FINAL] Verificamos se a DESCRIÇÃO está visível no card, pois o nome do solicitante fica oculto
    await expect(page.locator(`text=${descricaoUnica}`)).toBeVisible({ timeout: 10000 });
  });
});