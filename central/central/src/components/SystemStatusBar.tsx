import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { APPS_BY_ID } from '../config/apps';

function getRouteLabel(pathname: string) {
  if (pathname === '/') return { label: 'HUB', color: '#00FF41' };
  if (pathname.startsWith('/go/')) {
    const id = pathname.replace('/go/', '');
    const app = APPS_BY_ID[id];
    if (app) return { label: `${app.shortName.toUpperCase()} RELAY`, color: app.accentColor };
  }
  if (pathname.startsWith('/app/')) {
    const id = pathname.replace('/app/', '');
    const app = APPS_BY_ID[id];
    if (app) return { label: `${app.shortName.toUpperCase()} EMBED`, color: app.accentColor };
  }
  return { label: 'UNKNOWN', color: '#FF3333' };
}

/**
 * SystemStatusBar — minimal breadcrumb + clock.
 * Single thin line at the top of the page.
 */
export default function SystemStatusBar() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const route = getRouteLabel(location.pathname);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = time.toISOString().split('T')[0];
  const clockStr = time.toLocaleTimeString('pt-BR', { hour12: false });

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <Link to="/" className="status-bar-brand">PETROSHIELD_OS</Link>
        <span className="status-bar-sep">/</span>
        <motion.span
          key={route.label}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="status-bar-route"
          style={{ color: route.color }}
        >
          {route.label}
        </motion.span>
      </div>
      <div className="status-bar-right">
        <span className="status-bar-clock">{dateStr} {clockStr}</span>
      </div>
    </div>
  );
}
