import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import { api } from '../api.js';

export default function Dreams() {
  const [dreams, setDreams] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setDreams((await api.dreams()).dreams); } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(values) {
    await api.createEntry({ ...values, is_dream: true });
    setShowForm(false);
    await load();
  }

  async function handlePromote(id) {
    const date = prompt(
      'Date this work-search activity actually happened (YYYY-MM-DD):',
      new Date().toISOString().slice(0, 10),
    );
    if (!date) return;
    await api.promote(id, date);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this dream?')) return;
    await api.deleteEntry(id);
    await load();
  }

  if (error) return <p className="banner warn">{error}</p>;

  return (
    <>
      <h2>Dream Jobs</h2>
      <p className="muted">
        Ideas — places you might apply but haven't yet. These don't count
        toward weekly work-search activities until you promote them.
        {' '}<Link to="/">&larr; Back to today</Link>
      </p>

      <section className="card">
        {showForm ? (
          <>
            <h3>Add a dream</h3>
            <EntryForm
              initial={{ date: new Date().toISOString().slice(0, 10) }}
              submitLabel="Save dream"
              onSubmit={handleCreate}
            />
            <button onClick={() => setShowForm(false)} className="ghost">Cancel</button>
          </>
        ) : (
          <button onClick={() => setShowForm(true)}>+ Add a dream</button>
        )}
      </section>

      <section className="card">
        <h3>Your dreams ({dreams ? dreams.length : '…'})</h3>
        {!dreams ? <p className="muted">Loading…</p>
          : dreams.length === 0 ? <p className="muted">No dreams yet.</p>
          : (
            <table className="entries">
              <thead>
                <tr>
                  <th>Added</th><th>Type</th><th>Employer</th><th>Person</th>
                  <th>Method</th><th>Contact info</th><th>Type of work</th>
                  <th>Notes</th><th>Link</th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {dreams.map((d) => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td>{d.type}</td>
                    <td>{d.employer_name}</td>
                    <td>{d.person}</td>
                    <td>{d.contact_method}</td>
                    <td>{d.contact_info}</td>
                    <td>{d.type_of_work}</td>
                    <td>{d.description}</td>
                    <td>{d.link ? <a href={d.link} target="_blank" rel="noopener">link</a> : ''}</td>
                    <td><button onClick={() => handlePromote(d.id)}>Log as activity</button></td>
                    <td><Link to={`/entries/${d.id}/edit`}>edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>
    </>
  );
}
