// ******************************************************
// MAIL — SMTP delivery (nodemailer)
// ******************************************************

const nodemailer = require('nodemailer');
const config = require('../config');
const { OTP_PURPOSES } = require('../constants/otp');
const { renderEmailTemplate } = require('./render-email-template');

let transporter;

/** @type {{ to: string, purpose: string, otp: string }[]} OTPs sent — useful in tests. */
const sentOtps = [];

const OTP_EMAIL_CONTENT = {
  [OTP_PURPOSES.VERIFY_EMAIL]: {
    subject: 'Verify your email',
    message: 'Use this code to verify your email address:',
  },
  [OTP_PURPOSES.RESET_PASSWORD]: {
    subject: 'Reset your password',
    message: 'Use this code to reset your password:',
  },
};

function getTransporter() {
  if (!transporter) {
    const { host, port, secure, user, pass } = config.mail;

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
      );
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

async function sendOtpEmail({ to, purpose, otp }) {
  const content = OTP_EMAIL_CONTENT[purpose];

  if (!content) {
    throw new Error(`Unsupported OTP email purpose: ${purpose}`);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[mail] OTP for ${to} (${purpose}): ${otp}`);
  }

  sentOtps.push({ to, purpose, otp });

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const { from } = config.mail;

  if (!from || !from.includes('@')) {
    throw new Error(
      'SMTP_FROM must be set to a verified sender email (e.g. you@example.com).',
    );
  }

  const text = `${content.message} ${otp}. This code expires in ${config.otp.expiresMinutes} minutes.`;

  await getTransporter().sendMail({
    from,
    to,
    subject: content.subject,
    text,
    html: renderEmailTemplate('otp', {
      subject: content.subject,
      message: content.message,
      otp,
      expiresMinutes: String(config.otp.expiresMinutes),
    }),
  });
}

module.exports = {
  sendOtpEmail,
  sentOtps,
};
