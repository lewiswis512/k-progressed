import { Purchase } from '../modules/purchases/schemas/purchase.schema';
import { escapeHtml } from '../utils/string/escape-html';
import { formatEuro } from '../utils/string/format-euro';
import { emailButton, emailLayout } from './layout';

export const purchaseReceiptTemplate = (purchase: Purchase, ordersLink: string) =>
  emailLayout(
    'Thank you for your order',
    `
      <p>Hello ${escapeHtml(purchase.user.name)},</p>
      <p>Your payment has been received. You now have access to:</p>
      <table style="width:100%;border-collapse:collapse;">
        ${purchase.purchaseItems
          .map(
            (item) => `
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.title)}</td>
                <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${formatEuro(item.price)}</td>
              </tr>`,
          )
          .join('')}
        <tr>
          <td style="padding:6px 0;font-weight:bold;">Total</td>
          <td style="padding:6px 0;text-align:right;font-weight:bold;">${formatEuro(purchase.purch_total)}</td>
        </tr>
      </table>
      <p>Order reference: <strong>${escapeHtml(purchase.purch_reference)}</strong></p>
      ${emailButton('See my orders and invoices', ordersLink)}
    `,
  );

export const purchaseRefundedTemplate = (purchase: Purchase) =>
  emailLayout(
    'Your order has been refunded',
    `
      <p>Hello ${escapeHtml(purchase.user.name)},</p>
      <p>Your order <strong>${escapeHtml(purchase.purch_reference)}</strong> of ${formatEuro(purchase.purch_total)} has been refunded. Depending on your bank, the money can take 5 to 10 days to appear on your account.</p>
      <p>Access to the courses of this order has been removed.</p>
    `,
  );
