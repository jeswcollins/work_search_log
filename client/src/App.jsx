import { NavLink, Link, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="container">
      <nav className="topnav">
        <Link to="/" className="brand">
          <span className="brand-mark">⬢</span>
          <span className="brand-text">Work Search Log</span>
        </Link>
        <div className="topnav-links">
          <NavLink to="/" end>Today's Log</NavLink>
          <NavLink to="/week">Week's Log</NavLink>
          <NavLink to="/jobs">Job List</NavLink>
          <NavLink to="/network">Network List</NavLink>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
