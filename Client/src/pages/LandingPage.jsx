import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const features = [
  { icon: '🌳', title: 'AST Conflict Resolution', desc: 'Edits merge at the node level — headings, lists, and blocks resolve correctly even when two users touch the same content.' },
  { icon: '⚡', title: 'Real-Time Presence', desc: 'Live cursors, per-user colours, and a people-editing indicator update within milliseconds via Socket.IO.' },
  { icon: '🕰️', title: 'Version History', desc: 'Periodic snapshots let you browse and restore any previous document state without losing current work.' },
  { icon: '🔒', title: 'Role-Based Sharing', desc: 'Invite collaborators by email as Viewer or Editor. Owners stay in control of who can change what.' },
];

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-brand-600">SyncDoc</span>
        <div className="flex items-center gap-3">
          {token ? (
            <Link to="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
              <Link to="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          ✨ AST-powered merge — no more clobbered edits
        </div>
        <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900 sm:text-6xl">
          Collaborate on documents<br />
          <span className="text-brand-600">without conflicts</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-500">
          SyncDoc represents every document as a tree of typed nodes. When two users edit at the same time,
          changes merge structurally — not as raw character diffs — so nothing ever gets lost.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/signup" className="rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-700 transition-colors">
            Start writing free
          </Link>
          <Link to="/login" className="rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Log in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Built differently, on purpose</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        SyncDoc — Collaborative Document Engine · Internship project
      </footer>
    </div>
  );
}
