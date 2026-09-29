const nodemailer = require('nodemailer');

const getHtmlTemplate = (options) => {
  if (options.html) return options.html;
  return `
    <div style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr>
          <td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid #334155;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="text-align:center;margin-bottom:30px;">
              <h1 style="color:#6366f1;font-size:26px;font-weight:800;letter-spacing:1px;margin:0;">GLB EXAMSPHERE</h1>
              <p style="color:#94a3b8;font-size:14px;margin-top:6px;">Next-Gen Secure Examination Platform</p>
            </div>
            <div style="background:#0f172a;border-radius:12px;padding:24px;border:1px solid #334155;margin-bottom:24px;">
              <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 16px 0;">${options.message}</p>
            </div>
            <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0;text-align:center;">
              If you did not request this verification, please safely ignore this email.
            </p>
            <div style="border-top:1px solid #334155;margin-top:30px;padding-top:20px;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} GLB EXAMSPHERE. All rights reserved.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

const sendEmail = async (options) => {
  const htmlContent = getHtmlTemplate(options);
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@glbexamsphere.com').trim();
  const senderName = process.env.EMAIL_FROM_NAME || 'GLB EXAMSPHERE Support';

  // 1. Support HTTPS-based delivery via Brevo (Sendinblue) API
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY.trim(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: options.email }],
          subject: options.subject,
          htmlContent: htmlContent,
          textContent: options.message
        }),
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();
      if (res.ok) {
        console.log('✅ Message delivered via Brevo HTTPS API to', options.email);
        return true;
      }
      console.warn('Brevo API delivery notice:', data.message || JSON.stringify(data));
    } catch (apiErr) {
      console.warn('Brevo API fetch notice:', apiErr.message);
    }
  }

  // 2. Support HTTPS-based email delivery via Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddress = process.env.RESEND_FROM || 'GLB EXAMSPHERE <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: options.email,
          subject: options.subject,
          text: options.message,
          html: htmlContent
        }),
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();
      if (res.ok) {
        console.log('✅ Message delivered via Resend HTTPS API to', options.email);
        return true;
      }
      console.warn('Resend API delivery notice:', data.message || JSON.stringify(data));
    } catch (apiErr) {
      console.warn('Resend API fetch notice:', apiErr.message);
    }
  }

  // 3. SMTP Delivery via Nodemailer
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n------------------ EMAIL DEV LOG ------------------`);
      console.log(`To: ${options.email}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Message: ${options.message}`);
      console.log(`----------------------------------------------------\n`);
    }
    return true;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
    auth: {
      user: process.env.EMAIL_USER?.trim(),
      pass: process.env.EMAIL_PASS?.trim()
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER.trim()}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Message delivered via SMTP to %s | ID: %s', options.email, info.messageId);
  return true;
};

module.exports = sendEmail;
