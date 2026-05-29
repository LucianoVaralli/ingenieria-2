import AdminSidebar from "../components/AdminNavbar";

function AdminLayout({ children }) {
    return (
        <div className="admin-layout">
            <AdminSidebar />
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

export default AdminLayout;
