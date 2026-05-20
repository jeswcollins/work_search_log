import { NavLink, Link, Outlet } from 'react-router-dom';
import { DocumentIcon, BriefcaseIcon, UsersIcon } from './components/Icons.jsx';

export default function App() {
  return (
    <div className="container">
      <nav className="topnav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <DocumentIcon size={16} />
          </span>
          <span className="brand-text">Work Search Log</span>
        </Link>
        <div className="topnav-links">
          <NavLink to="/" end>Today's Log</NavLink>
          <NavLink to="/week">Week's Log</NavLink>
          <NavLink to="/network">
            <UsersIcon size={16} className="nav-icon network" />
            Network List
          </NavLink>
          <NavLink to="/jobs">
            <BriefcaseIcon size={16} className="nav-icon job" />
            Job List
          </NavLink>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
