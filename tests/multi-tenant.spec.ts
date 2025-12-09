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
 * Realiza o login (útil para trocar de usuário).
 */

// 2. [FIX] Verifica se o botão de Entrar JÁ está visível.
// Se estiver visível, significa que o app já nos jogou para o login,
// então NÃO precisamos fazer o goto (que causaria o ERR_ABORTED).
async function login(page: Page, user: typeof USER_A_FREE) {
  if (page.url().includes("/dashboard")) return;

  // [FIX] Wait briefly (3s) to see if the app navigates to Login automatically.
  // This handles the race condition where the form is about to appear.
  try {
    await page.waitForSelector('button:has-text("Entrar")', {
      state: "visible",
      timeout: 3000,
    });
  } catch (e) {
    // If the form didn't appear by itself, THEN force navigation.
    await page.goto(`${BASE_URL}/login`);
  }

  // Proceed with login (remove the duplicate waitForSelector if you want, or keep for safety)
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button:has-text("Entrar")');

  // [FIX] Use [title="Sair"] because IconButton has no inner text.
  // Alternatively, wait for the Dashboard link to appear.
  await page.waitForSelector('button[title="Sair"]', { timeout: 15000 });
}

/**
 * Registra um novo usuário e faz login automaticamente.
 */
async function registerAndLogin(page: Page, user: typeof USER_A_FREE) {
  await page.goto(`${BASE_URL}/signup`);
  await page.waitForSelector('button:has-text("Registrar")');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  await page.click('button:has-text("Registrar")');

  const navigationPromise = page
    .waitForURL(`${BASE_URL}/dashboard`)
    .catch(() => null);

  const errorAlert = page.locator("text=Email já cadastrado.");

  const result = await Promise.race([
    navigationPromise,
    errorAlert.waitFor({ state: "visible", timeout: 5000 }).catch(() => null),
  ]);

  if (result === null) {
    throw new Error(
      "Falha desconhecida no cadastro: Redirecionamento não ocorreu e nenhuma mensagem de erro clara foi exibida."
    );
  }

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
 * Não depende de cookies ou sessão do navegador.
 */
async function cleanupUserDemandas(page: Page, userEmail: string) {
  // 1. Usa page.request para enviar o Header Secreto e fazer a limpeza
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
  } // [FIX CRÍTICO] Navega explicitamente para a página de Demandas e espera

  await page.goto(`${BASE_URL}/demandas`); // Espera que o botão principal da página de Demandas esteja visível
  await page.waitForSelector('button:has-text("Nova Demanda")', {
    state: "visible",
    timeout: 10000,
  });
}

/**
 * Cria uma Demanda, com preenchimento robusto dos campos.
 */
async function createDemanda(page: Page, index: number) {
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
  await page.fill('input[name="prazo"]', prazoValue); // --- SELEÇÃO DE TIPO (CORRIGIDA) ---

  await page.getByRole("combobox", { name: /Tipo de Demanda/i }).click();

  const avaliacaoOption = page
    .getByRole("option", { name: "Avaliação" })
    .first();

  await avaliacaoOption.waitFor({ state: "visible" });
  await avaliacaoOption.click(); // [CORREÇÃO] Aguarda o menu fechar antes de clicar no botão Registrar

  await avaliacaoOption.waitFor({ state: "hidden" }); // ------------------------------------
  await page.click('button:has-text("Registrar Demanda")');

  const successLocator = page.locator('h2:has-text("Sucesso!")');
  const limitErrorLocator = page.locator(
    `text=Limite de ${DEMANDAS_LIMIT_FREE} demandas atingido para o plano Free.`
  );

  const finalState = await Promise.race([
    successLocator
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => "success"),
    limitErrorLocator
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => "error"),
  ]);

  if (finalState === "success") {
    await page.click('button:has-text("Fechar")');
  } else if (finalState === "error") {
    await page.click('button:has-text("Cancelar")');
    throw new Error(
      `A Demanda ${index} falhou inesperadamente: Limite atingido.`
    );
  } else {
    throw new Error(
      "Timeout: Nenhum modal de sucesso ou erro apareceu após registro."
    );
  }

  if (finalState === "success") {
    await page.waitForSelector(`text=Solicitante Demanda ${index}`);
  }
}

// --- TESTES DE MULTI-TENANCY ---

test.describe("Multi-tenant: Limites e Segregação", () => {
  test("1. Limite de 10 Demandas e 1 Rota (Plano Free)", async ({ page }) => {
    // FIX: Increase test timeout to 60 seconds (or use test.slow() for 3x default)
    test.setTimeout(60000);

    await test.step("1.1. Cadastrar e Limpar Usuário A", async () => {
      await registerAndLogin(page, USER_A_FREE); // [FIX] Passando o email para identificar o usuário no bypass

      await cleanupUserDemandas(page, USER_A_FREE.email);
    }); // 2. Testando Limite de Demandas (10)

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
      await page.waitForSelector("text=Registrar Nova Demanda");

      await page.fill(
        'input[name="nome_solicitante"]',
        `Demanda ${DEMANDAS_LIMIT_FREE + 1}`
      );
      await page.locator('[name="descricao"]').fill("Demanda 11 - Deve falhar");

      await page.fill('input[name="cep"]', "93010193");
      await page.fill('input[name="numero"]', "11"); // --- SELEÇÃO DE TIPO (CORRIGIDA) ---

      await page.getByRole("combobox", { name: /Tipo de Demanda/i }).click();

      const avaliacaoOption = page
        .getByRole("option", { name: "Avaliação" })
        .first();

      await avaliacaoOption.waitFor({ state: "visible" });
      await avaliacaoOption.click(); // [CORREÇÃO] Aguarda o menu fechar

      await avaliacaoOption.waitFor({ state: "hidden" }); // ------------------------------------
      await page.click('button:has-text("Registrar Demanda")'); // Verifica a mensagem de erro do serviço

      await expect(
        page.locator(
          `text=Limite de ${DEMANDAS_LIMIT_FREE} demandas atingido para o plano Free.`
        )
      ).toBeVisible();
      await page.click('button:has-text("Cancelar")');
    }); // 3. Testando Limite de Rotas (1)

    await test.step("3.1. Criar 1ª Rota", async () => {
      // Retorna para Demandas, seleciona e cria a rota via modal
      await page.goto(`${BASE_URL}/demandas`);
      await page.waitForSelector('h4:has-text("Gestão de Demandas")'); // Use o localizador semântico mais robusto // Select the item to enable the button

      await page.click("text=Solicitante Demanda 1"); // FIX: Define the locator variable before using it

      const criarRotaButton = page.getByRole("button", { name: /Criar Rota/i });

      await expect(criarRotaButton).toBeVisible();
      await criarRotaButton.click({ force: true });

      const rotaModal = page.getByRole("dialog", { name: "Criar Nova Rota" }); // FIX: Increase timeout to 20s to wait for the optimization API

      await expect(rotaModal).toBeVisible({ timeout: 20000 });

      await rotaModal
        .getByRole("textbox", { name: "Nome da Rota" })
        .fill("Rota Limitada 1"); // FIX: Select a responsible person to enable the save button

      await rotaModal.getByRole("combobox", { name: /Responsável/i }).click(); // Select the first available user option (or a specific one if known)
      await page.getByRole("option").first().click(); // Wait for the button to become enabled before clicking (optional but robust)

      const saveButton = rotaModal.getByRole("button", { name: "Salvar Rota" });
      await expect(saveButton).toBeEnabled();
      await saveButton.click(); // [FIX] Instead of waiting for automatic redirection, wait for the modal to close (success) // and then manually navigate to the Rotas page.

      await rotaModal.waitFor({ state: "hidden" });
      await page.goto(`${BASE_URL}/rotas`); // Verify the route was created

      await expect(page.locator("text=Rota Limitada 1")).toBeVisible();
    });

    await test.step("3.2. Falhar na 2ª Rota", async () => {
      // 1. Retorna para Demandas para tentar criar a segunda rota
      await page.goto(`${BASE_URL}/demandas`); // 2. Seleciona uma demanda "fresca" (Demanda 2) // Usando o filtro robusto para garantir que pegamos o checkbox correto do Card

      const secondDemandaCheckbox = page
        .locator("div")
        .filter({ has: page.getByText("Solicitante Demanda 2") })
        .filter({ has: page.getByRole("checkbox") })
        .last()
        .getByRole("checkbox");

      await secondDemandaCheckbox.check(); // 3. Clica no botão de criar rota

      await page.getByRole("button", { name: /Criar Rota/i }).click(); // FIX: Use robust modal handling like in step 3.1

      const rotaModal = page.getByRole("dialog", { name: "Criar Nova Rota" });
      await expect(rotaModal).toBeVisible(); // Fill Name

      await rotaModal
        .getByRole("textbox", { name: "Nome da Rota" })
        .fill("Rota Limitada 2"); // Select Responsible (Required)

      await rotaModal.getByRole("combobox", { name: /Responsável/i }).click();
      await page.getByRole("option").first().click(); // Click Save

      const saveButton = rotaModal.getByRole("button", { name: "Salvar Rota" });
      await expect(saveButton).toBeEnabled();
      await saveButton.click(); // 7. Verifica a mensagem de erro de limite do plano Free // A mensagem deve corresponder ao que foi definido no RotasService

      await expect(
        page.locator(`text=Limite de 1 rota atingido para o plano Free.`)
      ).toBeVisible({ timeout: 10000 }); // 8. Fecha o modal/alerta de erro // Dependendo de como o erro é exibido (toast ou alert), fechamos ou cancelamos

      const errorModalOrToast = page.locator('div[role="alert"]').or(rotaModal);
      if (await rotaModal.isVisible()) {
        await rotaModal.getByRole("button", { name: "Cancelar" }).click();
      }
    }); // 2. Segregação de Dados e Bloqueio de Configuração

    await test.step("2.1. Fazer Logout do User B e Login do User A", async () => {
      await page.getByRole("button", { name: "Sair" }).click();

      // [FIX] Wait for logout navigation to complete before calling login.
      // This prevents the login() helper from returning early due to stale URL.
      await page.waitForURL(/\/login/);

      await login(page, USER_A_FREE);
    });

    await test.step("2.2. Verificar Segregação em Demandas", async () => {
        // [FIX] Use page.goto para garantir que a página carregue, 
        // evitando que a UI fique presa no Dashboard visualmente.
        await page.goto(`${BASE_URL}/demandas`);
        
        // Agora esperamos o elemento chave da página
        await page.waitForSelector('button:has-text("Nova Demanda")');

        await expect(
          page.locator(`text=Solicitante Demanda ${DEMANDAS_LIMIT_FREE}`)
        ).toBeVisible();

        await expect(
          page.locator("text=Solicitante Demanda 1")
        ).not.toBeVisible();
      });
  });
});
