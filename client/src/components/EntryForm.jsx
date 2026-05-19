import { useState } from 'react';
import { TYPES, CONTACT_METHODS, RESULTS } from '../constants.js';

const FIELDS = [
  'date', 'type', 'employer_name', 'person', 'contact_method',
  'contact_info', 'type_of_work', 'results', 'link', 'description',
];

function blankFrom(initial) {
  const out = {};
  for (const f of FIELDS) out[f] = (initial && initial[f]) || '';
  return out;
}

export default function EntryForm({ initial, submitLabel, onSubmit }) {
  const [values, setValues] = useState(() => blankFrom(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!values.date || !values.employer_name) {
      setError('Date and Employer / Agency are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <label>Date
        <input type="date" value={values.date} onChange={update('date')} required />
      </label>
      <label>Type
        <Select value={values.type} onChange={update('type')} options={TYPES} />
      </label>
      <label>Employer / Agency
        <input type="text" value={values.employer_name} onChange={update('employer_name')} required />
      </label>
      <label>Person contacted
        <input type="text" value={values.person} onChange={update('person')} />
      </label>
      <label>Contact method
        <Select value={values.contact_method} onChange={update('contact_method')} options={CONTACT_METHODS} />
      </label>
      <label>Contact info <span className="hint">(phone, email, URL, address)</span>
        <input type="text" value={values.contact_info} onChange={update('contact_info')} />
      </label>
      <label>Type of work
        <input type="text" value={values.type_of_work} onChange={update('type_of_work')} />
      </label>
      <label>Results
        <Select value={values.results} onChange={update('results')} options={RESULTS} />
      </label>
      <label>Link <span className="hint">(optional)</span>
        <input type="url" value={values.link} onChange={update('link')} />
      </label>
      <label>Notes <span className="hint">(optional)</span>
        <textarea rows={2} value={values.description} onChange={update('description')} />
      </label>
      {error && <p className="banner warn" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={onChange}>
      <option value="">(none)</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
