export default function Body() {
    // A tag <main> foi trocada por uma <div>
    return (
        <div className="flex w-full text-black p-4" style={{ background: "#F5F5DC" }}>
            <div>
                <h2>Main Content</h2>
                <p>This is the main content area.</p>
            </div>
        </div>
    );
}