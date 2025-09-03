// Disposable email domains (basic list - can be expanded)
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'throwaway.email',
  'temp-mail.org',
  'sharklasers.com',
  'getairmail.com',
  'mailnesia.com',
  'maildrop.cc',
  'mailmetrash.com',
  'trashmail.com',
  'spam4.me',
  'bccto.me',
  'chacuo.net',
  'dispostable.com',
  'fakeinbox.com',
  'mailcatch.com',
  'mailnull.com',
  'spamspot.com',
  'tempr.email',
  'tmpeml.com',
  'tmpmail.net',
  'tmpmail.org',
  'temporary-mail.net',
  'temporarymail.com',
  'tempmail.com',
  'temp-mail.com',
  '10minutemail.net',
  '10minutemail.org',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.net',
  'mailinator.org',
  'yopmail.net',
  'yopmail.org',
  'throwaway.email',
  'temp-mail.net',
  'temp-mail.org',
  'sharklasers.net',
  'sharklasers.org',
  'getairmail.net',
  'getairmail.org',
  'mailnesia.net',
  'mailnesia.org',
  'maildrop.cc',
  'mailmetrash.net',
  'mailmetrash.org',
  'trashmail.net',
  'trashmail.org',
  'spam4.me',
  'bccto.me',
  'chacuo.net',
  'dispostable.net',
  'dispostable.org',
  'fakeinbox.net',
  'fakeinbox.org',
  'mailcatch.net',
  'mailcatch.org',
  'mailnull.net',
  'mailnull.org',
  'spamspot.net',
  'spamspot.org',
  'tempr.email',
  'tmpeml.net',
  'tmpeml.org',
  'tmpmail.net',
  'tmpmail.org',
  'temporary-mail.net',
  'temporary-mail.org',
  'temporarymail.net',
  'temporarymail.org',
  'tempmail.net',
  'tempmail.org',
  'temp-mail.net',
  'temp-mail.org',
]);

/**
 * Validate email address and check if it's disposable
 */
export function validateEmail(email: string): { isValid: boolean; isDisposable: boolean; reason?: string } {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      isDisposable: false,
      reason: 'Invalid email format'
    };
  }

  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return {
      isValid: false,
      isDisposable: false,
      reason: 'Invalid email domain'
    };
  }

  // Check if domain is disposable
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);
  
  return {
    isValid: true,
    isDisposable,
    reason: isDisposable ? 'Disposable email addresses are not allowed' : undefined
  };
}

/**
 * Check if an email domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}
