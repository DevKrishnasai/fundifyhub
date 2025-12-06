import React from 'react';

export function RequestStageChangedEmail({ name, stage }: { name: any, stage: any }) {
  return (
    <div>
      <h1>Hi {name},</h1>
      <p>Your request has been moved to the {stage} stage.</p>
    </div>
  );
}
