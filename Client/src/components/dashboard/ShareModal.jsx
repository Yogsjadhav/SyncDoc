import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';
import apiClient from '../../lib/apiClient';

export default function ShareModal({ open, onClose, documentId, documentTitle, collaborators, onUpdated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildCollabList = (extra) => {
    const existing = collaborators
      .map((c) => ({ email: typeof c.userId === 'object' ? c.userId.email : '', role: c.role }))
      .filter((c) => c.email);
    return extra ? [...existing, extra] : existing;
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setError(''); setLoading(true);
    try {
      await apiClient.patch(`/api/documents/${documentId}`, {
        collaborators: buildCollabList({ email: email.trim(), role }),
      });
      setEmail(''); onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'User not found or already a collaborator.');
    } finally { setLoading(false); }
  };

  const handleRemove = async (collab) => {
    try {
      await apiClient.patch(`/api/documents/${documentId}`, {
        collaborators: collaborators
          .filter((c) => c !== collab)
          .map((c) => ({ email: typeof c.userId === 'object' ? c.userId.email : '', role: c.role }))
          .filter((c) => c.email),
      });
      onUpdated();
    } catch { /* ignore */ }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share "${documentTitle}"`} size="md"
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input placeholder="Invite by email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              error={error} />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Select role">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button onClick={handleInvite} loading={loading}>Invite</Button>
        </div>

        {collaborators.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">People with access</p>
            <ul className="space-y-2">
              {collaborators.map((c, i) => {
                const u = typeof c.userId === 'object' ? c.userId : { name: 'Unknown', email: '', avatarColor: '#888' };
                return (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} color={u.avatarColor} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs capitalize text-gray-600">{c.role}</span>
                      <button onClick={() => handleRemove(c)}
                        className="text-xs text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                        aria-label={`Remove ${u.name}`}>Remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
