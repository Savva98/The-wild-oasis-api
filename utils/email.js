const Transporter = require('./Transporter');

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
}

module.exports = Email;
