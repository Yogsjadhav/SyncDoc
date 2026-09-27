import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ConfirmDeleteModal({ open, onClose, onConfirm, title, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete document" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
               <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button></>}>
      <p className="text-sm text-gray-600">
        Are you sure you want to delete <strong>"{title}"</strong>?
        This permanently removes the document and all its history. This action cannot be undone.
      </p>
    </Modal>
  );
}
