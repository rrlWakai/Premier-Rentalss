import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingReceiptData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  propertyName: string;
  checkInDate: string;
  bookingType: "day" | "night" | "overnight";
  guests: number;
  totalAmount: number;
  downpaymentAmount: number;
  remainingBalance: number;
  specialRequests?: string;
}

/**
 * Generates HTML email template for booking receipt
 */
function generateReceiptHTML(data: BookingReceiptData): string {
  const bookingTypeLabel = {
    day: "Day Visit",
    night: "Night Stay",
    overnight: "Overnight Stay",
  }[data.bookingType];

  const formattedDate = new Date(data.checkInDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #000;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      color: #666;
      margin: 10px 0 0 0;
      font-size: 14px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      color: #000;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #000;
      font-weight: 600;
    }
    .pricing-section {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .price-row.total {
      border-top: 2px solid #e0e0e0;
      padding-top: 12px;
      font-weight: 600;
      color: #000;
      font-size: 16px;
    }
    .price-row.balance {
      color: #e67e22;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      border-top: 2px solid #f0f0f0;
      padding-top: 20px;
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
    .footer p {
      margin: 5px 0;
    }
    .confirmation-badge {
      display: inline-block;
      background-color: #27ae60;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmation</h1>
      <p>Your reservation has been confirmed</p>
    </div>

    <div class="content">
      <div class="confirmation-badge">✓ BOOKING CONFIRMED</div>

      <div class="section">
        <div class="section-title">Guest Information</div>
        <div class="detail-row">
          <span class="detail-label">Name</span>
          <span class="detail-value">${escapeHtml(data.customerName)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value">${escapeHtml(data.customerEmail)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Guests</span>
          <span class="detail-value">${data.guests}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Booking Details</div>
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${escapeHtml(data.propertyName)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking Type</span>
          <span class="detail-value">${bookingTypeLabel}</span>
        </div>
        ${
          data.specialRequests
            ? `<div class="detail-row">
          <span class="detail-label">Special Requests</span>
          <span class="detail-value">${escapeHtml(data.specialRequests)}</span>
        </div>`
            : ""
        }
      </div>

      <div class="section">
        <div class="section-title">Payment Summary</div>
        <div class="pricing-section">
          <div class="price-row">
            <span>Total Amount</span>
            <span>₱${formatCurrency(data.totalAmount)}</span>
          </div>
          <div class="price-row">
            <span>Down Payment (Required)</span>
            <span>₱${formatCurrency(data.downpaymentAmount)}</span>
          </div>
          <div class="price-row balance">
            <span>Remaining Balance (Due on arrival)</span>
            <span>₱${formatCurrency(data.remainingBalance)}</span>
          </div>
          <div class="price-row total">
            <span>Total Due Now</span>
            <span>₱${formatCurrency(data.downpaymentAmount)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="detail-row">
          <span class="detail-label">Booking ID</span>
          <span class="detail-value" style="font-family: monospace; font-size: 12px;">${data.bookingId}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing Premier Rentals!</p>
      <p>If you have any questions, please contact us at support@premierrentals.com</p>
      <p>&copy; 2024 Premier Rentals. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Formats currency with proper decimal places
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Sends a booking receipt email via Resend
 */
export async function sendBookingReceipt(data: BookingReceiptData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY not configured. Email receipt not sent.");
    return;
  }

  try {
    const html = generateReceiptHTML(data);

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "bookings@resend.dev",
      to: data.customerEmail,
      subject: `Booking Confirmation - Ref: ${data.bookingId}`,
      html,
    });

    if (response.error) {
      console.error("❌ Email sending failed:", response.error);
    } else {
      console.log("✅ Receipt email sent successfully to:", data.customerEmail);
    }
  } catch (error) {
    console.error("❌ Error sending receipt email:", error);
  }
}
