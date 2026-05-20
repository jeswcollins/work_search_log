import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import { UsersIcon } from '../components/Icons.jsx';
import { api } from '../api.js';

export default function Network() {
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setContacts((await api.network()).network); } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(values) {
    await api.createEntry({ ...values, kind: 'network' });
    setShowForm(false);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contact?')) return;
    await api.deleteEntry(id);
    await load();
  }

  if (error) return <p className="banner warn">{error}</p>;

  return (
    <>
      <div className="page-heading">
        <UsersIcon size={22} className="page-icon network" />
        <h2>Network List</h2>
      </div>
      <p className="muted">
        Individual people to keep in touch with. Personal contacts that may
        not be tied to a specific job application.
      </p>

      <section className="card">
        {showForm ? (
          <>
            <h3>Add a contact</h3>
            <EntryForm
              kind="network"
              initial={{ date: new Date().toISOString().slice(0, 10) }}
              submitLabel="Save contact"
              onSubmit={handleCreate}
            />
            <div className="form-actions">
              <button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <button onClick={() => setShowForm(true)}>+ Add a contact</button>
        )}
      </section>

      <section className="card">
        <h3>{contacts ? `${contacts.length} contacts` : '…'}</h3>
        {!contacts ? <p className="muted">Loading…</p>
          : contacts.length === 0 ? <p className="muted">Nobody here yet.</p>
          : (
            <ul className="contact-list">
              {contacts.map((c) => (
                <li key={c.id} className="contact">
                  <div className="contact-main">
                    <div className="contact-headline">
                      {c.link
                        ? <a href={c.link} target="_blank" rel="noopener" className="primary-link">{c.person || '(no name)'}</a>
                        : <span className="primary-link">{c.person || '(no name)'}</span>}
                      <span className="contact-person">{c.employer_name}</span>
                    </div>
                    {c.description && <p className="contact-notes">{c.description}</p>}
                    <div className="contact-meta">
                      <span>added {c.date}</span>
                      {c.contact_method && <span>·  {c.contact_method}</span>}
                      {c.contact_info && <span>·  {c.contact_info}</span>}
                    </div>
                  </div>
                  <div className="contact-actions">
                    <Link to={`/entries/${c.id}/edit`} className="action-link">Edit</Link>
                    <button
                      type="button"
                      className="ghost danger-text"
                      onClick={() => handleDelete(c.id)}
                    >Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </>
  );
}
