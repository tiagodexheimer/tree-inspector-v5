// tests/multi-tenant.spec.ts
import { test, expect, Page } from "@playwright/test";

// --- CONFIGURAÇÕES DE TESTE ---
const BASE_URL = "http://localhost:3000";
const USER_A_FREE = {
  name: "User A",
  email: "free.a@teste.com",
  password: "passwordA",
};
const USER_B_FREE = {
  name: "User B",
  email: "free.b@teste.com",
  password: "passwordB",
};
const DEMANDAS_LIMIT_FREE = 10;
const ROTAS_LIMIT_FREE = 1;

// --- FUNÇÕES AUXILIARES DE NAVEGAÇÃO ---

/**
 * Registra um novo usuário e faz login automaticamente.
 * Se o usuário já existe, assume que a conta foi criada e procede com o login.
 */
async function registerAndLogin(page: Page, user: typeof USER_A_FREE) {
  await page.goto(`${BASE_URL}/signup`);
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Clica no botão "Registrar"
  await page.click('button:has-text("Registrar")');

  // 1. Verifica se o cadastro foi bem-sucedido (redirecionamento)
  // Usamos Promise.race para verificar redirecionamento OU erro.
  const navigationPromise = page
    .waitForURL(`${BASE_URL}/dashboard`)
    .catch(() => null);

  // 2. Verifica se o erro de "já existe" apareceu
  const errorAlert = page.locator("text=Email já cadastrado.");

  const result = await Promise.race([
    navigationPromise,
    errorAlert.waitFor({ state: "visible", timeout: 5000 }).catch(() => null),
  ]);

  if (result === null) {
    // Se a navegação falhou e o erro não apareceu, o teste deve falhar
    throw new Error(
      "Falha desconhecida no cadastro: Redirecionamento não ocorreu e nenhuma mensagem de erro clara foi exibida."
    );
  }

  // 3. Se o cadastro falhou (o erro apareceu), tenta fazer login
  if (result !== navigationPromise) {
    console.log(
      `[Playwright] Usuário ${user.email} já existe. Tentando login.`
    );
    await login(page, user); // Chama a função de login
    return; // Sai após o login
  }
  // Se chegou até aqui, o cadastro foi bem-sucedido e o navegador já está no dashboard
}

/**
 * Realiza o login (útil para trocar de usuário).
 */
async function login(page: Page, user: typeof USER_A_FREE) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

/**
 * Cria uma Demanda, com preenchimento robusto dos campos.
 */
async function createDemanda(page: Page, index: number) {
// [CRÍTICO: CORREÇÃO DA REFERENCEERROR] Define e calcula o valor do prazo DENTRO da função
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const prazoValue = tomorrow.toISOString().split('T')[0]; // Ex: "2025-12-05"

    // 1. Clica para abrir o modal
    await page.click('button:has-text("Nova Demanda")');
    await page.waitForSelector("text=Registrar Nova Demanda");
  await page.waitForSelector("text=Registrar Nova Demanda");

  // 2. Preenchimento dos campos básicos
  await page.fill(
    'input[name="nome_solicitante"]',
    `Solicitante Demanda ${index}`
  );

  // Preenchimento dos campos obrigatórios (CEP e Número)
  await page.fill('input[name="cep"]', "93010193");
  await page.fill('input[name="numero"]', `${index}`);

  // Espera que o campo Logradouro seja preenchido (indicando fim da busca assíncrona do CEP)
  await page.waitForFunction(
    (inputName) =>
      (document.querySelector(`input[name="${inputName}"]`) as HTMLInputElement)
        ?.value?.length > 0,
    "logradouro"
  );

// Preenche a Descrição
    const descricaoLocator = page.locator('[name="descricao"]');
    await descricaoLocator.waitFor({ state: 'visible', timeout: 5000 }); 
    await descricaoLocator.fill(`Descrição da Demanda ${index}`); 
    
    // Preenche o Prazo
    await page.fill('input[name="prazo"]', prazoValue); 

    // Clica no combobox
    await page.getByRole('combobox', { name: 'Tipo de Demanda' }).click(); 
    await page.getByRole('option', { name: 'Avaliação' }).first().click(); 
    
    // 4. Clica no botão de registro
    await page.click('button:has-text("Registrar Demanda")');

    // [CORREÇÃO CRÍTICA] FECHAR MODAL DE SUCESSO
    
    // Espera o modal de sucesso aparecer (Snapshot mostra o heading "Sucesso!")
    await page.waitForSelector('h2:has-text("Sucesso!")', { timeout: 10000 });
    
    // Clica no botão de fechar (Snapshot mostra 'button "Fechar"')
    await page.click('button:has-text("Fechar")'); 

    // Espera que a lista de demandas seja atualizada
    await page.waitForSelector(`text=Solicitante Demanda ${index}`); 
}

// --- TESTES DE MULTI-TENANCY ---

test.describe("Multi-tenant: Limites e Segregação", () => {
  // Não é necessário o beforeEach, pois a função registerAndLogin já garante o estado inicial.
  // O teste 1 é executado primeiro e cria o estado (Usuário A).
  // O teste 2 reutiliza a limpeza feita no teste 1 ou cria o Usuário B.

  test("1. Limite de 10 Demandas e 1 Rota (Plano Free)", async ({ page }) => {
    // 1. Setup: Register and login User A (Free)
    await test.step("1.1. Cadastrar Usuário A", async () => {
      await registerAndLogin(page, USER_A_FREE);
      await page.goto(`${BASE_URL}/demandas`);
    });

    // 2. Testando Limite de Demandas (10)
    await test.step("2.1. Criar 10 Demandas (Loop)", async () => {
      for (let i = 1; i <= DEMANDAS_LIMIT_FREE; i++) {
        await createDemanda(page, i);
      }
      await expect(
        page.locator(`text=Solicitante Demanda ${DEMANDAS_LIMIT_FREE}`)
      ).toBeVisible();
    });

    await test.step("2.2. Falhar na 11ª Demanda", async () => {
      // Tenta criar a 11ª
      await page.click('button:has-text("Nova Demanda")');
      await page.fill(
        'input[name="nome_solicitante"]',
        `Demanda ${DEMANDAS_LIMIT_FREE + 1}`
      );
      await page.locator('[name="descricao"]').fill("Demanda 11 - Deve falhar");

      // Simula o fluxo de preenchimento completo para o servidor processar a requisição
      await page.fill('input[name="cep"]', "93010193");
      await page.fill('input[name="numero"]', "11");
      await page.getByRole("combobox", { name: "Tipo de Demanda *" }).click();
      await page.locator('li:has-text("Avaliação")').click();

      await page.click('button:has-text("Registrar Demanda")');

      // [CRÍTICO] Verifica a mensagem de erro do serviço
      await expect(
        page.locator(
          `text=Limite de ${DEMANDAS_LIMIT_FREE} demandas atingido para o plano Free.`
        )
      ).toBeVisible();
      await page.click('button:has-text("Cancelar")');
    });

    // 3. Testando Limite de Rotas (1)
    await test.step("3.1. Criar 1ª Rota", async () => {
      await page.goto(`${BASE_URL}/rotas`);
      await page.click('button:has-text("Nova Rota")');
      await page.fill('input[name="nome"]', "Rota Limitada 1");
      await page.click('button:has-text("Salvar")');
      await expect(page.locator("text=Rota Limitada 1")).toBeVisible();
    });

    await test.step("3.2. Falhar na 2ª Rota", async () => {
      await page.click('button:has-text("Nova Rota")');
      await page.fill('input[name="nome"]', "Rota Limitada 2");
      await page.click('button:has-text("Salvar")');

      // [CRÍTICO] Verifica a mensagem de erro do serviço
      await expect(
        page.locator(
          `text=Limite de ${ROTAS_LIMIT_FREE} rota atingido para o plano Free.`
        )
      ).toBeVisible();
      await page.click('button:has-text("Cancelar")');
    });
  });

  test("2. Segregação de Dados e Bloqueio de Configuração", async ({
    page,
  }) => {
    // 1. Setup: Register User B (Nova Organização)
    await test.step("1.1. Cadastrar Usuário B (Org B)", async () => {
      // Este usuário será a Organização B (Free por padrão)
      await registerAndLogin(page, USER_B_FREE);
      await page.goto(`${BASE_URL}/demandas`);
    });

    // 2. Testando Segregação (Criação de Dados)
    await test.step("2.1. Criar 1 Demanda do User B", async () => {
      await createDemanda(page, 1); // User B cria a Demanda 1 (Org B)
      await expect(page.locator("text=Solicitante Demanda 1")).toBeVisible();
    });

    // 3. Testando Permissão (Bloqueio de Configuração para Free)
    await test.step("3.1. Falhar na Criação de Status (Permissão Pro)", async () => {
      await page.goto(`${BASE_URL}/gerenciar/status`);
      await page.click('button:has-text("Novo Status")');
      await page.fill('input[name="nome"]', "Status Pro");
      await page.fill('input[name="cor"]', "#FFFFFF"); // Preenche a cor

      // Clica no botão Salvar
      await page.click('button:has-text("Salvar")');

      // [CRÍTICO] Verifica a mensagem de erro do StatusService
      await expect(
        page.locator("text=A criação de Status é exclusiva para o Plano Pro.")
      ).toBeVisible();

      // Fecha o modal
      await page.click('button:has-text("Cancelar")');
    });

    // 4. Validação da Segregação (Voltar para User A)
    await test.step("4.1. Fazer Logout do User B e Login do User A", async () => {
      // Assumindo que você tem um link/botão de Sair no header
      await page.click('button:has-text("Sair")');

      // Login de volta com User A (Org A)
      await login(page, USER_A_FREE);
    });

    await test.step("4.2. Verificar Segregação em Demandas", async () => {
      await page.goto(`${BASE_URL}/demandas`);

      // [CRÍTICO] User A (Org A) deve ver 10 demandas (criadas no Test 1)
      await expect(
        page.locator(`text=Solicitante Demanda ${DEMANDAS_LIMIT_FREE}`)
      ).toBeVisible();

      // [CRÍTICO] User A (Org A) NÃO deve ver a demanda criada pelo User B (Org B)
      await expect(
        page.locator("text=Solicitante Demanda 1")
      ).not.toBeVisible();
    });
  });
});
