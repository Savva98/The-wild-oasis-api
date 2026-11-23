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

  async send(subject, mailOptions) {
    // 1) Create a transporter
    const transporter = this.newTransport();
    // 2) Define the email options
    if (!mailOptions) {
      mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        text: this.url,
      };
      await transporter.sendMail(mailOptions);
      return;
    }
    await transporter.sendMail(mailOptions);
    // 3) Actually send the email
  }

  async sendWelcome() {
    await this.send('Welcome to the Wild-Oasis!');
  }

  async sendPasswordReset() {
    await this.send('Your password reset token (valid for only 10 minutes)');
  }

  async sendPasswordUpdateVarificationCodeWirhNoMFA() {
    const subject = 'Password Update Verification Code';
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: `
        <h2>Wild Oasis Password Update Verification</h2>
        <p>Hallo ${this.firstName},</p>
        <p>We received a request to update your password. To proceed with the update, please use the verification code below:</p>
        <h3>Your Verification Code: ${this.code}</h3>
        <p>Or you could use following link if you don't want manualy enter the code</p>
        <a href="${this.url}">Click to Update Password</a>
        <p>This code is valid for the next 10 minutes. If you did not request a password update, please ignore this email.</p>
        <p>If you did not request this change, please contact our support immediately.</p>
      `,
    };
    await this.send(subject, mailOptions);
  }

  async sendTwoFactor() {
    await this.send('Two factory authonication!');
  }
  async sendTwoFactorQrCode(qrCodeDataUrl, manualKey) {
    const subject = 'Login Verification - Scan QR Code';
    const qeCodeBuffer = qrCodeDataUrl;
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
    await this.send(subject, mailOptions);
  }
}
module.exports = Email;
