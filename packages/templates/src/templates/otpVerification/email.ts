export const renderEmail = (vars: Record<string, any>) => {
  const name = vars.userName || vars.firstName || 'User';
  const otp = vars.otp || '';

  return `<!doctype html>
  <html>
    <body>
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello ${name},</h2>
        <p>Your verification code is <strong>${otp}</strong>.</p>
        <p>This code expires in ${vars.expiryMinutes ?? 10} minutes.</p>
      </div>
    </body>
  </html>`;
};

export default renderEmail;