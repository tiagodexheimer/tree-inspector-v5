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
        password: senhaTeste
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
    await page.click('button:has-text("Adicionar Demanda")');

    await page.fill('input[name="nome_solicitante"]', nomeSolicitante);
    await page.fill('input[name="cep"]', '90000-000'); 
    await page.locator('input[name="cep"]').blur();
    await page.waitForTimeout(1000); 

    await page.fill('input[name="numero"]', '123');
    
    // [CORREÇÃO] Usamos a descrição única aqui
    await page.fill('textarea[name="descricao"]', descricaoUnica);
    
    await page.click('#tipo-demanda-select-label + div'); 
    const optionPoda = page.locator('li[role="option"]:has-text("Poda")').first();
    await page.waitForTimeout(500);
    if (await optionPoda.isVisible()) {
        await optionPoda.click();
    } else {
        const firstOption = page.locator('li[role="option"]').first();
        await firstOption.click();
    }

    await page.click('button:has-text("Registrar Demanda")');

    // Verificar Sucesso (O diálogo aparece e tem o botão Fechar, conforme seu código)
    await expect(page.locator('text=Demanda Registrada com Sucesso!')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Fechar")');

    // --- VERIFICAÇÃO NA LISTA ---
    await page.reload();
    await expect(page.locator('h1:has-text("Demandas")')).toBeVisible();
    
    const searchInput = page.getByLabel('Buscar...', { exact: false }).or(page.getByPlaceholder('Buscar...'));
    
    // Filtramos pelo nome (o backend busca por nome)
    await searchInput.clear();
    await searchInput.fill(nomeSolicitante);
    
    await page.waitForTimeout(2000); 

    // [CORREÇÃO FINAL] Verificamos se a DESCRIÇÃO está visível no card, pois o nome do solicitante fica oculto
    await expect(page.locator(`text=${descricaoUnica}`)).toBeVisible({ timeout: 10000 });
  });
});