// src/services/user-management-service.ts

import { UserRepository, UserPersistence, CreateUserRepoDTO } from "@/repositories/user-repository";
import { OrganizationRepository } from "@/repositories/organization-repository";
import pool from "@/lib/db"; // Necessário para gerenciar transações
import { hash } from "@/lib/auth"; // Assumindo que você tem uma função hash
import { OrganizationRole } from "@/types/organization-types"; // Importando o tipo da role

// Interface para entrada do serviço de registro
interface RegisterUserInput {
    name?: string;
    email: string;
    password: string;
    planType: string; // Ex: 'free', 'basic', 'pro'
}

export const userManagementService = {

    /**
     * [CORE] Registra um novo usuário no sistema, criando sua organização
     * e o definindo como OWNER em uma transação atômica.
     */
    async registerUser(input: RegisterUserInput): Promise<UserPersistence> {
        const client = await pool.connect();
        
        try {
            await client.query("BEGIN"); // Inicia a transação
            
            // 0. Checagem inicial: O email já existe?
            const existingUser = await UserRepository.findByEmail(input.email);
            if (existingUser) {
                throw new Error("Email já cadastrado.");
            }

            // 1. Criar a Organização
            const organizationName = `${input.name || 'Novo Usuário'}'s Org`;
            const newOrg = await OrganizationRepository.createOrganization(organizationName, input.planType, client); 

            // 2. Criar o Usuário (Owner)
            const passwordHash = await hash(input.password);
            
            const newUser = await UserRepository.create({
                name: input.name,
                email: input.email.toLowerCase(),
                passwordHash,
                organizationId: newOrg.id,
                organizationRole: 'owner', // Define o papel na sessão (mas a persistência é a próxima etapa)
                role: input.planType.toLowerCase() // Role do sistema
            }, client); // Passa o client para a transação

            // 3. REGISTRO CRÍTICO: Inserir o Owner na tabela de membros
            // Isso garante que ele apareça nas listas e tenha o papel 'owner' definido.
            await UserRepository.insertOrganizationMember(
                newOrg.id,
                newUser.id,
                'owner',
                client
            ); // Passa o client para a transação

            await client.query("COMMIT"); // Confirma a transação
            return newUser;

        } catch (error) {
            await client.query("ROLLBACK"); // Desfaz se houver erro
            console.error("[Service RegisterUser] Erro na transação:", error);
            throw error;
        } finally {
            client.release();
        }
    },
    
    /**
     * Lista todos os membros de uma organização (usado na página /organizacao).
     */
    async listOrganizationMembers(organizationId: number): Promise<UserPersistence[]> {
        // Assume que UserRepository.findAllByOrganization já faz o JOIN com organization_members
        return UserRepository.findAllByOrganization(organizationId);
    },

    /**
     * Permite que um usuário saia da sua organização atual.
     * Regra: O DONO não pode sair. Membro convidado é removido das duas tabelas.
     */
    async leaveOrganization(userId: string, organizationId: number): Promise<void> {
        
        // 1. Obter o usuário para checar a role na organização (Assumimos que findById faz o join e traz organizationRole)
        const user = await UserRepository.findById(userId);

        if (!user || user.organizationId !== organizationId) {
            throw new Error("Usuário não encontrado na organização especificada.");
        }

        const userOrgRole = user.organizationRole as OrganizationRole | undefined;

        // 2. Checagem de Dono (Owner)
        if (userOrgRole === 'owner') {
            const memberCount = await UserRepository.countMembersInOrganization(organizationId);

            if (memberCount >= 2) {
                // Se há outros membros, o dono deve delegar/transferir antes de sair.
                throw new Error("Você é o Dono da organização. Transfira a posse para outro Administrador antes de sair.");
            } else {
                // Se for o único membro (e dono), ele não pode abandonar a organização órfã.
                throw new Error("Você não pode sair da organização, pois é o Dono e único membro restante. Considere deletar a organização, se necessário.");
            }
        }
        
        // 3. Ação de Saída para Membros Convidados (não-Owners)
        
        const defaultRole = 'viewer'; // Papel padrão para usuários sem organização principal

        // CRÍTICO: Remover o usuário das duas tabelas de vínculo.
        
        // A. Remove o papel na organização (organization_members)
        await UserRepository.removeUserFromOrganizationMembers(userId, organizationId);
        
        // B. Remove o link principal na tabela users e redefine o papel do sistema
        await UserRepository.updateOrganizationAndRole(userId, null, defaultRole);
    },
    
    // --------------------------------------------------------------------------------------------------
    // Métodos Adicionais (Se necessários, como os do CRUD de Super Admin)
    // --------------------------------------------------------------------------------------------------
    
    /**
     * Criação de Usuário Manual (Geralmente para Super Admin/CRUD manual, não transacional com org).
     * Nota: O Super Admin deve vincular a OrganizationId manualmente, se necessário.
     */
    async createUser(data: Omit<CreateUserRepoDTO, 'passwordHash'> & { password: string }): Promise<UserPersistence> {
        // Implemente aqui a lógica de CRUD de Super Admin (hash de senha, checagem de email, etc.)
        const passwordHash = await hash(data.password);
        
        // Assumindo que data.role é a role do sistema ('admin' | 'paid_user' | 'free_user')
        const newUser = await UserRepository.create({
            name: data.name,
            email: data.email,
            passwordHash: passwordHash,
            organizationId: data.organizationId, // Pode ser nulo
            role: data.role.toLowerCase() 
        });

        // Se o Super Admin criar um usuário sem organizationId, ele não estará em nenhuma organização.
        
        return newUser;
    },
    
    // Outros métodos como deleteUser, findById, etc.
};