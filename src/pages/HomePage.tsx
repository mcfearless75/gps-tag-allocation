import { Link } from 'react-router-dom';

interface HomeLink {
  to: string;
  title: string;
  description: string;
}

const HOME_LINKS: HomeLink[] = [
  { to: '/scan', title: 'Scan', description: 'Check tags out and back in for a session.' },
  { to: '/roster', title: 'Roster', description: 'View and manage the active squad.' },
  { to: '/report', title: 'Report', description: 'Weekly allocation report and exports.' },
];

export function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
      <div className="card home-links">
        {HOME_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="home-link-card">
            <span className="home-link-title">{link.title}</span>
            <span className="home-link-desc">{link.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
