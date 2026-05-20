import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import { BriefcaseIcon } from '../components/Icons.jsx';
import { api } from '../api.js';

export default function Jobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all | active | dream

  const load = useCallback(async () => {
    try { setJobs((await api.jobs()).jobs); } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(values) {
    await api.createEntry({ ...values, kind: 'job' });
    setShowForm(false);
    await load();
  }

  async function toggleDream(id, next) {
    await api.patchEntry(id, { is_dream: next });
    await load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return;
    await api.deleteEntry(id);
    await load();
  }

  const visible = useMemo(() => {
    if (!jobs) return null;
    if (filter === 'active') return jobs.filter((j) => !j.is_dream);
    if (filter === 'dream')  return jobs.filter((j) =>  j.is_dream);
    return jobs;
  }, [jobs, filter]);

  if (error) return <p className="banner warn">{error}</p>;

  return (
    <>
      <div className="page-heading">
        <BriefcaseIcon size={22} className="page-icon job" />
        <h2>Job List</h2>
      </div>
      <p className="muted">
        All job-related entries — both logged work searches and dream ideas.
        Toggle <strong>Dream</strong> to mark something as an idea that doesn't
        yet count toward your weekly activities.
      </p>

      <section className="card">
        {showForm ? (
          <>
            <h3>Add a job entry</h3>
            <EntryForm
              kind="job"
              initial={{ date: new Date().toISOString().slice(0, 10) }}
              submitLabel="Save entry"
              onSubmit={handleCreate}
            />
            <div className="form-actions">
              <button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <button onClick={() => setShowForm(true)}>+ Add a job entry</button>
        )}
      </section>

      <section className="card">
        <div className="list-header">
          <h3>{visible ? `${visible.length} entries` : '…'}</h3>
          <div className="filter-pills">
            <button
              type="button"
              className={'pill' + (filter === 'all' ? ' active' : '')}
              onClick={() => setFilter('all')}
            >All</button>
            <button
              type="button"
              className={'pill' + (filter === 'active' ? ' active' : '')}
              onClick={() => setFilter('active')}
            >Logged</button>
            <button
              type="button"
              className={'pill' + (filter === 'dream' ? ' active' : '')}
              onClick={() => setFilter('dream')}
            >Dreams</button>
          </div>
        </div>

        {!visible ? <p className="muted">Loading…</p>
          : visible.length === 0 ? <p className="muted">Nothing here yet.</p>
          : (
            <ul className="contact-list">
              {visible.map((j) => (
                <li key={j.id} className={'contact' + (j.is_dream ? ' is-dream' : '')}>
                  <div className="contact-main">
                    <div className="contact-headline">
                      {j.link
                        ? <a href={j.link} target="_blank" rel="noopener" className="primary-link">{j.employer_name || '(no employer)'}</a>
                        : <span className="primary-link">{j.employer_name || '(no employer)'}</span>}
                      <span className="contact-person">{j.person}</span>
                    </div>
                    {(j.type_of_work || j.description) && (
                      <p className="contact-notes">
                        {j.type_of_work && <em>{j.type_of_work}</em>}
                        {j.type_of_work && j.description ? ' — ' : ''}
                        {j.description}
                      </p>
                    )}
                    <div className="contact-meta">
                      <span>{j.date}</span>
                      {j.contact_method && <span>·  {j.contact_method}</span>}
                      {j.contact_info && <span>·  {j.contact_info}</span>}
                      {j.results && <span className="pill pill-static">{j.results}</span>}
                    </div>
                  </div>
                  <div className="contact-actions">
                    <label className="dream-toggle">
                      <input
                        type="checkbox"
                        checked={!!j.is_dream}
                        onChange={(e) => toggleDream(j.id, e.target.checked)}
                      />
                      Dream
                    </label>
                    <Link to={`/entries/${j.id}/edit`} className="action-link">Edit</Link>
                    <button
                      type="button"
                      className="ghost danger-text"
                      onClick={() => handleDelete(j.id)}
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
