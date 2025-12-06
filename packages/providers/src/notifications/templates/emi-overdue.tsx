import React from 'react';

export function EmiOverdueEmail({ name, amount, dueDate }: { name: any, amount: any, dueDate: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>Your EMI of {amount} was due on {dueDate}.</p>
    </div>
  );
}
