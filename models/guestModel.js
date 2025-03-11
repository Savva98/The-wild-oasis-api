const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const guestSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
  },
  nationality: {
    type: String,
    required: [true, 'Please provide your Nationality!'],
  },
  nationalID: {
    type: String,
    required: [true, 'Please provide your National ID!'],
  },
  countryFlag: {
    type: String,
    required: [true, 'Please provide your country flag!'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  csrfToken: {
    type: String,
    default: '',
    select: false,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    select: false,
    minlength: 8,
  },
  secret: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ['guest', 'admin'],
    default: 'guest',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isMfActive: {
    type: Boolean,
    default: false,
  },
});

guestSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
guestSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 3000;
  next();
});

guestSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
guestSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

guestSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

guestSchema.methods.addCSRFToken = function () {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  this.csrfToken = crypto.createHash('sha256').update(csrfToken).digest('hex');
  return csrfToken;
};

guestSchema.methods.correctCSRFToken = function (token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return this.csrfToken === hash;
};
guestSchema.methods.addSecret = function (secret) {
  this.secret = secret;
};

guestSchema.methods.updateMfActive = async function () {
  await this.updateOne({ $set: { isMfActive: true } });
};

const Guest = mongoose.model('Guest', guestSchema);

module.exports = Guest;
