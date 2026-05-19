import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EntriesTable from '../components/EntriesTable.jsx';
import { api } from '../api.js';
import { REQUIRED_ACTIVITIES_PER_WEEK } from '../constants.js';

export default function Week() {
  const { start } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(null);
      setData(await api.week(start));
    } catch (err) { setError(err.message); }
  }, [start]);

  useEffect(() => { load(); }, [load]);

  async function setMeta(meta) {
    await api.setWeekMeta(start, meta);
    await load();
  }

  if (error) return <p className="banner warn">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const partialUi = !!(data.meta && data.meta.partial_ui);
  const expected = partialUi ? 0 : REQUIRED_ACTIVITIES_PER_WEEK;
  const count = data.entries.length;
  const banner = partialUi
    ? <p className="banner ok">Called back this week — 0 activities expected.</p>
    : count >= expected
      ? <p className="banner ok">{count} activities logged this week (need {expected}).</p>
      : <p className="banner warn">{count} of {expected} activities logged this week.</p>;

  return (
    <>
      <h2>Work Search Log — week of {data.week_start} to {data.week_end}</h2>

      <nav className="weeknav">
        <Link to={`/week/${data.nav.prev}`}>&larr; Previous week</Link>
        <Link to="/week">Current week</Link>
        <Link to={`/week/${data.nav.next}`}>Next week &rarr;</Link>
        <span className="spacer"></span>
        <a href={api.csvUrl(start)}>Download CSV</a>
        <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }}>Print</a>
      </nav>

      {banner}

      <form
        className="week-meta"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setMeta({
            partial_ui: fd.get('partial_ui') === '1',
            notes: fd.get('notes') || null,
          });
        }}
      >
        <label>
          <input
            type="checkbox"
            name="partial_ui"
            value="1"
            defaultChecked={partialUi}
            key={`pu-${start}-${partialUi}`}
          />
          {' '}Called back this week — work search not required
        </label>
        <label className="grow">Notes
          <input type="text" name="notes" defaultValue={data.meta?.notes || ''} key={`n-${start}`} />
        </label>
        <button type="submit">Save week settings</button>
      </form>

      <section className="card">
        <h3>Activities ({count})</h3>
        <EntriesTable entries={data.entries} />
      </section>
    </>
  );
}
