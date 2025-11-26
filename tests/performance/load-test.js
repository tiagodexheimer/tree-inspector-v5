import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Variável para garantir que cada teste usa um email diferente
const uniqueId = new Counter('unique_id');

// Configurações do teste
export const options = {
    // Cenário: Carga constante de 20 usuários por 60 segundos
    scenarios: {
        load: {
            executor: 'constant-vus',
            vus: 20, // 20 Usuários Virtuais (VUs) simultâneos
            duration: '60s', // Duração total do teste
            gracefulStop: '5s',
        },
    },
    // Limites de performance (SLOs) para o teste
    thresholds: {
        // Taxa de erros HTTP deve ser menor que 1%
        'checks': ['rate>0.99'], 
        // 95% das requisições devem ser mais rápidas que 1.5 segundos (1500ms)
        'http_req_duration': ['p(95)<1500'],
    },
};

// URL base, adaptada para o ambiente de desenvolvimento local
// Se for testar a Vercel, use a URL pública, ex: 'https://meuprojeto.vercel.app'
const BASE_URL = 'http://localhost:3001'; 

export default function () {
    // Gera um email único para cada iteração do VU (evita conflito de email no banco)
    const iteration = uniqueId.add(1);
    const email = `test.user.${__VU}_${__ITER}@test.com`; 
    const password = 'senhaSegura1234';

    // --- 1. CRIAR USUÁRIO (SIGNUP) ---
    group('01_Signup_CreateUser', function () {
        const urlSignup = `${BASE_URL}/api/auth/signup`; // Endpoint de criação
        const payload = JSON.stringify({
            name: `User ${__VU}-${iteration}`,
            email: email,
            password: password,
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const res = http.post(urlSignup, payload, params);

        check(res, {
            'status é 201 (Created)': (r) => r.status === 201,
            'corpo contém a propriedade id': (r) => r.json() && r.json().id !== undefined,
        });
        
        if (res.status !== 201) {
             console.error(`Erro ao criar usuário: ${res.status} - ${res.body}`);
        }
    });

    // Garante que o servidor tenha tempo para processar o hash antes do login
    sleep(1);

    // --- 2. LOGIN (COMPARE HASH) ---
    group('02_Login_Authenticate', function () {
        // Usaremos o endpoint /api/mobile-login pois ele simula a autenticação direta,
        // garantindo que a operação de 'bcrypt.compare' (a mais pesada) seja testada.
        const urlLogin = `${BASE_URL}/api/mobile-login`;
        const payload = JSON.stringify({
            email: email,
            password: password,
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const res = http.post(urlLogin, payload, params);

        check(res, {
            'status é 200 (OK)': (r) => r.status === 200,
            'sucesso no login': (r) => r.json() && r.json().success === true,
        });
        
        if (res.status !== 200) {
            console.error(`Erro ao logar usuário: ${res.status} - ${res.body}`);
        }
    });

    // Intervalo entre as iterações de cada VU
    sleep(2);
}