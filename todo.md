# Roteiro de Correção e Melhorias do Sistema de Organização

Este documento descreve os passos para corrigir os problemas de visualização de dados de outras organizações e estabilizar o módulo de gerenciamento da sua aplicação.

## Passo 1: Corrigir a Fuga de Dados na Lista de Membros (Causa Principal)

**Problema:** A consulta que busca os membros da organização não está filtrando pelo `organizationId` do usuário autenticado, fazendo com que usuários de todas as organizações sejam listados.

### 1.1. Identificar a API de Listagem de Usuários
   - **Ação:** Investigue o arquivo `src/components/Organizacao/OrganizationMembersList.tsx`.
   - **Objetivo:** Encontre a URL da API que o componente utiliza para buscar a lista de membros (ex: `fetch('/api/users')`).

### 1.2. Proteger o Endpoint da API
   - **Ação:** No arquivo da rota da API encontrado no passo anterior (provavelmente em `src/app/api/users/route.ts` ou similar), implemente a lógica de segurança.
   - **Objetivo:**
     - Obtenha a sessão do usuário usando a função `auth()`.
     - Extraia o `organizationId` do objeto da sessão. Se não houver sessão ou `organizationId`, retorne um erro de não autorizado (401).

### 1.3. Atualizar o Repositório de Usuários
   - **Ação:** Modifique a função em `src/repositories/user-repository.ts` que busca os usuários no banco de dados.
   - **Objetivo:** Faça com que esta função aceite o `organizationId` como um parâmetro.

### 1.4. Aplicar o Filtro na Consulta SQL
   - **Ação:** Dentro da função do repositório modificada, adicione uma cláusula `WHERE` na sua consulta SQL.
   - **Objetivo:** Filtrar os resultados para que apenas os usuários pertencentes ao `organizationId` fornecido sejam retornados.
   - **Exemplo (SQL):** `SELECT * FROM users WHERE organization_id = $1;`

---

## Passo 2: Estabilizar o Gerenciamento de Convites

**Problema:** O arquivo `src/services/invite-service.ts` está estruturalmente quebrado, com definições duplicadas, o que pode causar erros inesperados no ambiente de produção. Além disso, precisamos garantir que a listagem de convites está segura.

### 2.1. Refatorar o Serviço de Convites
   - **Ação:** Abra o arquivo `src/services/invite-service.ts`.
   - **Objetivo:** Remova o código duplicado e organize-o para que exista apenas uma definição da classe `InviteService`, seguindo o padrão do restante do seu projeto.

### 2.2. Validar a API de Convites
   - **Ação:** Revise a rota `src/app/api/convites/route.ts` e o repositório `src/repositories/invite-repository.ts`.
   - **Objetivo:** Confirme que o `organizationId` da sessão do usuário está sendo usado para filtrar a busca por convites. A investigação inicial indicou que isso está correto, mas é uma boa prática validar novamente após a refatoração do serviço.

### 2.3. Revisar o Frontend de Convites
   - **Ação:** Inspecione o componente `src/components/Organizacao/InviteManagement.tsx`.
   - **Objetivo:** Garanta que ele está funcionando conforme o esperado após as correções, exibindo apenas os convites pendentes da organização correta.

---

## Passo 3: Revisão Geral e Testes

### 3.1. Validar a Função de "Alterar Nome da Organização"
   - **Ação:** Revise o fluxo de alteração de nome, desde o componente `src/components/Organizacao/OrgNameEditor.tsx` até o serviço e repositório correspondente.
   - **Objetivo:** Garantir que a lógica de permissão está correta e que um usuário só pode alterar o nome da sua própria organização.

### 3.2. Criar e/ou Atualizar Testes
   - **Ação:** Adicione testes automatizados (unitários ou de integração) para as funcionalidades corrigidas.
   - **Objetivo:**
     - Crie um teste para a API de listagem de usuários que simule dois usuários de organizações diferentes e garanta que cada um vê apenas os membros da sua própria organização.
     - Crie um teste similar para a listagem de convites.
     - Isso previnirá que esses problemas retornem no futuro.

### 3.3. Teste Manual Completo
   - **Ação:** Execute um teste de ponta a ponta.
   - **Objetivo:**
     - Crie duas organizações de teste com usuários diferentes.
     - Faça login em cada uma e confirme que a lista de membros, os convites e as configurações de uma não são visíveis para a outra.
