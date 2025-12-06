import React from 'react';

export function OfferMadeEmail({ name, amount }: { name: any, amount: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>You have received an offer of {amount}.</p>
    </div>
  );
}
