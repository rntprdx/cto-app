import styles from './Dashboard.module.css';

function Dashboard({ balance, ledger, onOpenAddModal, onOpenForm, onDelete, onEdit, syncError, onLogout }) {
  return (
    <div className={styles.dashboard}>
      <section className={styles.heroCard}>
        <div>
          <p className={styles.eyebrow}>CTO Overview</p>
          <h1>Compensatory Overtime Credit (COC) Balance</h1>
          <p className={styles.subtitle}>
            Track your available credits and file a new compensatory time-off request in one place.
          </p>
        </div>
        <div className={styles.balanceBox}>
          <span className={styles.balanceLabel}>Available Balance</span>
          <strong className={styles.balanceValue}>{balance} hrs</strong>
          {onLogout ? (
            <button type="button" className={styles.logoutButton} onClick={onLogout}>
              Logout
            </button>
          ) : null}
        </div>
      </section>

      {syncError ? (
        <div className={styles.syncBanner} role="status">Sync issue: {syncError} <button className={styles.retry} onClick={() => typeof onRetry === 'function' && onRetry()}>Retry</button></div>
      ) : null}

      <section className={styles.contentGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Overtime Credits Ledger</h2>
              <p className={styles.panelSubtitle}>Review credit entries and update them as needed.</p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={onOpenForm}>
              File New CTO
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.hours}</td>
                    <td>{entry.remarks}</td>
                    <td>
                      <button className={styles.rowEdit} onClick={() => onEdit && onEdit(entry)}>Edit</button>
                      <button className={styles.rowDelete} onClick={() => onDelete && onDelete(entry.id)} aria-label="Delete">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className={styles.secondaryButton} onClick={onOpenAddModal}>
            Add Credit Entry
          </button>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
