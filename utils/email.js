const Transporter = require('./Transporter');
require('dotenv').config({ path: './config.env' });

class Email extends Transporter {
  constructor(user, url, code) {
    super();
    this.to = user.email;
    this.firstName = user.fullName.split(' ')[0];
    this.url = url;
    this.from = `Guest <${process.env.EMAIL_FROM}>`;
    this.code = code;
  }

  async send(subject) {
    // 1) Create a transporter
    const transporter = this.newTransport();
    // 2) Define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: this.url,
    };
    if (subject.includes('Two factory authonication!')) {
      mailOptions.text = `Your two factory code is ${this.code}`;
    }

    // 3) Actually send the email
    await transporter.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome to the Wild-Oasis!');
  }

  async sendPasswordReset() {
    await this.send('Your password reset token (valid for only 10 minutes)');
  }

  async sendTwoFactor() {
    await this.send('Two factory authonication!');
  }
  async sendTwoFactorQrCode(qrCodeDataUrl, manualKey) {
    const subject = 'Login Verification - Scan QR Code';
    const transporter = this.newTransport();
    const qeCodeBuffer = qrCodeDataUrl;
    console.log(qeCodeBuffer);
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: `
        <h2>Wild Oasis Login Verification</h2>
        <p>Hallo ${this.firstName},</p>
        <p>Someone is trying to log into your Wild Oasis account. To complete the login:</p>
      <ol>
        <li>Scan the QR code below with Google Authenticator app</li>
        <li>Enter the 6-digit code from the app on the login page</li>
      </ol>
      <img src=${qeCodeBuffer} alt="QR Code" />
      <p><strong>Manual Entry Key:</strong> ${manualKey}</p>
      <p>This verification needed to protect your account, sometimes when you will login on the webseite, we could ask a verification code, to prove that it is you currently trying to login</p>
      <p>If this wasn't you, please ignore this email and consider changing your password.</p>
    `,
      attachments: [
        {
          // filename: 'qrcode.png',
          // content: qeCodeBuffer,
          attachDataUrls: true,
          contentType: 'image/png',
          cid: 'qrcode', // same cid value as in the html img src
        },
      ],
    };
    await transporter.sendMail(mailOptions);
  }
}
module.exports = Email;
