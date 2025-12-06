import React from 'react';

export function LoanDefaultedEmail({ name }: { name: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>Your loan has been defaulted.</p>
    </div>
  );
}
