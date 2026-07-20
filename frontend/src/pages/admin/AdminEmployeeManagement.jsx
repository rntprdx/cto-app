import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminDashboard.module.css';

function AdminEmployeeManagement() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    employee_no: '',
    position: '',
    office_division: '',
    monthly_salary: '',
    password: '',
    role: 'employee',
  });
  const [editDetails, setEditDetails] = useState(null);
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

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
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

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditDetails({
      full_name: employee.full_name,
      position: employee.position,
      office_division: employee.office_division,
      monthly_salary: employee.monthly_salary,
      role: employee.role,
      status: employee.status,
    });
    setError('');
    setMessage('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditDetails((prev) => ({ ...prev, [name]: value }));
  };

  const updateEmployee = async (event) => {
    event.preventDefault();
    if (!selectedEmployee || !editDetails) return;

    const response = await fetch(`${apiBase}/api/admin/users/${selectedEmployee.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: editDetails.full_name,
        position: editDetails.position,
        office_division: editDetails.office_division,
        monthly_salary: Number(editDetails.monthly_salary),
        role: editDetails.role,
        status: editDetails.status,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Unable to update employee.');
      return;
    }

    setMessage(`${payload.full_name} updated.`);
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

  return (
    <div className={styles.adminContent}>
      <div className={styles.cardHeaderRow}>
        <div>
          <p className={styles.eyebrow}>Employee management</p>
          <h2>Approve, add, or edit employees</h2>
          <p className={styles.subtitle}>Approve pending registrations and update employee roles and profiles.</p>
        </div>
      </div>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.card}>
        <h3>Pending registrations</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter((employee) => employee.status !== 'approved').map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.full_name}</td>
                  <td>{employee.employee_no}</td>
                  <td>{employee.role}</td>
                  <td>{employee.status}</td>
                  <td>
                    <button type="button" className={styles.primaryButton} onClick={() => handleApprove(employee.id)}>
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
              {employees.every((employee) => employee.status === 'approved') ? (
                <tr>
                  <td colSpan="5">No pending registrations.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h3>Add new employee</h3>
        <form className={styles.form} onSubmit={handleCreateEmployee}>
          <div className={styles.formGrid}>
            <label>
              Full name
              <input name="full_name" value={form.full_name} onChange={handleFormChange} required />
            </label>
            <label>
              Employee ID
              <input name="employee_no" value={form.employee_no} onChange={handleFormChange} required />
            </label>
            <label>
              Position
              <input name="position" value={form.position} onChange={handleFormChange} required />
            </label>
            <label>
              Office / Division
              <input name="office_division" value={form.office_division} onChange={handleFormChange} required />
            </label>
            <label>
              Monthly salary
              <input type="number" name="monthly_salary" value={form.monthly_salary} onChange={handleFormChange} required />
            </label>
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleFormChange} required />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={handleFormChange}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button type="submit" className={styles.primaryButton}>Create employee</button>
        </form>
      </section>

      <section className={styles.card}>
        <h3>Edit existing employee</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Choose</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.full_name}</td>
                  <td>{employee.employee_no}</td>
                  <td>{employee.role}</td>
                  <td>{employee.status}</td>
                  <td>
                    <button type="button" className={styles.secondaryButton} onClick={() => handleSelectEmployee(employee)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedEmployee && editDetails ? (
          <form className={styles.form} onSubmit={updateEmployee}>
            <h4>Editing {selectedEmployee.full_name}</h4>
            <div className={styles.formGrid}>
              <label>
                Full name
                <input name="full_name" value={editDetails.full_name} onChange={handleEditChange} required />
              </label>
              <label>
                Position
                <input name="position" value={editDetails.position} onChange={handleEditChange} required />
              </label>
              <label>
                Office / Division
                <input name="office_division" value={editDetails.office_division} onChange={handleEditChange} required />
              </label>
              <label>
                Monthly salary
                <input type="number" name="monthly_salary" value={editDetails.monthly_salary} onChange={handleEditChange} required />
              </label>
              <label>
                Role
                <select name="role" value={editDetails.role} onChange={handleEditChange}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                Status
                <select name="status" value={editDetails.status} onChange={handleEditChange}>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
            </div>
            <button type="submit" className={styles.primaryButton}>Save employee details</button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export default AdminEmployeeManagement;
