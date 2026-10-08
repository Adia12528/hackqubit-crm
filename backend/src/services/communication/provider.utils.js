const PLACEHOLDER_VALUES = [
  'your_',
  'your-',
  'change_me',
  'changeme',
  'replace_',
  'example',
];

function isConfigured(...values) {
  return values.every((value) => {
    if (!value || typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return !PLACEHOLDER_VALUES.some((placeholder) => normalized.includes(placeholder));
  });
}

function isSuccessful(status) {
  return ['queued', 'accepted', 'sent', 'delivered'].includes(status);
}

function providerUnavailable(provider) {
  return {
    status: 'failed',
    error: `${provider} is not configured. Add valid provider credentials or enable MOCK_PROVIDERS=true for local demos.`,
  };
}

function isDemoMode() {
  return process.env.DEMO_MODE === 'true' && process.env.MOCK_PROVIDERS === 'true';
}

function getDemoRecipient(fallback) {
  if (!isDemoMode()) return fallback;
  return process.env.DEMO_RECIPIENT_PHONE || fallback;
}

module.exports = {
  isConfigured,
  isSuccessful,
  providerUnavailable,
  isDemoMode,
  getDemoRecipient,
};
