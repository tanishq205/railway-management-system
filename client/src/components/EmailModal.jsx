import React, { useState, useEffect } from 'react';
import { X, Mail, Download, CheckCircle, Printer } from 'lucide-react';

export default function EmailModal({ pnr, onClose }) {
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pnr) return;
    setLoading(true);
    fetch(`/api/bookings/email/${pnr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.email) {
          setEmailData(data.email);
        } else {
          setError(data.message || 'Email record not found.');
        }
      })
      .catch((err) => setError('Failed to load email: ' + err.message))
      .finally(() => setLoading(false));
  }, [pnr]);

  const handlePrint = () => {
    const iframe = document.getElementById('email-preview-iframe');
    if (iframe) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 className="card-title" style={{ fontSize: '1.15rem' }}>
              <Mail size={20} style={{ color: 'var(--rail-red)' }} />
              IRCTC Confirmation Email Slip
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Dispatched E-Ticket Notification • PNR: <strong>{pnr}</strong>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Fetching official IRCTC E-Ticket email...
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : emailData ? (
            <div>
              {/* Email Envelope Header */}
              <div style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span><strong>From:</strong> Indian Railways (IRCTC) &lt;reservations@irctc.gov.in&gt;</span>
                  <span className="badge badge-confirmed">Delivered (Verified)</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>To:</strong> {emailData.to}
                </div>
                <div>
                  <strong>Subject:</strong> {emailData.subject}
                </div>
              </div>

              {/* Rendered HTML E-Ticket iframe */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <iframe
                  id="email-preview-iframe"
                  srcDoc={emailData.html}
                  title="IRCTC E-Ticket Slip"
                  style={{ width: '100%', height: '480px', border: 'none' }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button type="button" onClick={handlePrint} className="btn btn-outline btn-sm">
            <Printer size={15} /> Print / Save PDF
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
