import { Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Pricing from "./pages/Pricing.jsx";
import Success from "./pages/Success.jsx";
import Cancel from "./pages/Cancel.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

/* Layout pour les pages publiques/marketing : elles partagent la Navbar globale. */
function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
      </Route>

      {/* Le Dashboard a déjà son propre header + sidebar : pas de Navbar globale ici. */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Idem pour le panneau admin — sa propre mise en page, pas de Navbar globale.
          AdminDashboard.jsx gère lui-même la redirection si l'utilisateur n'est
          pas connecté ou n'a pas le rôle "admin". */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}