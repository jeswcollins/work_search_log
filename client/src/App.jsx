import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <>
      <nav className="topnav">
        <NavLink to="/" end>Today</NavLink>
        <NavLink to="/week">This week</NavLink>
        <NavLink to="/dreams">Dream jobs</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
