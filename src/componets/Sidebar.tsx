interface SidebarProps {
  onNavigate: (page: 'demandas' | 'rotas' | 'gerenciar' | 'relatorios') => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    return (
        <aside className=" w-56 h-full p-4 bg-amber-900 text-white" >
            <h2 className="text-xl font-bold mb-2">Sidebar</h2>
            <ul>
                <li>
                    <a onClick={() => onNavigate('demandas')} className="text-gray-400 hover:text-white">
                        Demandas
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('rotas')} className="text-gray-400 hover:text-white">
                        Rotas
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('gerenciar')} className="text-gray-400 hover:text-white">
                        Gerenciar
                    </a>
                </li>
                <li>
                    <a onClick={() => onNavigate('relatorios')} className="text-gray-400 hover:text-white">
                        Relatórios
                    </a>
                </li>
            </ul>
        </aside>
    );
}
