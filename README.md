## 🚀 Testes e Qualidade de Código

Para garantir a estabilidade e a performance da aplicação antes do deploy, siga os procedimentos de teste que cobrem as unidades de código, a integração com o banco e o fluxo completo do usuário. É essencial que o container de banco de **TESTES** (`db_test` - porta 5433) esteja ativo.

### 1. Configuração do Ambiente de Testes (Docker)

Certifique-se de que o serviço de banco de dados de testes esteja rodando em modo isolado:

```bash
docker compose up -d db_test
2. Testes de Unidade e Integração (Jest)
Estes comandos validam a lógica dos serviços e repositórios, garantindo que as regras de negócio e a comunicação com o banco funcionem isoladamente.

Executar todos os testes:

Bash

npm test
Gerar Relatório de Cobertura:

Bash

npm run test:coverage
3. Testes End-to-End (E2E - Playwright)
Os testes E2E simulam o fluxo real do usuário no navegador, desde o login até a criação de demandas.

Inicialize o Schema de Testes (Obrigatório para o Playwright):

Bash

npm run setup:db:test
Execute os Testes:

Bash

npx playwright test
4. Testes de Performance (k6)
Verifique o desempenho da API sob carga, focando na latência das operações de autenticação e criação de recursos.

Inicie o Servidor Isolado de Performance (em um terminal separado):

Bash

npm run perf:server
Execute o Teste de Carga: (Certifique-se de que a BASE_URL no load-test.js esteja configurada para http://localhost:3001).

Bash

k6 run tests/performance/load-test.js
5. Qualidade de Código (Lint)
Verifique se há erros de sintaxe e estilo antes do commit final.

Bash

npm run lint