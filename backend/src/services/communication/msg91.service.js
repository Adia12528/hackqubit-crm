const axios = require('axios');

function normalizeMobile(phoneNumber) {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendMessage({ phone_number, content }) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_FLOW_TEMPLATE_ID;
  if (!authKey || !templateId) {
    const error = new Error('MSG91 is not configured. Add MSG91_AUTH_KEY and MSG91_FLOW_TEMPLATE_ID.');
    error.code = 'MSG91_NOT_CONFIGURED';
    throw error;
  }

  const response = await axios.post(
    'https://control.msg91.com/api/v5/flow',
    {
      template_id: templateId,
      short_url: '0',
      recipients: [{
        mobiles: normalizeMobile(phone_number),
        VAR1: content,
      }],
    },
    {
      headers: {
        accept: 'application/json',
        authkey: authKey,
        'content-type': 'application/json',
      },
      timeout: 10000,
    }
  );

  return {
    providerId: response.data?.request_id || response.data?.message || `msg91_${Date.now()}`,
    status: 'queued',
  };
}

module.exports = { sendMessage };
