import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntryForm from '../components/EntryForm.jsx';
import LinkContactsModal from '../components/LinkContactsModal.jsx';
import LinkChips from '../components/LinkChips.jsx';
import { LinkIcon } from '../components/Icons.jsx';
import { api } from '../api.js';

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

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

  async function handlePickedContact(contact) {
    try {
      await api.link(id, contact.id);
      setShowLinkModal(false);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function handleUnlink(other) {
    if (!confirm(`Unlink ${other.person || other.employer_name || 'this entry'}?`)) return;
    await api.unlink(id, other.id);
    await load();
  }

  const linkedIds = useMemo(
    () => new Set((entry?.links || []).map(l => l.id)),
    [entry]
  );

  if (error) return <p className="banner warn">{error}</p>;
  if (!entry) return <p className="muted">Loading…</p>;

  const isJob = entry.kind !== 'network';

  return (
    <>
      <h2>Edit {isJob ? 'entry' : 'contact'} #{entry.id}{entry.is_dream ? ' (dream)' : ''}</h2>

      <section className="card">
        <EntryForm
          initial={entry}
          kind={entry.kind}
          submitLabel="Save changes"
          onSubmit={handleSave}
        />

        <div className="linked-section">
          <div className="linked-header">
            <h3>{isJob ? 'Linked contacts' : 'Linked jobs'} ({entry.links?.length || 0})</h3>
            {isJob && (
              <button
                type="button"
                className="ghost icon-text"
                onClick={() => setShowLinkModal(true)}
              >
                <LinkIcon size={14} />
                Link Contact
              </button>
            )}
          </div>
          {entry.links?.length
            ? <LinkChips links={entry.links} onUnlink={handleUnlink} />
            : <p className="muted">
                {isJob
                  ? 'No contacts linked yet.'
                  : 'No jobs linked yet — link from the Job List.'}
              </p>}
        </div>

        <div className="delete-form">
          <button className="danger" onClick={handleDelete}>Delete entry</button>
        </div>
      </section>

      {showLinkModal && (
        <LinkContactsModal
          linkedIds={linkedIds}
          onClose={() => setShowLinkModal(false)}
          onPick={handlePickedContact}
        />
      )}
    </>
  );
}

function weekStartOf(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
