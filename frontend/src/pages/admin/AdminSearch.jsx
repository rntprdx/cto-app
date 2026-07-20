import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminDashboard.module.css';

function AdminSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [deduction, setDeduction] = useState({ hours: '', remarks: '' });
  const [credit, setCredit] = useState({ hours: '', remarks: '' });
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

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees;
    return employees.filter((employee) =>
      employee.employee_no.toLowerCase().includes(normalized) ||
      employee.full_name.toLowerCase().includes(normalized)
    );
  }, [employees, query]);

  const fetchLedger = async (employeeId) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Unable to load ledger.');
    setLedger(payload);
  };

  useEffect(() => {
    if (!selectedEmployee || !token) {
      setLedger([]);
      return;
    }
    fetchLedger(selectedEmployee.id).catch((err) => setError(err.message || 'Failed to load ledger.'));
  }, [selectedEmployee, token]);

  const handleSelectEmployee = (employee) => {
    setError('');
    setMessage('');
    setSelectedEmployee(employee);
    setQuery(employee.employee_no);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    const found = employees.find((employee) => employee.employee_no.toLowerCase() === normalized);
    if (!found) {
      setError('No employee found with that ID.');
      setSelectedEmployee(null);
      setLedger([]);
      return;
    }
    handleSelectEmployee(found);
  };

  const handleDeduct = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    setError('');
    setMessage('');

    const response = await fetch(`${apiBase}/api/admin/users/${selectedEmployee.id}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hours: Number(deduction.hours), remarks: deduction.remarks }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to deduct credit.');
      return;
    }

    setMessage(`Deducted ${payload.hours} hour(s) from ${selectedEmployee.full_name}.`);
    setDeduction({ hours: '', remarks: '' });
    fetchLedger(selectedEmployee.id).catch((err) => setError(err.message || 'Failed to refresh ledger.'));
    loadEmployees().catch(() => {});
  };

  const handleCredit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    setError('');
    setMessage('');

    const response = await fetch(`${apiBase}/api/admin/users/${selectedEmployee.id}/credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hours: Number(credit.hours), remarks: credit.remarks }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to add credit.');
      return;
    }

    setMessage(`Added ${payload.hours} hour(s) to ${selectedEmployee.full_name}.`);
    setCredit({ hours: '', remarks: '' });
    fetchLedger(selectedEmployee.id).catch((err) => setError(err.message || 'Failed to refresh ledger.'));
    loadEmployees().catch(() => {});
  };

  return (
    <div className={styles.adminContent}>
      <div className={styles.cardHeaderRow}>
        <div>
          <p className={styles.eyebrow}>Search employee</p>
          <h2>Find an employee by ID</h2>
          <p className={styles.subtitle}>Enter an employee ID, select the account, and manage credits.</p>
        </div>
      </div>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.card}>
        <form className={styles.form} onSubmit={handleSearchSubmit}>
          <label>
            Employee ID
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by employee ID"
              required
            />
          </label>
          <button type="submit" className={styles.primaryButton}>Search</button>
        </form>

        {query && filteredEmployees.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.full_name}</td>
                    <td>{employee.employee_no}</td>
                    <td>{employee.status}</td>
                    <td>{Number(employee.balance || 0).toFixed(1)}</td>
                    <td>
                      <button type="button" className={styles.secondaryButton} onClick={() => handleSelectEmployee(employee)}>
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {selectedEmployee ? (
        <section className={styles.card}>
          <h3>Credit summary for {selectedEmployee.full_name}</h3>
          <p>
            <strong>Employee ID:</strong> {selectedEmployee.employee_no}
          </p>
          <p>
            <strong>Balance:</strong> {Number(selectedEmployee.balance || 0).toFixed(1)} hrs
          </p>
          <p>
            <strong>Position:</strong> {selectedEmployee.position}
          </p>

          <div className={styles.inlineActions}>
            <form className={styles.form} onSubmit={handleCredit}>
              <h4>Add credit</h4>
              <label>
                Hours
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={credit.hours}
                  onChange={(event) => setCredit((prev) => ({ ...prev, hours: event.target.value }))}
                  required
                />
              </label>
              <label>
                Remarks
                <input
                  value={credit.remarks}
                  onChange={(event) => setCredit((prev) => ({ ...prev, remarks: event.target.value }))}
                  placeholder="e.g. overtime approved"
                />
              </label>
              <button type="submit" className={styles.primaryButton}>Add credit</button>
            </form>

            <form className={styles.form} onSubmit={handleDeduct}>
              <h4>Deduct credit</h4>
              <label>
                Hours
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={deduction.hours}
                  onChange={(event) => setDeduction((prev) => ({ ...prev, hours: event.target.value }))}
                  required
                />
              </label>
              <label>
                Remarks
                <input
                  value={deduction.remarks}
                  onChange={(event) => setDeduction((prev) => ({ ...prev, remarks: event.target.value }))}
                  placeholder="e.g. approved leave"
                />
              </label>
              <button type="submit" className={styles.secondaryButton}>Deduct credit</button>
            </form>
          </div>

          <div className={styles.history}>
            <h4>Recent credit entries</h4>
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
              <p>No recent entries for this employee.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default AdminSearch;
