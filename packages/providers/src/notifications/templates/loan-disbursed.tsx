import React from 'react';

export function LoanDisbursedEmail({ name, amount }: { name: any, amount: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>Your loan of {amount} has been disbursed.</p>
    </div>
  );
}
