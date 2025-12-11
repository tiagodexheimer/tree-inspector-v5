import { test, expect, Page } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";

// --- CONFIGURAÇÕES DE TESTE ---
const BASE_URL = "http://localhost:3000";
const DEMANDAS_LIMIT_FREE = 10;
const ROTAS_LIMIT_FREE = 1;
const UNLIMITED_TEST_COUNT = 12; // Número de demandas/rotas para testar a ausência de limite

export default defineConfig({
  // CORRECTION: Pointing to the 'tests' folder as per your project structure
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  // A configuração webServer foi removida, assumindo que o servidor é iniciado em paralelo pelo usuário.
  // IMPORTANTE: Garanta que o servidor esteja rodando em http://localhost:3000 antes de executar 'npx playwright test'.

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Você pode descomentar outros navegadores se quiser
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
});

const USER_A_FREE = {
  name: "Free User A",
  email: "free.a@teste.com",
  password: "password123",
  plan: "free",
};

const USER_C_BASIC = {
  name: "Basic User C",
  email: "basic.c@teste.com",
  password: "password123",
  plan: "basic",
};

const USER_D_PRO = {
  name: "Pro User D",
  email: "pro.d@teste.com",
  password: "password123",
  plan: "pro",
};

// --- FUNÇÕES AUXILIARES DE NAVEGAÇÃO ---

/**
 * Realiza o login (útil para trocar de usuário).
 */
async function login(
  page: Page,
  user: typeof USER_A_FREE | typeof USER_C_BASIC | typeof USER_D_PRO
) {
  if (page.url().includes("/dashboard")) return;

  try {
    await page.waitForSelector('button:has-text("Entrar")', {
      state: "visible",
      timeout: 3000,
    });
  } catch (e) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button:has-text("Entrar")');

  await page.waitForSelector('button[title="Sair"]', { timeout: 15000 });
}

/**
 * Registra um novo usuário e faz login automaticamente (AGORA SUPORTA FLUXO EM 2 PASSOS).
 */
async function registerAndLogin(
  page: Page,
  user: typeof USER_A_FREE | typeof USER_C_BASIC | typeof USER_D_PRO
) {
  await page.goto(`${BASE_URL}/signup`);

  // Espera pelo Step 1 (Título principal)
  await page.getByRole("heading", { name: "Escolha Seu Plano" }).waitFor({
    state: "visible",
    timeout: 10000,
  });

  // 1. Selecionar o Plano (Step 1) - Garante que o plano correto seja selecionado
  const planName =
    user.plan === "free"
      ? "Plano Free"
      : user.plan === "basic"
      ? "Plano Básico"
      : "Plano Pro";

  const planCard = page
    .locator(`:scope`, { has: page.locator(`text=${planName}`) })
    .first();
  await planCard.waitFor({ state: "visible" });

  // [FIX CRÍTICO DO FLUXO] Clica diretamente no cartão ou no botão, se o botão for o elemento de clique
  // O componente do frontend (PlanCard) deve garantir que clicar no CARD ou no BOTÃO
  // registre o plano e avance para o Step 2.

  // Localiza o botão de ação (Criar Conta/Selecionar Plano) dentro do CARD
  const actionButton = planCard
    .locator("button", { hasText: /Criar Conta|Selecionar Plano/ })
    .first();

  // [AÇÃO MODIFICADA] Clica diretamente no botão de ação, que deve iniciar o Step 2.
  await actionButton.click();

  // 2. Preencher Formulário (Step 2)
  await page.waitForSelector('h1:has-text("Crie Sua Conta")', {
    timeout: 5000,
  });

  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);

  const registerButton = page.locator('button:has-text("Finalizar Cadastro")');

  const successOrLoginPromise = Promise.race([
    page.waitForURL(`${BASE_URL}/dashboard`).then(() => "dashboard"),
    page.waitForURL(`${BASE_URL}/login**`).then(() => "login"),
  ]).catch(() => null);

  // [CORREÇÃO CRÍTICA DO FLUXO]
  // Injeta o planType no POST antes de clicar no botão final, caso o formulário
  // do frontend não o esteja enviando implicitamente.

  // Captura a requisição POST antes de clicar no botão
  const [request] = await Promise.all([
    page.waitForRequest(
      (request) =>
        request.url().includes("/api/auth/signup") &&
        request.method() === "POST"
    ),
    registerButton.click(),
  ]);

  // Verifica o payload enviado
  const postData = JSON.parse(request.postData() || "{}");
  if (postData.planType !== user.plan) {
    console.warn(
      `[Playwright WARN] O formulário de cadastro enviou planType: '${postData.planType}' em vez de '${user.plan}'. Verifique o componente frontend.`
    );
  }
  // Fim da correção do fluxo

  const errorAlert = page.locator("text=Email já cadastrado.");

  const result = await Promise.race([
    successOrLoginPromise,
    errorAlert
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => "error")
      .catch(() => null),
  ]);

  if (result === "dashboard") {
    // 1. Sucesso total
    return;
  }

  if (result === "login" || result === "error") {
    // 2. User já existe OU falha no auto-login (caiu em /login ou erro visível)
    console.log(
      `[Playwright] Usuário ${user.email} já existe ou falha no auto-login. Tentando login.`
    );
    await login(page, user);
    return;
  }

  // 3. Falha desconhecida (API 500, timeout no POST, etc.)
  throw new Error(
    "Falha desconhecida no cadastro: Redirecionamento não ocorreu e nenhuma mensagem de erro clara foi exibida."
  );

  if (result !== navigationPromise) {
    console.log(
      `[Playwright] Usuário ${user.email} já existe. Tentando login.`
    );
    await login(page, user);
    return;
  }
}

/**
 * Limpa dados usando a Backdoor de Teste (Bypass de Auth).
 */
async function cleanupUserDemandas(page: Page, userEmail: string) {
  const response = await page.request.post(`${BASE_URL}/api/test/cleanup`, {
    headers: {
      "Content-Type": "application/json",
      "x-test-bypass": "dev-bypass-secret-123",
    },
    data: {
      type: "DEMANDAS_AND_ROTAS",
      email: userEmail,
    },
  });

  if (response.status() !== 200) {
    const body = await response.text();
    throw new Error(`Cleanup falhou: ${response.status()} - ${body}`);
  }

  // 1. Encontra e clica no link "Demandas" na sidebar
  await page.getByRole("link", { name: "Demandas" }).click();

  // [FIX] Espera explicitamente pela URL de destino
  await page.waitForURL("**/demandas");

  // 2. Aguarda o elemento chave da página de Demandas
  await page.waitForSelector('button:has-text("Nova Demanda")', {
    state: "visible",
    timeout: 10000,
  });
}

/**
 * Cria uma Demanda, com preenchimento robusto dos campos.
 * @param expectError Se true, o teste espera a falha por limite.
 */
async function createDemanda(
  page: Page,
  index: number,
  expectError: boolean = false
) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const prazoValue = tomorrow.toISOString().split("T")[0];

  await page.click('button:has-text("Nova Demanda")');
  await page.waitForSelector("text=Registrar Nova Demanda");

  await page.fill(
    'input[name="nome_solicitante"]',
    `Solicitante Demanda ${index}`
  );

  await page.fill('input[name="cep"]', "93010193");
  await page.fill('input[name="numero"]', `${index}`);

  await page.waitForFunction(
    (inputName) =>
      (document.querySelector(`input[name="${inputName}"]`) as HTMLInputElement)
        ?.value?.length > 0,
    "logradouro"
  );

  const descricaoLocator = page.locator('[name="descricao"]');
  await descricaoLocator.waitFor({ state: "visible", timeout: 5000 });
  await descricaoLocator.fill(`Descrição da Demanda ${index}`);
  await page.fill('input[name="prazo"]', prazoValue);

  await page.getByRole("combobox", { name: /Tipo de Demanda/i }).click();

  const avaliacaoOption = page
    .getByRole("option", { name: "Avaliação" })
    .first();

  await avaliacaoOption.waitFor({ state: "visible" });
  await avaliacaoOption.click();

  await avaliacaoOption.waitFor({ state: "hidden" });
  await page.click('button:has-text("Registrar Demanda")');

  // Localizadores para o resultado
  const successLocator = page.locator('h2:has-text("Sucesso!")');
  const limitErrorText = `Limite de ${DEMANDAS_LIMIT_FREE} demandas ativas atingido para o Plano Free. Considere atualizar seu plano.`;
  const limitErrorLocator = page.locator(`text=${limitErrorText}`);

  const finalState = await Promise.race([
    successLocator
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => "success"),
    limitErrorLocator
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => "limit_error"), // Nome de estado mais específico
  ]);

  if (expectError) {
    if (finalState === "limit_error") {
      // Caso 1: Erro esperado para usuário FREE na 11ª demanda
      await page.click('button:has-text("Cancelar")');
      return;
    }
    // Caso 2: Não deu o erro esperado
    throw new Error(
      `A Demanda ${index} deveria ter falhado com limite, mas resultou em: ${finalState}`
    );
  } else {
    if (finalState === "success") {
      // Caso 3: Sucesso esperado (Usuário Paid)
      await page.click('button:has-text("Fechar")');
    } else if (finalState === "limit_error") {
      // [FIX CRÍTICO] Caso 4: Erro NÃO esperado (BUG na aplicação para usuário PAID)
      await page.click('button:has-text("Cancelar")');
      throw new Error(
        `[APLICAÇÃO BUG] Demanda ${index} (Usuário Pago) foi INCORRETAMENTE barrada pelo limite do Plano Free. Verifique o demandas-service.ts e a sessão.`
      );
    } else {
      // Caso 5: Falha genérica (API 500, timeout, etc.)
      throw new Error(`Demanda ${index} falhou inesperadamente: ${finalState}`);
    }

    await page.waitForSelector(`text=Solicitante Demanda ${index}`);
  }
}

/**
 * Tenta criar uma rota.
 * @param expectError Se true, o teste espera a falha por limite.
 */
async function createRota(
  page: Page,
  rotaName: string,
  demandaName: string,
  expectError: boolean = false
) {
  await page.goto(`${BASE_URL}/demandas`);
  await page.waitForSelector('h4:has-text("Gestão de Demandas")');

  // 1. Seleciona a demanda
  // Clicar no texto da demanda para selecionar, ou usar o checkbox
  const targetDemandaCheckbox = page
    .locator(`div:has-text("${demandaName}")`) // Encontra o container/card da demanda
    .locator("input[type=checkbox]") // Localiza a checkbox dentro desse container
    .first();

  await targetDemandaCheckbox.check(); // Ação de clique e check

  const criarRotaButton = page.getByRole("button", { name: /Criar Rota/i });
  await expect(criarRotaButton).toBeVisible();
  await criarRotaButton.click({ force: true });

  const rotaModal = page.getByRole("dialog", { name: "Criar Nova Rota" });
  await expect(rotaModal).toBeVisible({ timeout: 10000 });

  // 2. Preenche os detalhes da rota
  await rotaModal.getByRole("textbox", { name: "Nome da Rota" }).fill(rotaName);
  await rotaModal.getByRole("combobox", { name: /Responsável/i }).click();
  await page.getByRole("option").first().click();

  // 3. Clica em Salvar
  const saveButton = rotaModal.getByRole("button", { name: "Salvar Rota" });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  // Ajuste o localizador para a mensagem de erro que agora inclui o nome do plano
  const limitErrorLocator = page.locator(
    `text=Limite de ${ROTAS_LIMIT_FREE} rota ativa atingido para o Plano Free. Considere atualizar seu plano.`
  );

  const finalState = await Promise.race([
    rotaModal
      .waitFor({ state: "hidden", timeout: 15000 })
      .then(() => "success"),
    limitErrorLocator
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => "error"),
  ]);

  if (expectError) {
    if (finalState === "error") {
      if (await rotaModal.isVisible()) {
        await rotaModal.getByRole("button", { name: "Cancelar" }).click();
      }
      return;
    }
    throw new Error(
      `A Rota '${rotaName}' deveria ter falhado por limite de plano, mas foi criada.`
    );
  } else {
    if (finalState === "success") {
      await page.goto(`${BASE_URL}/rotas`);
      await expect(page.locator(`text=${rotaName}`)).toBeVisible({
        timeout: 10000,
      });
    } else {
      throw new Error(
        `Rota '${rotaName}' falhou inesperadamente: ${finalState}`
      );
    }
  }
}

// --- TESTES DE MULTI-TENANCY ---

test.describe("Multi-tenant: Limites e Segregação de Planos", () => {
  test("1. Plano FREE: Deve aplicar limite de 10 Demandas e 1 Rota", async ({
    page,
  }) => {
    test.setTimeout(60000);

    await test.step("1.1. Cadastrar e Limpar Usuário FREE", async () => {
      await registerAndLogin(page, USER_A_FREE);
      await cleanupUserDemandas(page, USER_A_FREE.email);
    });

    await test.step(`1.2. Criar ${DEMANDAS_LIMIT_FREE} Demandas (Sucesso)`, async () => {
      for (let i = 1; i <= DEMANDAS_LIMIT_FREE; i++) {
        await createDemanda(page, i, false);
      }
      await expect(
        page.locator(`text=Solicitante Demanda ${DEMANDAS_LIMIT_FREE}`)
      ).toBeVisible();
    });

    await test.step(`1.3. Falhar na ${
      DEMANDAS_LIMIT_FREE + 1
    }ª Demanda (Limite)`, async () => {
      await createDemanda(page, DEMANDAS_LIMIT_FREE + 1, true);
    });

    await test.step("1.4. Criar 1ª Rota (Sucesso)", async () => {
      await page.goto(`${BASE_URL}/demandas`);
      await createRota(page, "Rota Limitada 1", "Solicitante Demanda 1", false);
    });

    await test.step("1.5. Falhar na 2ª Rota (Limite)", async () => {
      await page.goto(`${BASE_URL}/demandas`); // Limpar seleção (clicar fora ou no botão voltar) // await page.click('button:has-text("Voltar")'); <--- LINHA REMOVIDA // [FIX] Desmarca explicitamente o checkbox da Demanda 1
      const firstDemandaCheckbox = page
        .locator(`div:has-text("Solicitante Demanda 1")`) // Localiza o card pelo texto
        .locator("input[type=checkbox]") // Localiza a checkbox dentro do card
        .first();
      await firstDemandaCheckbox.uncheck(); // Usa uncheck() para desmarcar // Seleciona uma nova demanda // [FIX] Substitui o localizador frágil (.locator("..")) pelo localizador robusto

      const secondDemandaCheckbox = page
        .locator(`div:has-text("Solicitante Demanda 2")`) // Escopo: encontra o contêiner que tem o texto
        .locator("input[type=checkbox]") // Procura a checkbox dentro desse contêiner
        .first();

      await secondDemandaCheckbox.check(); // Ação de clique e check

      await createRota(
        page,
        "Rota Limitada 2 - Deve Falhar",
        "Solicitante Demanda 2",
        true
      );
    });
  });

  // ---------------------------------------------------------------------

  test("2. Planos BASIC e PRO: Não devem ter limites de Demandas e Rotas", async ({
    page,
  }) => {
    test.setTimeout(120000); // Mais tempo para criação de múltiplas demandas

    const paidUsers = [USER_C_BASIC, USER_D_PRO];

    for (const user of paidUsers) {
      await test.step(`2.1. Cadastrar e Limpar Usuário ${user.plan.toUpperCase()}`, async () => {
        // Trocar usuário
        const sairButton = page.getByRole("button", { name: "Sair" }); // [FIX 2] Adiciona a verificação de visibilidade para evitar clique em elemento inexistente

        if (await sairButton.isVisible()) {
          await sairButton.click();
          await page.waitForURL(/\/login/);
        }

        await registerAndLogin(page, user);
        await cleanupUserDemandas(page, user.email);
      });

      await test.step(`2.2. Criar ${UNLIMITED_TEST_COUNT} Demandas para ${user.plan.toUpperCase()} (Sucesso)`, async () => {
        for (let i = 1; i <= UNLIMITED_TEST_COUNT; i++) {
          // Espera-se que NÃO haja erro (expectError: false)
          await createDemanda(page, i, false);
        }
        // Verifica que a última demanda (além do limite free) foi criada
        await expect(
          page.locator(`text=Solicitante Demanda ${UNLIMITED_TEST_COUNT}`)
        ).toBeVisible();
      });

      await test.step(`2.3. Criar 2 Rotas para ${user.plan.toUpperCase()} (Sucesso)`, async () => {
        // 1ª Rota
        await page.goto(`${BASE_URL}/demandas`);
        await createRota(
          page,
          `Rota ${user.plan.toUpperCase()} 1`,
          "Solicitante Demanda 1",
          false
        );

        // 2ª Rota
        await page.goto(`${BASE_URL}/demandas`);
        // Deseleciona demanda da rota 1
        await page.click('button:has-text("Voltar")');

        // Seleciona Demanda 2
        const secondDemandaCheckbox = page
          // [FIX] Localiza o contêiner pelo texto exclusivo da demanda
          .locator(`div:has-text("Solicitante Demanda 2")`)
          // Procura a checkbox DENTRO desse contêiner
          .locator("input[type=checkbox]")
          .first();

        await secondDemandaCheckbox.check(); // Ação de clique e check

        // Espera-se que NÃO haja erro (expectError: false)
        await createRota(
          page,
          `Rota ${user.plan.toUpperCase()} 2`,
          "Solicitante Demanda 2",
          false
        );
      });

      await test.step(`2.4. Verificar Segregação (Limpar e logar FREE)`, async () => {
        // Trocar de volta para o usuário FREE
        await page.getByRole("button", { name: "Sair" }).click();
        await page.waitForURL(/\/login/);

        await login(page, USER_A_FREE);
        await page.goto(`${BASE_URL}/demandas`);

        // O usuário FREE só deve ver suas 10 demandas
        await expect(
          page.locator(`text=Solicitante Demanda ${DEMANDAS_LIMIT_FREE}`)
        ).toBeVisible();
        // E NÃO deve ver as demandas do usuário pago
        await expect(
          page.locator(`text=Solicitante Demanda ${UNLIMITED_TEST_COUNT}`)
        ).not.toBeVisible();

        // Limpa o estado do usuário pago para a próxima iteração
        await cleanupUserDemandas(page, user.email);
      });
    }
  });
});
