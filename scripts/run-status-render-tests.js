const assert = require('assert');

// Load compiled templates
const emailModule = require('../packages/templates/dist/templates/status/email');
const whatsappModule = require('../packages/templates/dist/templates/status/whatsapp');

const renderEmail = emailModule.default || emailModule.renderEmail;
const renderWhatsApp = whatsappModule.default || whatsappModule.renderStatusWhatsApp;

async function run() {
  console.log('Running status renderer smoke tests (compiled JS)...');

  const basic = {
    status: 'OFFER_SENT',
    link: 'https://app.fundifyhub.com/requests/REQ-1',
    customerName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+1000000000',
    header: 'Your Request Status',
    description: 'We have updated the request status.',
    footer: 'Reach out to support if needed.',
  };

  const waBasic = await renderWhatsApp(basic);
  assert(waBasic.includes('OFFER_SENT'), 'WA basic should include status');
  assert(waBasic.includes(basic.link), 'WA basic should include link');

  const emailBasic = await renderEmail(basic);
  assert(emailBasic.includes('OFFER_SENT'), 'Email basic should include status');
  assert(emailBasic.includes(basic.link), 'Email basic should include link');

  // multiple transitions
  const transitions = [
    { from: 'A', to: 'B', by: 'X', time: 't1' },
    { from: 'B', to: 'C', by: 'Y', time: 't2' },
  ];

  const multi = { status: 'OFFER_SENT', transitions, link: 'https://x' };
  const waMulti = await renderWhatsApp(multi);
  transitions.forEach(t => {
    assert(waMulti.includes(t.from), `waMulti should include ${t.from}`);
    assert(waMulti.includes(t.to), `waMulti should include ${t.to}`);
  });

  // missing fields
  const missing = { status: 'PENDING' };
  const waMissing = await renderWhatsApp(missing);
  assert(typeof waMissing === 'string' && waMissing.length > 0, 'waMissing should produce a string');

  console.log('Compiled status renderer tests passed ✅');
}

run().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});
