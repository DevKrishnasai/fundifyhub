export const renderEmail = (vars: Record<string, any>) => {
  const firstName = vars.firstName || '';
  const lastName = vars.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || 'User';
  const loginAt = vars.loginAt ? new Date(vars.loginAt).toLocaleString() : 'Unknown time';
  const ip = vars.ip || 'Unknown IP';
  const userAgent = vars.userAgent || 'Unknown device';

  return `<!doctype html>
  <html>
    <body>
      <div style="font-family: Arial, sans-serif;">
        <h2>New login detected</h2>
        <p>Hello ${name},</p>
        <p>We noticed a new login to your account:</p>
        <ul>
          <li><strong>When:</strong> ${loginAt}</li>
          <li><strong>IP:</strong> ${ip}</li>
          <li><strong>Device/Agent:</strong> ${userAgent}</li>
        </ul>
        <p>If this was you, no action is required. If you do not recognize this activity, please secure your account immediately by changing your password and contacting support.</p>
        <p>Thanks,<br/>The Fundify Team</p>
      </div>
    </body>
  </html>`;
};

export default renderEmail;