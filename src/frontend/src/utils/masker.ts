function maskEmail(email: string) {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');
  let maskedLocal: string;

  if (localPart.length <= 2) {
    maskedLocal = '*'.repeat(localPart.length);
  } else if (localPart.length <= 5) {
    maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  } else {
    const start = localPart.slice(0, 2);
    const end = localPart.slice(-2);
    const middle = '*'.repeat(3);
    maskedLocal = start + middle + end;
  }

  return `${maskedLocal}@${domain}`;
}

export const masker = {
  maskEmail,
}