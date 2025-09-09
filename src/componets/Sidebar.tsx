export default function Sidebar() {
    return (
        <aside className="h-full w-50 p-4 bg-amber-900 text-white">
            <h2 className="text-xl font-bold mb-2">Sidebar</h2>
            <ul>
                <li>
                    <a href="#" className="text-gray-400 hover:text-white">
                        Link 1
                    </a>
                </li>
                <li>
                    <a href="#" className="text-gray-400 hover:text-white">
                        Link 2
                    </a>
                </li>
                <li>
                    <a href="#" className="text-gray-400 hover:text-white">
                        Link 3
                    </a>
                </li>
            </ul>
        </aside> 
    );
}