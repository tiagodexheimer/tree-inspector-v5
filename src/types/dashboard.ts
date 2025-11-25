export interface DashboardKPIs {
    totalDemandas: number;
    totalRotas: number;
    totalPendentes: number;
    totalConcluidas: number;
}

export interface StatusDistribution {
    name: string;
    value: number;
    color: string;
    // Adicione esta linha abaixo para satisfazer o Recharts:
    [key: string]: any; 
}

export interface DashboardData {
    kpis: DashboardKPIs;
    statusDistribution: StatusDistribution[];
}