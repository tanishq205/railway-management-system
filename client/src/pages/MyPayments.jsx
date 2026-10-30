import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, AlertCircle, RefreshCw, CheckCircle, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyPayments() {
  const { authFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/payments');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error fetching payments.');
      }
      setPayments(data.payments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRetryPayment = async (pnr, amount) => {
    try {
      const res = await authFetch('/api/payments/retry', {
        method: 'POST',
        body: JSON.stringify({ pnr, amount, simulateFailure: false })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment retry failed.');
      }
      setSuccessMsg(`Payment retry for PNR ${pnr} was successful (Tx #${data.transactionId})!`);
      fetchPayments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={24} style={{ color: 'var(--rail-red)' }} />
            Payment Transaction History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Records of simulated settlements, retry attempts, and cancellation refunds.
          </p>
        </div>
        <button onClick={fetchPayments} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <p>Loading transactions...</p>
      ) : payments.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <CreditCard size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3>No Transactions Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No payment transaction logs exist under your account.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>PNR</th>
                <th>Train & Service Date</th>
                <th>Amount (INR)</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.Transaction_ID}>
                  <td><strong>#{p.Transaction_ID}</strong></td>
                  <td>
                    <Link to={`/pnr-status?pnr=${p.PNR}`} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {p.PNR}
                    </Link>
                  </td>
                  <td>
                    <div>{p.Train_Name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.Service_Date}</div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '1rem' }}>₹{parseFloat(p.Amount).toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.Payment_Status === 'SUCCESS' ? 'badge-confirmed' :
                      p.Payment_Status === 'REFUNDED' ? 'badge-waitlisted' : 'badge-cancelled'
                    }`}>
                      {p.Payment_Status}
                    </span>
                  </td>
                  <td>{new Date(p.Timestamp).toLocaleString()}</td>
                  <td>
                    {p.Payment_Status === 'FAILED' ? (
                      <button
                        onClick={() => handleRetryPayment(p.PNR, p.Amount)}
                        className="btn btn-accent btn-sm"
                      >
                        <RotateCw size={13} />
                        <span>Retry Payment</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
