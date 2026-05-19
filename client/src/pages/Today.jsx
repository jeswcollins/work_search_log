import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import EntriesTable from '../components/EntriesTable.jsx';
import { api } from '../api.js';

export default function Today() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.today();
      setData(d);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(values) {
    await api.createEntry(values);
    await load();
  }

  if (error) return <p className="banner warn">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2>Work Search Log</h2>
      <p className="muted">
        Logging for {data.date}. Activities are kept locally on your machine.
        {' '}<Link to="/dreams">View dream jobs &rarr;</Link>
      </p>

      <section className="card">
        <h3>Add an activity</h3>
        <EntryForm
          initial={{ date: data.date }}
          submitLabel="Add activity"
          onSubmit={handleCreate}
        />
      </section>

      <section className="card">
        <h3>Today's entries ({data.entries.length})</h3>
        <EntriesTable entries={data.entries} />
      </section>
    </>
  );
}
