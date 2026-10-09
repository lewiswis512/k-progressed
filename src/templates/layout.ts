import { LOGO } from '../utils/constants/app';
import { escapeHtml } from '../utils/string/escape-html';

export const emailButton = (label: string, link: string): string => `
  <p style="margin:24px 0;">
    <a href="${escapeHtml(link)}" style="background:#082f49;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">${escapeHtml(label)}</a>
  </p>
  <p style="font-size:12px;color:#6b7280;">If the button does not work, copy this link into your browser:<br />${escapeHtml(link)}</p>
`;

export const emailLayout = (title: string, body: string): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <img src="${LOGO}" width="80" height="80" alt="K-Progressed" />
      <h1 style="font-size:20px;color:#082f49;">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:32px;font-size:12px;color:#6b7280;">K-Progressed</p>
    </div>
  </body>
</html>
`;
