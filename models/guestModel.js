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
  csrfTokenExpires: {
    type: Date,
    default: Date.now() + 10 * 60 * 1000,
    select: false,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    select: false,
    minlength: 8,
  },
  totpSecret: {
    type: String,
    required: true,
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
  totpExpires: {
    type: Date,
    default: Date.now() + 10 * 60 * 1000,
    select: false,
  },
  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
  authenticated: {
    type: Boolean,
    default: false,
    select: false,
  },
  isMfActive: {
    type: Boolean,
    default: false,
  },
  devices: [
    {
      deviceId: {
        type: String,
        required: true,
      },
      deviceName: {
        type: String,
        default: 'Unknown Device',
      },
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop'],
        required: true,
      },
      os: {
        type: String,
        required: true,
      },
      osVersion: String,
      browser: {
        type: String,
        required: true,
      },
      browserVersion: String,
      userAgent: String,
      ipAddress: String,
      lastLogin: {
        type: Date,
        default: Date.now,
      },
      loginCount: {
        type: Number,
        default: 1,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
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
  const match = await bcrypt.compare(candidatePassword, userPassword);
  return match;
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

guestSchema.methods.addCSRFToken = async function () {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(csrfToken).digest('hex');
  await this.updateOne({
    $set: { csrfToken: hash, csrfTokenExpires: Date.now() + 120 * 60 * 1000 },
  });
  return csrfToken;
};

guestSchema.methods.correctCSRFToken = function (token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return this.csrfToken === hash;
};
guestSchema.methods.addSecret = async function (secret) {
  this.totpSecret = secret;
  if (!this.isMfActive) {
    this.totpExpires = Date.now() + 10 * 60 * 1000;
    await this.updateOne({
      $set: { totpExpires: this.totpExpires },
      $set: { totpSecret },
    });
    return secret;
  }
  await this.updateOne({
    $set: { totpSecret },
  });
  return secret;
};
guestSchema.methods.updateIsAuthenticated = async function (isAuthenticated) {
  await this.updateOne({ $set: { isAuthenticated } });
};

guestSchema.methods.updateMfActive = async function () {
  await this.updateOne({ $set: { isMfActive: true } });
};
guestSchema.methods.addDevice = async function (deviceInfo) {
  // Check if device already exists by deviceId
  if (!this.devices) {
    this.devices = [];
  }
  const existingDeviceIndex = this.devices.findIndex(
    (d) => d.deviceId === deviceInfo.deviceId,
  );

  if (existingDeviceIndex !== -1) {
    // Update existing device
    this.devices[existingDeviceIndex].lastLogin = Date.now();
    this.devices[existingDeviceIndex].loginCount += 1;
    this.devices[existingDeviceIndex].ipAddress = deviceInfo.ipAddress;
  } else {
    // Add new device
    this.devices.push(deviceInfo);
    await this.updateOne({
      $set: { devices: this.devices },
    });
  }

  return this.devices;
};

guestSchema.methods.removeDevice = async function (deviceId) {
  this.devices = this.devices.filter((d) => d.deviceId !== deviceId);
  await this.save();
  return this.devices;
};

guestSchema.methods.deactivateDevice = async function (deviceId) {
  const device = this.devices.find((d) => d.deviceId === deviceId);
  if (device) {
    device.isActive = false;
  }
  await this.save();
  return device;
};

guestSchema.methods.getActiveDevices = function () {
  return this.devices.filter((d) => d.isActive);
};

guestSchema.methods.getDeviceByFingerprint = function (deviceId) {
  return this.devices.find((d) => d.deviceId === deviceId);
};

const Guest = mongoose.model('Guest', guestSchema);

module.exports = Guest;
