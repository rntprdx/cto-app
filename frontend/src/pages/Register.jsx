import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

const initialForm = {
  email: '',
  password: '',
  full_name: '',
  employee_no: '',
  position: '',
  office_division: '',
  monthly_salary: '',
};

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          employee_no: form.employee_no.trim(),
          position: form.position.trim(),
          office_division: form.office_division.trim(),
          monthly_salary: Number(form.monthly_salary),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create your account.');
      }

      login(payload);
      navigate('/dashboard');
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong while creating your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authShell}>
      <div className={styles.authCard}>
        <p className={styles.eyebrow}>Create account</p>
        <h1>Register your profile</h1>
        <p className={styles.subtitle}>Your account will be used to generate CTO documents with your official details.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label>
              Email
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleChange} required />
            </label>
            <label>
              Employee name
              <input name="full_name" value={form.full_name} onChange={handleChange} required />
            </label>
            <label>
              Employee no.
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
            <label className={styles.fullWidth}>
              Monthly salary
              <input type="number" name="monthly_salary" value={form.monthly_salary} onChange={handleChange} required />
            </label>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
