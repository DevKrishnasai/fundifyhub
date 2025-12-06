/**
 * Request Created Email Template
 */
import React from 'react';

export function RequestCreatedEmail({ name }: { name: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>Your request has been created successfully.</p>
    </div>
  );
}
