import { useState } from "react";
import AdminSidebar from "../components/AdminNavbar";

function AdminLayout({ children }) {

    const [sidebarAbierto, setSidebarAbierto] = useState(true);

    return (
        <div className="admin-layout">

            <AdminSidebar
                abierto={sidebarAbierto}
                setAbierto={setSidebarAbierto}
            />

            <main className="admin-main">
                {children}
            </main>

        </div>
    );
}

export default AdminLayout;