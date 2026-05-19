import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="container">
      <nav className="topnav">
        <NavLink to="/" end>Today</NavLink>
        <NavLink to="/week">This week</NavLink>
        <NavLink to="/dreams">Dream jobs</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
