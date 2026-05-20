import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloseIcon } from './Icons.jsx';
import EntryForm from './EntryForm.jsx';
import { api } from '../api.js';

/*
 * Contact picker modal. Pure picker — does not perform the link itself;
 * emits onPick(contact) and lets the parent POST the link.
 *
 * Two modes: "browse" (default) and "create" — flipping to create swaps
 * the body for an EntryForm preset to kind=network; on submit, the new
 * contact is created and onPick fires with the created contact.
 */
export default function LinkContactsModal({ linkedIds, onClose, onPick }) {
  const [mode, setMode] = useState('browse'); // 'browse' | 'create'
  const [contacts, setContacts] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  // Lock body scroll while open; close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const load = useCallback(async () => {
    try { setContacts((await api.network()).network); }
    catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!contacts) return null;
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      (c.person || '').toLowerCase().includes(q) ||
      (c.employer_name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }, [contacts, query]);

  async function createAndPick(values) {
    try {
      const created = await api.createEntry({ ...values, kind: 'network' });
      onPick(created);
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Link contact"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{mode === 'create' ? 'Create new contact' : 'Link contact'}</h3>
          <button type="button" className="ghost icon-only" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="modal-body">
          {error && <p className="banner warn" role="alert">{error}</p>}

          {mode === 'browse' ? (
            <>
              <input
                type="search"
                className="modal-search"
                placeholder="Search by person, employer, or notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <div className="modal-list">
                {!filtered ? <p className="muted">Loading…</p>
                  : filtered.length === 0 ? <p className="muted">No matching contacts.</p>
                  : filtered.map((c) => {
                    const already = linkedIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="modal-row ghost"
                        disabled={already}
                        onClick={() => onPick(c)}
                      >
                        <span className="modal-row-main">
                          <strong>{c.person || '(no name)'}</strong>
                          {c.employer_name && <span className="muted"> · {c.employer_name}</span>}
                        </span>
                        <span className="modal-row-action">
                          {already ? 'Already linked' : 'Link'}
                        </span>
                      </button>
                    );
                  })}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setMode('create')}>
                  + Create a new contact
                </button>
              </div>
            </>
          ) : (
            <>
              <EntryForm
                kind="network"
                initial={{ date: new Date().toISOString().slice(0, 10) }}
                submitLabel="Create & link"
                onSubmit={createAndPick}
              />
              <div className="modal-footer">
                <button type="button" className="ghost" onClick={() => setMode('browse')}>
                  ← Back to existing contacts
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
