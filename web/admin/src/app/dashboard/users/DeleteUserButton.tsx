'use client';

import { useState, useTransition } from 'react';
import styles from './users.module.css';

interface Props {
  userId: string;
  userName: string;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteUserButton({ userId, userName, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className={styles.confirmRow}>
        <span className={styles.confirmLabel}>Delete {userName}?</span>
        <button
          className={styles.confirmYes}
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await onDelete(userId);
              setConfirming(false);
            });
          }}
        >
          {isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button className={styles.confirmNo} onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button className={styles.deleteBtn} onClick={() => setConfirming(true)}>
      Delete
    </button>
  );
}
