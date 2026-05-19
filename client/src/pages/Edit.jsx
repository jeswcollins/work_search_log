import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import { api } from '../api.js';

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setEntry(await api.getEntry(id)); } catch (err) { setError(err.message); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(values) {
    await api.updateEntry(id, values);
    if (entry?.kind === 'network') navigate('/network');
    else if (entry?.is_dream)      navigate('/jobs');
    else                           navigate(`/week/${weekStartOf(values.date)}`);
  }

  async function handleDelete() {
    if (!confirm('Delete this entry?')) return;
    await api.deleteEntry(id);
    if (entry?.kind === 'network') navigate('/network');
    else if (entry?.is_dream)      navigate('/jobs');
    else                           navigate(`/week/${weekStartOf(entry.date)}`);
  }

  if (error) return <p className="banner warn">{error}</p>;
  if (!entry) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2>Edit {entry.kind === 'network' ? 'contact' : 'entry'} #{entry.id}{entry.is_dream ? ' (dream)' : ''}</h2>
      <section className="card">
        <EntryForm initial={entry} submitLabel="Save changes" onSubmit={handleSave} />
        <div className="delete-form">
          <button className="danger" onClick={handleDelete}>Delete entry</button>
        </div>
      </section>
    </>
  );
}

function weekStartOf(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
