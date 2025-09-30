interface SidebarProps {
  onNavigate: (page: 'demandas' | 'rotas' | 'gerenciar' | 'relatorios') => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    return (
       <aside 
            className="w-56 h-full p-4 text-white"
            style={{ backgroundColor: '#714b42' }}
        >
            <h2 className="text-xl font-bold mb-2">Sidebar</h2>
            <ul>
                <li>
                    <a onClick={() => onNavigate('demandas')} className="text-stone-300 hover:text-white">
                        Demandas
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('rotas')} className="text-stone-300 hover:text-white">
                        Rotas
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('gerenciar')} className="text-stone-300 hover:text-white">
                        Gerenciar
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('relatorios')} className="text-stone-300 hover:text-white">
                        Relatórios
                    </a>
                </li>
            </ul>
        </aside>
    );
}
