import { Link } from 'react-router-dom';
import { CloseIcon, BriefcaseIcon, UsersIcon } from './Icons.jsx';

/*
 * Render the `links` array attached to an entry as a row of chips.
 * Job links render in teal, network links in clay (warm). Each chip
 * navigates to that entry's edit page; the × removes the link
 * (caller-supplied onUnlink handler).
 */
export default function LinkChips({ links, onUnlink }) {
  if (!links || !links.length) return null;
  return (
    <div className="link-chips">
      {links.map((l) => {
        const isJob = l.kind === 'job';
        const Icon = isJob ? BriefcaseIcon : UsersIcon;
        const label = isJob
          ? (l.employer_name || '(no employer)')
          : (l.person || l.employer_name || '(no name)');
        return (
          <span key={l.id} className={'link-chip ' + (isJob ? 'job' : 'network')}>
            <Icon size={12} />
            <Link to={`/entries/${l.id}/edit`} className="link-chip-label">{label}</Link>
            {onUnlink && (
              <button
                type="button"
                className="link-chip-remove"
                aria-label={`Unlink ${label}`}
                onClick={() => onUnlink(l)}
              >
                <CloseIcon size={10} />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
