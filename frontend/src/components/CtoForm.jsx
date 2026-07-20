import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './CtoForm.module.css';

const initialForm = {
  employeeName: 'Juan Dela Cruz',
  employeeNo: 'EMP-1024',
  position: 'Administrative Assistant',
  officeDivision: 'HR & Admin',
  startDate: '',
  endDate: '',
  dateOfFiling: new Date().toISOString().slice(0, 10),
};

function CtoForm({ balance, onBackToDashboard, onLogout }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    employeeName: user?.full_name || initialForm.employeeName,
    employeeNo: user?.employee_no || initialForm.employeeNo,
    position: user?.position || initialForm.position,
    officeDivision: user?.office_division || initialForm.officeDivision,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const workingDays = useMemo(() => {
    if (!form.startDate || !form.endDate) {
      return 0;
    }

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    const diffInMs = end.getTime() - start.getTime();
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(diffInDays, 0);
  }, [form.startDate, form.endDate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';
      const response = await fetch(`${apiBase}/api/generate-cto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: form.employeeName,
          employeeNo: form.employeeNo,
          position: form.position,
          officeDivision: form.officeDivision,
          startDate: form.startDate,
          endDate: form.endDate,
          workingDaysApplied: workingDays,
          dateOfFiling: form.dateOfFiling,
          cocBalance: balance,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || 'The PDF could not be generated.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'CTO_Application.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong while submitting the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formShell}>
      <div className={styles.formHeader}>
        <div>
          <p className={styles.eyebrow}>CTO Filing</p>
          <h1>File Compensatory Time-Off</h1>
          <p className={styles.subtitle}>Provide your request details and submit to generate a downloadable PDF.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className={styles.secondaryButton} onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          {onLogout ? (
            <button type="button" className={styles.secondaryButton} onClick={onLogout}>
              Logout
            </button>
          ) : null}
        </div>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <h2>User Profile</h2>
          <div className={styles.gridTwo}>
            <label>
              Employee Name
              <input name="employeeName" value={form.employeeName} onChange={handleChange} />
            </label>
            <label>
              Employee No.
              <input name="employeeNo" value={form.employeeNo} onChange={handleChange} />
            </label>
            <label>
              Position
              <input name="position" value={form.position} onChange={handleChange} />
            </label>
            <label>
              Office/Division
              <input name="officeDivision" value={form.officeDivision} onChange={handleChange} />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Request Details</h2>
          <div className={styles.gridTwo}>
            <label>
              From
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
            </label>
            <label>
              To
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
            </label>
            <label>
              Date of Filing
              <input type="date" name="dateOfFiling" value={form.dateOfFiling} onChange={handleChange} />
            </label>
            <label>
              No. of Working days applied for
              <input type="number" value={workingDays} readOnly />
            </label>
          </div>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? 'Generating PDF…' : 'Submit CTO Request'}
        </button>
      </form>
    </div>
  );
}

export default CtoForm;
