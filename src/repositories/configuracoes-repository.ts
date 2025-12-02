import pool from "@/lib/db";

export interface RotaConfig {
    inicio: { lat: number; lng: number };
    fim: { lat: number; lng: number };
}

export const ConfiguracoesRepository = {
    async getRotaConfig(): Promise<RotaConfig | null> {
        const query = `SELECT valor FROM configuracoes WHERE chave = 'padrao_rota'`;
        const res = await pool.query(query);
        return res.rows[0]?.valor || null;
    },

    async updateRotaConfig(config: RotaConfig): Promise<void> {
        const query = `
            INSERT INTO configuracoes (chave, valor, updated_at)
            VALUES ('padrao_rota', $1, NOW())
            ON CONFLICT (chave) 
            DO UPDATE SET valor = $1, updated_at = NOW();
        `;
        await pool.query(query, [JSON.stringify(config)]);
    }
};