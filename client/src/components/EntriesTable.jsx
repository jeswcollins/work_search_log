import { Link } from 'react-router-dom';

export default function EntriesTable({ entries }) {
  if (!entries.length) return <p className="muted">No entries yet.</p>;
  return (
    <table className="entries">
      <thead>
        <tr>
          <th>Date</th><th>Type</th><th>Employer</th><th>Person</th>
          <th>Method</th><th>Contact info</th><th>Type of work</th>
          <th>Results</th><th>Link</th><th></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className={e.legacy ? 'legacy' : undefined}>
            <td>{e.date}</td>
            <td>{e.type}</td>
            <td>{e.employer_name}</td>
            <td>{e.person}</td>
            <td>{e.contact_method}</td>
            <td>{e.contact_info}</td>
            <td>{e.type_of_work}</td>
            <td>{e.results}</td>
            <td>{e.link ? <a href={e.link} target="_blank" rel="noopener">link</a> : ''}</td>
            <td><Link to={`/entries/${e.id}/edit`}>edit</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
