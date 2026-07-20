import { useMemo, useState, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import CtoForm from './components/CtoForm';
import AddCreditModal from './components/AddCreditModal';
import EditCreditModal from './components/EditCreditModal';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSearch from './pages/admin/AdminSearch';
import AdminCreditHistory from './pages/admin/AdminCreditHistory';
import AdminEmployeeManagement from './pages/admin/AdminEmployeeManagement';
import { useAuth } from './context/AuthContext';

const initialLedger = [
  { id: 1, date: '2026-07-01', hours: 4, remarks: 'Weekend support' },
  { id: 2, date: '2026-07-08', hours: 2.5, remarks: 'Data cleanup' },
];

function App() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, token, user } = useAuth();
  const storageKey = user?.id ? `cto_ledger_${user.id}` : 'cto_ledger_guest';
  const [ledger, setLedger] = useState(() => {
    try {
      const raw = localStorage.getItem('cto_ledger_guest');
      return raw ? JSON.parse(raw) : initialLedger;
    } catch (e) {
      return initialLedger;
    }
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const balance = useMemo(() => {
    const total = ledger.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    return Number(total).toFixed(1);
  }, [ledger]);

  const handleAddEntry = () => {
    setIsAddOpen(true);
  };

  const handleLedgerChange = (id, field, value) => {
    setLedger((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  const addLedgerEntry = (payload) => {
    // optimistic add with temporary id
    const tempId = `temp-${Date.now()}`;
    const tempEntry = { id: tempId, date: payload.date, hours: Number(payload.hours), remarks: payload.remarks || '' };
    setLedger((current) => [...current, tempEntry]);
    setIsAddOpen(false);

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';
    fetch(`${apiBase}/api/ledger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date: payload.date, hours: payload.hours, remarks: payload.remarks }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to save to server');
        return r.json();
      })
      .then((saved) => {
        setLedger((current) => current.map((e) => (e.id === tempId ? saved : e)));
        setSyncError('');
      })
      .catch((err) => {
        setSyncError(err.message || 'Server sync failed');
      });
  };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ledger));
    } catch (e) {
      // ignore
    }
  }, [ledger, storageKey]);

  // on mount try to load from server and prefer it when available
  const refreshFromServer = () => {
    if (!token) {
      setLedger([]);
      return Promise.resolve([]);
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';
    return fetch(`${apiBase}/api/ledger`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error('no-server');
        return r.json();
      })
      .then((serverLedger) => {
        setLedger(serverLedger);
        setSyncError('');
        return serverLedger;
      })
      .catch((err) => {
        setSyncError(err.message || 'Server unreachable');
        throw err;
      });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLedger([]);
      return;
    }

    refreshFromServer().catch(() => {});
  }, [isAuthenticated, token, user?.id]);

  const deleteLedgerEntry = (id) => {
    // optimistic remove
    const previous = ledger;
    setLedger((current) => current.filter((e) => e.id !== id));

    // if id is temporary, just remove locally
    if (String(id).startsWith('temp-')) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';
    fetch(`${apiBase}/api/ledger/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error('delete-failed');
        setSyncError('');
      })
      .catch((err) => {
        setSyncError(err.message || 'Failed to delete on server');
        // revert
        setLedger(previous);
      });
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  const saveEdit = (payload) => {
    // optimistic update
    const previous = ledger;
    setLedger((current) => current.map((e) => (e.id === payload.id ? { ...e, date: payload.date, hours: payload.hours, remarks: payload.remarks } : e)));
    setIsEditOpen(false);

    // if temp id, just replace locally
    if (String(payload.id).startsWith('temp-')) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5600';
    fetch(`${apiBase}/api/ledger/${payload.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date: payload.date, hours: payload.hours, remarks: payload.remarks }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('update-failed');
        return r.json();
      })
      .then((updated) => {
        setLedger((current) => current.map((e) => (e.id === updated.id ? updated : e)));
        setSyncError('');
      })
      .catch((err) => {
        setSyncError(err.message || 'Failed to update on server');
        setLedger(previous);
      });
  };

  const handleLogout = () => {
    logout();
    setLedger([]);
    navigate('/login');
  };

  return (
    <main className="app-shell">
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Dashboard
                  balance={balance}
                  ledger={ledger}
                  onOpenAddModal={handleAddEntry}
                  onOpenForm={() => navigate('/cto-form')}
                  onDelete={deleteLedgerEntry}
                  onEdit={openEdit}
                  syncError={syncError}
                  onRetry={refreshFromServer}
                  onLogout={handleLogout}
                  isAdmin={user?.role === 'admin'}
                />
                <AddCreditModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={addLedgerEntry} />
                <EditCreditModal isOpen={isEditOpen} entry={editingEntry} onClose={() => setIsEditOpen(false)} onSave={saveEdit} />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cto-form"
          element={
            <ProtectedRoute>
              <CtoForm balance={balance} onBackToDashboard={() => navigate('/dashboard')} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="search" replace />} />
          <Route path="search" element={<AdminSearch />} />
          <Route path="history" element={<AdminCreditHistory />} />
          <Route path="manage" element={<AdminEmployeeManagement />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </main>
  );
}

export default App;
