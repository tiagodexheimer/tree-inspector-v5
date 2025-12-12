// src/repositories/formularios-repository.ts
import pool from "@/lib/db";
import { FormulariosPersistence, CreateFormularioDTO, UpdateFormularioDTO } from "@/types/formularios";

const BASE_FIELDS = `id, organization_id, nome, descricao, definicao_campos, created_at, updated_at`;

export const FormulariosRepository = {

    async countByOrganization(organizationId: number): Promise<number> {
        try {
            const result = await pool.query(
                "SELECT COUNT(*) FROM formularios WHERE organization_id = $1",
                [organizationId]
            );
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            console.error("Erro no FormulariosRepository.countByOrganization:", error);
            throw new Error("Falha ao contar formulários.");
        }
    },
    
    async listByOrganization(organizationId: number): Promise<FormulariosPersistence[]> {
        try {
            const query = `
                SELECT 
                    f.id, 
                    f.organization_id, 
                    f.nome, 
                    f.descricao, 
                    f.definicao_campos, 
                    f.created_at, 
                    f.updated_at,
                    STRING_AGG(dt.nome, ', ') AS tipo_demanda_associada
                FROM 
                    formularios f
                LEFT JOIN 
                    demandas_tipos_formularios dtf ON f.id = dtf.id_formulario
                LEFT JOIN 
                    demandas_tipos dt ON dtf.id_tipo_demanda = dt.id
                WHERE 
                    f.organization_id = $1 OR f.organization_id IS NULL
                GROUP BY 
                    f.id, f.organization_id, f.nome, f.descricao, f.definicao_campos, f.created_at, f.updated_at
                ORDER BY 
                    f.nome;
            `;
            const result = await pool.query(query, [organizationId]);
            return result.rows as FormulariosPersistence[];
        } catch (error) {
            console.error("Erro no FormulariosRepository.listByOrganization:", error);
            throw new Error("Falha ao listar formulários.");
        }
    },
    
    async findById(id: number): Promise<FormulariosPersistence | null> {
        try {
            const query = `
                SELECT ${BASE_FIELDS}
                FROM formularios
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rows[0] as FormulariosPersistence || null;
        } catch (error) {
            console.error("Erro no FormulariosRepository.findById:", error);
            throw new Error("Falha ao buscar formulário por ID.");
        }
    },

    async create(data: CreateFormularioDTO): Promise<FormulariosPersistence> {
        try {
            // [FIX] Ensure definicao_campos is properly formatted.
            // If it's already an object/array, pg driver handles it for JSONB columns.
            // If it's a string, we pass it as is.
            const camposValue = typeof data.definicao_campos === 'string' 
                ? data.definicao_campos 
                : JSON.stringify(data.definicao_campos);

            const query = `
                INSERT INTO formularios (organization_id, nome, descricao, definicao_campos)
                VALUES ($1, $2, $3, $4)
                RETURNING ${BASE_FIELDS}
            `;
            const result = await pool.query(query, [
                data.organization_id,
                data.nome,
                data.descricao || null,
                camposValue // Passed as stringified JSON
            ]);
            return result.rows[0] as FormulariosPersistence;
        } catch (error) {
            console.error("Erro no FormulariosRepository.create:", error);
            throw new Error("Falha ao criar formulário.");
        }
    },
    
    async update(id: number, organizationId: number, data: UpdateFormularioDTO): Promise<FormulariosPersistence | null> {
        try {
            const fields: string[] = [];
            const values: (string | number | null)[] = [];
            let paramIndex = 1;

            if (data.nome) {
                fields.push(`nome = $${paramIndex++}`);
                values.push(data.nome);
            }
            if (data.descricao !== undefined) {
                fields.push(`descricao = $${paramIndex++}`);
                values.push(data.descricao);
            }
            if (data.definicao_campos) {
                fields.push(`definicao_campos = $${paramIndex++}`);
                // [FIX] Apply same fix for update
                const camposValue = typeof data.definicao_campos === 'string' 
                    ? data.definicao_campos 
                    : JSON.stringify(data.definicao_campos);
                values.push(camposValue);
            }

            if (fields.length === 0) {
                 return this.findById(id); 
            }

            const query = `
                UPDATE formularios 
                SET ${fields.join(", ")}, updated_at = NOW() 
                WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
                RETURNING ${BASE_FIELDS}
            `;
            values.push(id, organizationId);
            
            const result = await pool.query(query, values);
            return result.rows[0] as FormulariosPersistence || null;

        } catch (error) {
            console.error("Erro no FormulariosRepository.update:", error);
            throw new Error("Falha ao atualizar formulário.");
        }
    },
    
    async delete(id: number, organizationId: number): Promise<boolean> {
        try {
            const result = await pool.query(
                "DELETE FROM formularios WHERE id = $1 AND organization_id = $2 RETURNING id",
                [id, organizationId]
            );
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            console.error("Erro no FormulariosRepository.delete:", error);
            throw new Error("Falha ao deletar formulário.");
        }
    }
};