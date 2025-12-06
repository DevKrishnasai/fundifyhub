import React from 'react';

export function OfferAcceptedEmail({ name }: { name: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>You have accepted the offer.</p>
    </div>
  );
}
