import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminDashboard.module.css';

function AdminCreditHistory() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';

  const loadEmployees = async () => {
    const response = await fetch(`${apiBase}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Unable to load employees.');
    setEmployees(payload);
  };

  useEffect(() => {
    if (!token) return;
    loadEmployees().catch((err) => setError(err.message || 'Failed to load employees.'));
  }, [token]);

  const loadLedger = async (employeeId) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Unable to load ledger history.');
    setLedger(payload);
  };

  const handleViewHistory = (employee) => {
    setError('');
    setMessage('');
    setSelectedEmployee(employee);
    loadLedger(employee.id).catch((err) => setError(err.message || 'Failed to load history.'));
  };

  return (
    <div className={styles.adminContent}>
      <div className={styles.cardHeaderRow}>
        <div>
          <p className={styles.eyebrow}>Credit history</p>
          <h2>Employee credit summaries</h2>
          <p className={styles.subtitle}>Browse employee balances and open their ledger history.</p>
        </div>
      </div>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.full_name}</td>
                  <td>{employee.employee_no}</td>
                  <td>{Number(employee.balance || 0).toFixed(1)}</td>
                  <td>{employee.status}</td>
                  <td>
                    <button type="button" className={styles.secondaryButton} onClick={() => handleViewHistory(employee)}>
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedEmployee ? (
        <section className={styles.card}>
          <h3>History for {selectedEmployee.full_name}</h3>
          <p>
            <strong>Employee ID:</strong> {selectedEmployee.employee_no}
          </p>
          <p>
            <strong>Balance:</strong> {Number(selectedEmployee.balance || 0).toFixed(1)} hrs
          </p>

          <div className={styles.history}>
            {ledger.length ? (
              <ul>
                {ledger.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.date}</span>
                    <strong>{Number(entry.hours).toFixed(1)} hrs</strong>
                    <span>{entry.remarks || '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No history records available.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default AdminCreditHistory;
