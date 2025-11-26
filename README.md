## 🧪 Testes e Qualidade de Código

Para garantir a estabilidade e a performance da aplicação antes do deploy, siga os procedimentos de teste abaixo. É essencial que o container de banco de dados de **TESTES** (`db_test` - porta 5433) esteja ativo.

### 1. Configuração do Ambiente de Testes (Docker)

Certifique-se de que o serviço de banco de dados de testes esteja rodando em modo isolado:

```bash
docker compose up -d db_test