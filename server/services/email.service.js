const nodemailer = require('nodemailer');

// In-memory store for recent sent emails (for demo preview in browser)
const sentEmailsLog = [];

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('📧 Configured real SMTP email transporter.');
  } else {
    // Development fallback transporter (generates test preview URLs)
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'irctc.demo@ethereal.email',
        pass: 'irctc_demo_pass'
      }
    });
  }

  return transporter;
}

/**
 * Generate official IRCTC-style HTML E-Ticket
 */
function generateTicketHtml(booking) {
  const { pnr, trainName, trainType, serviceDate, fromStation, toStation, passengers, totalAmount, paymentStatus, userEmail } = booking;

  const passengerRows = (passengers || []).map((p, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 10px; font-weight: 600; color: #1e293b;">#${idx + 1} ${p.name || p.Passenger_Name}</td>
      <td style="padding: 10px; color: #475569;">${p.age || p.Passenger_Age} / ${p.gender || p.Passenger_Gender}</td>
      <td style="padding: 10px;">
        <span style="background: ${(p.status || p.Ticket_Status) === 'CONFIRMED' ? '#dcfce7' : '#fef3c7'}; color: ${(p.status || p.Ticket_Status) === 'CONFIRMED' ? '#166534' : '#92400e'}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">
          ${p.status || p.Ticket_Status}
        </span>
      </td>
      <td style="padding: 10px; font-weight: 700; color: #0f172a;">
        ${(p.seatNumber || p.Seat_Number) ? `${p.coachType || p.Coach_Type || 'AC'} • ${p.seatNumber || p.Seat_Number}` : 'WAITLIST (WL)'}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>IRCTC Electronic Reservation Slip (ERS)</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%); color: #ffffff; padding: 24px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px;">🇮🇳 INDIAN RAILWAYS (IRCTC)</div>
          <div style="font-size: 13px; color: #93c5fd; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">Electronic Reservation Slip (ERS) — Confirmed Ticket</div>
        </div>

        <!-- PNR Highlight Card -->
        <div style="background: #f8fafc; border-bottom: 2px dashed #cbd5e1; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">PNR NUMBER</div>
            <div style="font-size: 26px; font-weight: 900; color: #b91c1c; letter-spacing: 2px;">${pnr}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">PAYMENT STATUS</div>
            <div style="font-size: 14px; font-weight: 700; color: #16a34a;">${paymentStatus || 'SUCCESS (VERIFIED)'}</div>
          </div>
        </div>

        <!-- Journey Summary -->
        <div style="padding: 24px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: 800; color: #1e3a8a; margin-bottom: 6px;">
              🚆 ${trainName} (${trainType})
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #334155;">
              <div><strong>From:</strong> ${fromStation?.Name || fromStation || 'Origin'}</div>
              <div>➔</div>
              <div><strong>To:</strong> ${toStation?.Name || toStation || 'Destination'}</div>
            </div>
            <div style="margin-top: 8px; font-size: 13px; color: #475569;">
              <strong>Journey Date:</strong> ${serviceDate} • <strong>Transaction Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </div>
          </div>

          <!-- Passenger Table -->
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Passenger Allocation Details:</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0a192f; color: #ffffff; text-align: left;">
                <th style="padding: 10px;">Passenger Name</th>
                <th style="padding: 10px;">Age / Gender</th>
                <th style="padding: 10px;">Status</th>
                <th style="padding: 10px;">Coach / Seat</th>
              </tr>
            </thead>
            <tbody>
              ${passengerRows}
            </tbody>
          </table>

          <!-- Fare Summary -->
          <div style="border-top: 2px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; color: #64748b;">
              Passenger Email: <strong>${userEmail || 'Registered Passenger'}</strong><br>
              Valid along with original Government ID (Aadhaar / Voter ID / Passport / Driving License).
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b;">Total Amount Paid</div>
              <div style="font-size: 22px; font-weight: 800; color: #0a192f;">₹${parseFloat(totalAmount || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
          This is an official computer-generated confirmation slip from the Railway Management System.<br>
          For cancellation or PNR status, visit the online portal. Have a safe journey!
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch booking confirmation email
 */
async function sendBookingConfirmationEmail(booking) {
  try {
    const htmlContent = generateTicketHtml(booking);
    const toEmail = booking.userEmail || 'passenger@railway.gov.in';

    // Log in memory for live UI inspection
    const emailRecord = {
      id: 'EMAIL-' + Date.now(),
      to: toEmail,
      pnr: booking.pnr,
      trainName: booking.trainName,
      subject: `🚆 IRCTC Booking Confirmation — PNR: ${booking.pnr} (${booking.trainName})`,
      timestamp: new Date().toISOString(),
      html: htmlContent,
      status: 'SENT'
    };

    sentEmailsLog.unshift(emailRecord);
    if (sentEmailsLog.length > 50) sentEmailsLog.pop();

    console.log(`📧 [EMAIL SERVICE] Dispatching confirmation email for PNR ${booking.pnr} to ${toEmail}...`);

    // Attempt SMTP dispatch
    try {
      const trans = await getTransporter();
      const info = await trans.sendMail({
        from: '"Indian Railways (IRCTC)" <reservations@irctc.gov.in>',
        to: toEmail,
        subject: `🚆 IRCTC Booking Confirmation — PNR: ${booking.pnr} (${booking.trainName})`,
        html: htmlContent
      });

      console.log(`✅ [EMAIL SERVICE] Email sent! MessageId: ${info.messageId}`);
      emailRecord.messageId = info.messageId;
    } catch (smtpErr) {
      // In dev or without external SMTP credentials, log safely and record as simulated success
      console.log(`ℹ️ [EMAIL SERVICE] SMTP notice: ${smtpErr.message}. Simulated email preview saved successfully for PNR ${booking.pnr}.`);
      emailRecord.note = 'Simulated Delivery (Live in-app preview available)';
    }

    return { success: true, emailRecord };
  } catch (err) {
    console.error('❌ Failed to generate/send confirmation email:', err);
    return { success: false, error: err.message };
  }
}

function getRecentEmails() {
  return sentEmailsLog;
}

function getEmailByPnr(pnr) {
  return sentEmailsLog.find((e) => e.pnr === pnr) || null;
}

module.exports = {
  sendBookingConfirmationEmail,
  generateTicketHtml,
  getRecentEmails,
  getEmailByPnr
};
