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

export default function EntryForm({ initial, submitLabel, onSubmit, kind = 'job' }) {
  const [values, setValues] = useState(() => blankFrom(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!values.date) { setError('Date is required.'); return; }
    if (kind === 'network' && !values.person && !values.employer_name) {
      setError('A name or employer is required.');
      return;
    }
    if (kind === 'job' && !values.employer_name) {
      setError('Employer / Agency is required.');
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

  if (kind === 'network') {
    return (
      <form className="entry-form" onSubmit={handleSubmit}>
        <Field title="Person" hint="(name)">
          <input type="text" value={values.person} onChange={update('person')} autoFocus />
        </Field>
        <Field title="Employer / Agency">
          <input type="text" value={values.employer_name} onChange={update('employer_name')} />
        </Field>
        <Field title="Contact method">
          <Select value={values.contact_method} onChange={update('contact_method')} options={CONTACT_METHODS} />
        </Field>
        <Field title="Contact info" hint="(phone, email, URL, address)">
          <input type="text" value={values.contact_info} onChange={update('contact_info')} />
        </Field>
        <Field title="Link" hint="(optional — LinkedIn, etc.)">
          <input type="url" value={values.link} onChange={update('link')} />
        </Field>
        <Field title="Notes" className="span-full">
          <textarea rows={2} value={values.description} onChange={update('description')} />
        </Field>
        <Field title="Date">
          <input type="date" value={values.date} onChange={update('date')} required />
        </Field>

        {error && <p className="banner warn" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </form>
    );
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <Field title="Type">
        <Select value={values.type} onChange={update('type')} options={TYPES} />
      </Field>
      <Field title="Employer / Agency">
        <input type="text" value={values.employer_name} onChange={update('employer_name')} required />
      </Field>
      <Field title="Person contacted">
        <input type="text" value={values.person} onChange={update('person')} />
      </Field>
      <Field title="Contact method">
        <Select value={values.contact_method} onChange={update('contact_method')} options={CONTACT_METHODS} />
      </Field>
      <Field title="Contact info" hint="(phone, email, URL, address)">
        <input type="text" value={values.contact_info} onChange={update('contact_info')} />
      </Field>
      <Field title="Type of work">
        <input type="text" value={values.type_of_work} onChange={update('type_of_work')} />
      </Field>
      <Field title="Results">
        <Select value={values.results} onChange={update('results')} options={RESULTS} />
      </Field>
      <Field title="Link" hint="(optional)">
        <input type="url" value={values.link} onChange={update('link')} />
      </Field>
      <Field title="Notes" className="span-full">
        <textarea rows={2} value={values.description} onChange={update('description')} />
      </Field>
      <Field title="Date">
        <input type="date" value={values.date} onChange={update('date')} required />
      </Field>

      {error && <p className="banner warn" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function Field({ title, hint, className, children }) {
  return (
    <label className={className}>
      <span className="field-title">
        {title}
        {hint ? <> <span className="hint">{hint}</span></> : null}
      </span>
      {children}
    </label>
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
