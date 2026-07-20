import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const { token } = useAuth();

  return (
    <div className={styles.adminShell}>
      <div className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>Admin</p>
          <h1>Employee administration</h1>
          <p className={styles.subtitle}>Manage accounts, credits, roles, and approvals from one place.</p>
        </div>
        <div>
          <NavLink to="search" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
            Search
          </NavLink>
          <NavLink to="history" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
            Credit History
          </NavLink>
          <NavLink to="manage" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
            Employee Management
          </NavLink>
          <Link to="/dashboard" className={styles.linkButton}>
            Back to dashboard
          </Link>
        </div>
      </div>

      <section className={styles.adminPanel}>
        <Outlet />
      </section>
    </div>
  );
}

export default AdminDashboard;
