const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Guest = require('../models/guestModel');
const { createSendToken } = require('../controllers/securetyController');

class PasskeyFeature {
  #guestSchema = {
    type: 'object',
    properties: {
      passkeys: {
        type: 'array',
        items: {
          credentialID: { type: 'string', requered: true },
          credeantialPublicKey: { type: 'Buffer', requered: true },
          counter: { type: 'number', requered: true },
          deviceType: {
            type: 'string',
            enum: ['singleDevice', 'multiDevice'],
            requered: true,
          },
          backedUp: { type: 'boolean', requered: true },
          transports: {
            type: 'strign',
            enum: ['ble', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'],
          },
          friendlyName: { type: 'string' },
          createdAt: { type: 'Date', default: Date.now },
          lastUsed: { type: 'Date' },
        },
      },
      currentChanllenge: { type: 'string' },
      passwordFallback: { type: 'boolean', default: false },
    },
  };
  #rpID =
    process.env.NODE_ENV === 'production' ? 'wildoasishotel.com' : 'localhost';
  #origin =
    process.env.NODE_ENV === 'production'
      ? `https://${this.#rpID}`
      : `http://${this.#rpID}:5173`;
  constructor() {
    this.name = 'Passkey Authentication';
    this.description =
      'This feature allows users to authenticate using passkeys.';
    this.implemented = false;
    this.rpName = 'Wild Oasis Hotel';
  }

  beginRegistration = catchAsync(async (req, res, next) => {
    const user = req.user;
    const options = generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.#rpID,
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: user.fullName,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        type: 'public-key',
        transports: pk.transports,
      })),
      authenticatorSelection: {
        residentKey: 'prefered',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });
    await Guest.findByIdAndUpdate(user._id, {
      currentChanllenge: options.challenge,
    });
    res.status(200).json({
      status: 'success',
      data: options,
    });
  });
  completeRegistration = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { body } = req;
    const expectedChallenge = user.currentChanllenge;
    if (!expectedChallenge) {
      return next(
        new AppError('No registration challenge found for user', 400),
      );
    }
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: expectedChallenge,
        expectedOrigin: this.#origin,
        expectedRPID: this.#rpID,
      });
    } catch (error) {
      return next(new AppError('Passkey registration failed', 400));
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return next(new AppError('Passkey registration not verified', 400));
    }
    const {
      credential,
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;
    const newPasskey = {
      credentialID: Buffer.from(credentialID).toString('base64url'),
      credentialPublicKey,
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports || [],
      friendlyName: body.friendlyName || 'Unknown device',
      lastUsed: new Date(),
    };
    await Guest.findByIdAndUpdate(user._id, {
      $push: { passkeys: newPasskey },
      $unset: { currentChanllenge: 1 },
    });
    res.status(200).json({
      status: 'success',
      message: 'Passkey registered successfully',
      data: {
        credentialID: newPasskey.credentialID,
        friendlyName: newPasskey.friendlyName,
      },
    });
  });
  beginAuthentication = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Email is required for authentication', 400));
    }
    const user = await Guest.findOne({ email }).select('+passkeys');
    if (!user || user.passkeys.length === 0) {
      return next(new AppError('No passkeys found for this user', 400));
    }
    const options = await generateAuthenticationOptions({
      rpID: this.#rpID,
      allowCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        type: 'public-key',
        transports: pk.transports,
      })),
      userVerification: 'preferred',
    });
    await Guest.findByIdAndUpdate(user._id, {
      currentChanllenge: options.challenge,
    });
    res.status(200).json({
      status: 'success',
      data: options,
    });
  });
  compeletePasskeyAuthentication = catchAsync(async (req, res, next) => {
    const { body } = req;
    const { credentialID } = body;
    const user = await Guest.findOne({
      'passkeys.credentialID': credentialID,
    }).select('+passkeys');
    if (!user || !user.currentChanllenge) {
      return next(new AppError('Authentication failed', 401));
    }
    const passkey = user.passkeys.find((p) => p.credentialID === credentialID);
    if (!passkey) {
      return next(new AppError('Passkey not found', 400));
    }
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: user.currentChanllenge,
        expectedOrigin: this.#origin,
        expectedRPID: this.#rpID,
        authenticator: {
          credentialID: Buffer.from(passkey.credentialID, 'base64url'),
          credeantialPublicKey: passkey.credentialPublicKey,
          counter: passkey.counter,
          transports: passkey.transports,
        },
      });
    } catch (error) {
      console.log('Passkey verification error:', error);
      return next(new AppError('Authentication verification failed', 401));
    }
    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return next(new AppError('Passkey authentication not verified', 401));
    }
    await Guest.findByIdAndUpdate(
      { _id: user._id, 'passkeys.credentialID': credentialID },
      {
        $set: {
          'passkeys.$.counter': authenticationInfo.newCounter,
          'passkeys.$.lastUsed': new Date(),
        },
        $unset: { currentChanllenge: 1 },
      },
    );
    createSendToken(user, 200, req, res);
  });

  getUserPasskeys = catchAsync(async (req, res, next) => {
    const passkeys = req.user.passkeys.map((pk) => ({
      id: pk.credentialID,
      credentialID: pk.credentialID,
      friendlyName: pk.friendlyName,
      deviceType: pk.deviceType,
      createdAt: pk.createdAt,
      lastUsed: pk.lastUsed,
      transports: pk.transports,
    }));
    res.status(200).json({
      status: 'success',
      data: passkeys,
    });
  });

  deletePasskey = catchAsync(async (req, res, next) => {
    const { passkeyID } = req.params;
    const user = await Guest.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { passkeys: { _id: passkeyID } },
      },
      { new: true },
    );
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.status(200).json({
      status: 'success',
      message: 'Passkey deleted successfully',
    });
  });
}

module.exports = new PasskeyFeature();
