import http from "k6/http";
import { check, group, sleep } from "k6";

// Variável de controle para o ambiente isolado
const BASE_URL = "http://localhost:3001";

// Cenário: Carga constante de 10 usuários virtuais por 30 segundos
export const options = {
  scenarios: {
    load_test: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      gracefulStop: "5s",
    },
  },
  // Foco na inserção em lote: Aumentamos o limite de 95% para 2 segundos.
  // O ideal é testar e reduzir esse valor após as otimizações.
  thresholds: {
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<2000"], // 95% das requisições devem ser < 2s
    "http_req_duration{group:03_CreateRoute}": ["p(95)<3000"], // Rota pode ser mais lenta (otimização Google Maps API)
  },
};

// Dados de Demanda Fixos para a Rota (com coordenadas válidas)
const FIXED_DEMANDS_DATA = [
  { name: "Demanda 1", lat: -29.853, lng: -51.178 }, // Esteio/RS
  { name: "Demanda 2", lat: -29.99, lng: -51.09 }, // Canoas/RS
  { name: "Demanda 3", lat: -30.038, lng: -51.198 }, // Porto Alegre/RS
  { name: "Demanda 4", lat: -30.045, lng: -51.135 }, // Porto Alegre/RS
  { name: "Demanda 5", lat: -30.027, lng: -51.218 }, // Porto Alegre/RS
];

export default function () {
  let authToken;
  let userId;
  let userName;

  // Gera dados únicos para a sessão atual
  const vu_iter = `${__VU}_${__ITER}`;
  const email = `test.admin.${vu_iter}@test.com`;
  const password = "senhaAdminTeste";
  userName = `Admin Teste ${vu_iter}`;

  // Armazena os IDs das demandas criadas nesta iteração
  let createdDemandIds = [];

  // --- 1. SETUP: CRIAR USUÁRIO ADMIN (Requer o POST /api/admin/users) ---
  group("01_Setup_CreateAdmin", function () {
    const urlAdminSignup = `${BASE_URL}/api/admin/users`;
    const payload = JSON.stringify({
      name: userName,
      email: email,
      password: password,
      role: "admin", // Criamos um admin para garantir permissões totais
    });
    const params = {
      headers: { "Content-Type": "application/json" },
    };
    // Como o POST /api/admin/users requer autenticação de outro admin,
    // E o teste é self-sufficient, faremos um POST simples de signup
    // e usaremos as credenciais para logar, pressupondo que o usuário comum
    // tem acesso a criar demandas e rotas (o que é o caso nos seus endpoints).
    const res = http.post(`${BASE_URL}/api/auth/signup`, payload, params);

    check(res, { "status signup 201": (r) => r.status === 201 });
  });

  // --- 2. LOGIN: AUTENTICAR E OBTER SESSÃO (Cookies) ---
  group("02_Setup_Login", function () {
    const urlLogin = `${BASE_URL}/api/mobile-login`; // Mais fácil de obter sessão para o k6
    const payload = JSON.stringify({ email, password });
    const params = {
      headers: { "Content-Type": "application/json" },
    };
    const res = http.post(urlLogin, payload, params);

    check(res, { "status login 200": (r) => r.status === 200 });

    if (res.status === 200) {
      userId = res.json().user.id;
      // O k6 lida com cookies automaticamente, mas para garantir
      // que a próxima requisição utilize a sessão, não precisamos fazer nada
      // pois o res.cookies contém os tokens necessários (next-auth.session-token).
    } else {
      console.error(`Falha no Login (${vu_iter}): ${res.body}`);
      return; // Interrompe o VU se o login falhar
    }
  });

  // --- 3. CRIAR DEMANDAS (Medida de Inserção de Dados) ---
  group("03_CreateDemands", function () {
    const urlDemandas = `${BASE_URL}/api/demandas`;

    // Loop para criar várias demandas (simulando um lote)
    for (let i = 0; i < FIXED_DEMANDS_DATA.length; i++) {
      const demandData = FIXED_DEMANDS_DATA[i];
      const uniquePhone = `5199876${vu_iter}${i}`.substring(0, 10);

      // CORREÇÃO AQUI: Criar um protocolo absolutamente único usando VU, ITER e Loop Index
      const uniqueProtocolo = `DEM-${vu_iter}-${i}`;

      const payload = JSON.stringify({
        protocolo: uniqueProtocolo, // <--- ENVIAMOS O PROTOCOLO ÚNICO
        nome_solicitante: `Solicitante ${demandData.name}`,
        telefone_solicitante: uniquePhone,
        email_solicitante: `solicitante.${vu_iter}.${i}@demanda.com`,
        cep: "93000000",
        logradouro: `Rua do Teste ${vu_iter}`,
        numero: "100",
        tipo_demanda: "Poda",
        descricao: `Demanda de Poda Rota ${vu_iter} - Ponto ${i + 1}`,
        coordinates: [demandData.lat, demandData.lng],
      });

      const params = {
        headers: { "Content-Type": "application/json" },
      };

      const res = http.post(urlDemandas, payload, params);

      check(res, {
        [`status create ${i + 1} 201`]: (r) => r.status === 201,
      });

      if (res.status === 201) {
        // Guarda o ID da demanda recém-criada para uso na rota
        const demandId = res.json().demanda.id;
        if (demandId) {
          createdDemandIds.push(demandId);
        }
      } else {
        console.error(
          `Falha na criação da Demanda ${i + 1} (${vu_iter}): ${res.status} - ${
            res.body
          }`
        );
      }
    }
  });

  // Se não conseguirmos criar as demandas, paramos aqui
  if (createdDemandIds.length < FIXED_DEMANDS_DATA.length) {
    console.error(
      `Apenas ${createdDemandIds.length}/${FIXED_DEMANDS_DATA.length} demandas criadas. Interrompendo rota.`
    );
    return;
  }

  // Espera antes de criar a rota para garantir que as gravações no banco foram finalizadas.
  sleep(1);

  // --- 4. CRIAR ROTA (Medida de Agregação/Bulk) ---
  group("04_CreateRoute", function () {
    const urlRotas = `${BASE_URL}/api/rotas`;

    // Mapeia os IDs para o formato esperado pelo endpoint POST /api/rotas: { id: number }[]
    const demandsForRoute = createdDemandIds.map((id) => ({ id: id }));

    const payload = JSON.stringify({
      nome: `Rota Performance ${vu_iter}`,
      responsavel: userName, // O nome do usuário logado é usado como responsável
      demandas: demandsForRoute,
    });

    const params = {
      headers: { "Content-Type": "application/json" },
    };

    const res = http.post(urlRotas, payload, params);

    check(res, {
      "status create route 201": (r) => r.status === 201,
    });

    if (res.status !== 201) {
      console.error(
        `Falha na Criação da Rota (${vu_iter}): ${res.status} - ${res.body}`
      );
    }
  });

  // Intervalo de 2 segundos entre o ciclo de um VU e o próximo
  sleep(2);
}
