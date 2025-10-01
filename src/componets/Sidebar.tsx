import Link from 'next/link';

export default function Sidebar() {
    return (
       <aside 
            className="w-56 h-full p-4 text-white"
            style={{ backgroundColor: '#714b42' }}
        >
            <h2 className="text-xl font-bold mb-2">Sidebar</h2>
            <ul>
                <li>
                    <Link href="/demandas" className="text-stone-300 hover:text-white">
                        Demandas
                    </Link>
                </li>
                <li>
                    <Link href="/rotas" className="text-stone-300 hover:text-white">
                        Rotas
                    </Link>
                </li>
                <li>
                    <Link href="/gerenciar" className="text-stone-300 hover:text-white">
                        Gerenciar
                    </Link>
                </li>
                <li>
                    <Link href="/relatorios" className="text-stone-300 hover:text-white">
                        Relatórios
                    </Link>
                </li>
            </ul>
        </aside>
    );
}