import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [ledger, setLedger] = useState([]);
  const [sortKey, setSortKey] = useState('full_name');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [editDetails, setEditDetails] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    employee_no: '',
    position: '',
    office_division: '',
    monthly_salary: '',
    password: '',
    role: 'employee',
  });
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
    if (!selectedEmployeeId && payload.length) {
      setSelectedEmployeeId(String(payload[0].id));
    }
  };

  useEffect(() => {
    if (!token) return;

    loadEmployees().catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedEmployeeId || !token) {
      setLedger([]);
      setEmployeeDetails(null);
      return;
    }

    fetch(`${apiBase}/api/admin/users/${selectedEmployeeId}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((payload) => setLedger(payload))
      .catch(() => setLedger([]));
  }, [selectedEmployeeId, token]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setEmployeeDetails(null);
      setEditDetails(null);
      return;
    }

    const selected = employees.find((employee) => String(employee.id) === selectedEmployeeId) || null;
    setEmployeeDetails(selected);
    setEditDetails(selected ? {
      full_name: selected.full_name,
      position: selected.position,
      office_division: selected.office_division,
      monthly_salary: selected.monthly_salary,
      role: selected.role,
      status: selected.status,
    } : null);
  }, [employees, selectedEmployeeId]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      if (sortKey === 'balance') {
        return Number(b.balance || 0) - Number(a.balance || 0);
      }
      return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), undefined, { sensitivity: 'base' });
    });
  }, [employees, sortKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditDetails((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const response = await fetch(`${apiBase}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        password: form.password,
        full_name: form.full_name,
        employee_no: form.employee_no,
        position: form.position,
        office_division: form.office_division,
        monthly_salary: Number(form.monthly_salary),
        role: form.role,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to create employee.');
      return;
    }

    setMessage(`Created ${payload.full_name} (${payload.employee_no}).`);
    setForm({ full_name: '', employee_no: '', position: '', office_division: '', monthly_salary: '', password: '', role: 'employee' });
    loadEmployees().catch(() => {});
  };

  const handleApprove = async (employeeId) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to approve employee.');
      return;
    }

    setMessage(`${payload.full_name} approved.`);
    loadEmployees().catch(() => {});
  };

  const handleRoleChange = async (employeeId, role) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to update role.');
      return;
    }

    setMessage(`${payload.full_name} is now ${payload.role}.`);
    loadEmployees().catch(() => {});
  };

  const handleEditEmployee = async (employeeId, updatedData) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedData),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to update employee.');
      return;
    }

    setMessage(`${payload.full_name} updated.`);
    loadEmployees().catch(() => {});
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Delete this employee? This cannot be undone.')) return;

    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || 'Unable to delete employee.');
      return;
    }

    setMessage('Employee removed.');
    setSelectedEmployeeId('');
    loadEmployees().catch(() => {});
  };

  const handleSaveDetails = async (event) => {
    event.preventDefault();
    if (!selectedEmployeeId || !editDetails) return;

    await handleEditEmployee(selectedEmployeeId, {
      full_name: editDetails.full_name,
      position: editDetails.position,
      office_division: editDetails.office_division,
      monthly_salary: Number(editDetails.monthly_salary),
      role: editDetails.role,
      status: editDetails.status,
    });
  };

  const handleDisapprove = async (employeeId) => {
    const response = await fetch(`${apiBase}/api/admin/users/${employeeId}/disapprove`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to disapprove employee.');
      return;
    }

    setMessage(`${payload.full_name} has been set to pending.`);
    loadEmployees().catch(() => {});
  };

  const handleDeduct = async (event) => {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    const response = await fetch(`${apiBase}/api/admin/users/${selectedEmployeeId}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hours: Number(deduction.hours), remarks: deduction.remarks }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to deduct credits.');
      return;
    }

    setMessage(`Deducted ${payload.hours} hour(s) from ${employeeDetails?.full_name || 'the employee'}.`);
    setDeduction({ hours: '', remarks: '' });
    fetch(`${apiBase}/api/admin/users/${selectedEmployeeId}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((payload) => setLedger(payload))
      .catch(() => setLedger([]));
  };

  const handleCredit = async (event) => {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    const response = await fetch(`${apiBase}/api/admin/users/${selectedEmployeeId}/credit`, {
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

    setMessage(`Added ${payload.hours} hour(s) to ${employeeDetails?.full_name || 'the employee'}.`);
    setCredit({ hours: '', remarks: '' });
    fetch(`${apiBase}/api/admin/users/${selectedEmployeeId}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((payload) => setLedger(payload))
      .catch(() => setLedger([]));
  };

  return (
    <div className={styles.adminShell}>
      <div className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>Admin</p>
          <h1>Employee administration</h1>
          <p className={styles.subtitle}>Manage accounts, credits, roles, and approvals from one place.</p>
        </div>
        <Link to="/dashboard" className={styles.linkButton}>Back to dashboard</Link>
      </div>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2>Employees</h2>
            <label className={styles.inlineLabel}>
              Sort by
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="full_name">Name</option>
                <option value="employee_no">Employee ID</option>
                <option value="balance">Credit</option>
                <option value="status">Status</option>
                <option value="role">Role</option>
              </select>
            </label>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Credit</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.full_name}</td>
                    <td>{employee.employee_no}</td>
                    <td>{Number(employee.balance || 0).toFixed(1)}</td>
                    <td>{employee.status}</td>
                    <td>{employee.role}</td>
                    <td>
                      <button type="button" className={styles.secondaryButton} onClick={() => setSelectedEmployeeId(String(employee.id))}>View</button>
                      {employee.status !== 'approved' ? (
                        <button type="button" className={styles.primaryButton} onClick={() => handleApprove(employee.id)}>Approve</button>
                      ) : (
                        <button type="button" className={styles.secondaryButton} onClick={() => handleDisapprove(employee.id)}>Disapprove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Selected employee</h2>
          {employeeDetails ? (
            <>
              <p><strong>{employeeDetails.full_name}</strong> · {employeeDetails.employee_no}</p>
              <p>Position: {employeeDetails.position}</p>
              <p>Office/Division: {employeeDetails.office_division}</p>
              <p>Current credit balance: {Number(employeeDetails.balance || 0).toFixed(1)}</p>

              <div className={styles.inlineActions}>
                <label>
                  Role
                  <select name="role" value={editDetails?.role || ''} onChange={handleEditChange}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" value={editDetails?.status || ''} onChange={handleEditChange}>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
              </div>

              <form className={styles.form} onSubmit={handleSaveDetails}>
                <h3>Edit employee details</h3>
                <div className={styles.formGrid}>
                  <label>
                    Full name
                    <input name="full_name" value={editDetails?.full_name || ''} onChange={handleEditChange} required />
                  </label>
                  <label>
                    Position
                    <input name="position" value={editDetails?.position || ''} onChange={handleEditChange} required />
                  </label>
                  <label>
                    Office / Division
                    <input name="office_division" value={editDetails?.office_division || ''} onChange={handleEditChange} required />
                  </label>
                  <label>
                    Monthly salary
                    <input type="number" name="monthly_salary" value={editDetails?.monthly_salary || ''} onChange={handleEditChange} required />
                  </label>
                </div>
                <div className={styles.inlineActions}>
                  <button type="submit" className={styles.primaryButton}>Save details</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => handleDeleteEmployee(employeeDetails.id)}>
                    Delete employee
                  </button>
                </div>
              </form>

              <div className={styles.cardSection}>
                <h3>Admin actions</h3>
                <div className={styles.inlineActions}>
                  {employeeDetails.status !== 'approved' ? (
                    <button type="button" className={styles.primaryButton} onClick={() => handleApprove(employeeDetails.id)}>
                      Approve
                    </button>
                  ) : (
                    <button type="button" className={styles.secondaryButton} onClick={() => handleDisapprove(employeeDetails.id)}>
                      Disapprove
                    </button>
                  )}
                </div>
              </div>

              <form className={styles.form} onSubmit={handleDeduct}>
                <h3>Deduct approved leave credits</h3>
                <label>
                  Hours
                  <input type="number" min="0" step="0.5" value={deduction.hours} onChange={(event) => setDeduction((previous) => ({ ...previous, hours: event.target.value }))} required />
                </label>
                <label>
                  Remarks
                  <input value={deduction.remarks} onChange={(event) => setDeduction((previous) => ({ ...previous, remarks: event.target.value }))} />
                </label>
                <button type="submit" className={styles.primaryButton}>Deduct credits</button>
              </form>

              <form className={styles.form} onSubmit={handleCredit}>
                <h3>Add verified credits</h3>
                <label>
                  Hours
                  <input type="number" min="0" step="0.5" value={credit.hours} onChange={(event) => setCredit((previous) => ({ ...previous, hours: event.target.value }))} required />
                </label>
                <label>
                  Remarks
                  <input value={credit.remarks} onChange={(event) => setCredit((previous) => ({ ...previous, remarks: event.target.value }))} placeholder="e.g. overtime approved" />
                </label>
                <button type="submit" className={styles.primaryButton}>Add credit</button>
              </form>

              <div className={styles.history}>
                <h3>Credit history</h3>
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
                  <p>No ledger entries yet.</p>
                )}
              </div>
            </>
          ) : (
            <p>Select an employee to review their history.</p>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2>Add employee / approve registration</h2>
        <form className={styles.form} onSubmit={handleCreateEmployee}>
          <div className={styles.formGrid}>
            <label>
              Full name
              <input name="full_name" value={form.full_name} onChange={handleChange} required />
            </label>
            <label>
              Employee ID
              <input name="employee_no" value={form.employee_no} onChange={handleChange} required />
            </label>
            <label>
              Position
              <input name="position" value={form.position} onChange={handleChange} required />
            </label>
            <label>
              Office / Division
              <input name="office_division" value={form.office_division} onChange={handleChange} required />
            </label>
            <label>
              Monthly salary
              <input type="number" name="monthly_salary" value={form.monthly_salary} onChange={handleChange} required />
            </label>
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleChange} required />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button type="submit" className={styles.primaryButton}>Create employee</button>
        </form>
      </section>
    </div>
  );
}

export default AdminDashboard;
