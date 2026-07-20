import { useState, useEffect } from 'react';
import styles from './AddCreditModal.module.css';

function AddCreditModal({ isOpen, onClose, onSave }) {
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().slice(0, 10));
      setHours('');
      setRemarks('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ date, hours: hours || 0, remarks });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>Add Credit Entry</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Hours
            <input type="number" step="0.5" min="0" value={hours} onChange={(e) => setHours(e.target.value)} required />
          </label>

          <label>
            Remarks
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primary}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCreditModal;
