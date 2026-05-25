import AdminNavbar from "../components/AdminNavbar";

function AdminLayout({ children }) {

    return (
        <div>

            <AdminNavbar />

            {children}

        </div>
    );
}

export default AdminLayout;