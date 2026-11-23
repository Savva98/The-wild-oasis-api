// Example: How to integrate device tracking in your auth controller

const {
  parseDeviceInfo,
  createDeviceId,
} = require('../utils/deviceFingerprint');
const Guest = require('../models/guestModel');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Login handler with device tracking
 * deviceId is unique per OS + Browser + Device Type combination
 */

const detectDevice = catchAsync(async (req, res, next) => {
  const userAgent = req.get('User-Agent');
  const deviceInfo = parseDeviceInfo(userAgent, req);
  req.deviceInfo = deviceInfo;
  next();
});

/**
 * Get all active devices for logged-in user
 */
const getDevices = async (req, res) => {
  try {
    const user = await Guest.findById(req.user.id);
    const activeDevices = user.getActiveDevices();

    res.status(200).json({
      status: 'success',
      count: activeDevices.length,
      data: {
        devices: activeDevices,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};

/**
 * Logout from a specific device using deviceId
 * Now accurately identifies which device to logout from,
 * even if multiple devices share the same IP
 */
const logoutDevice = catchAsync(async (req, res, next) => {
  let token = req.cookies.jwt;
  if (
    !token &&
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (decoded.id) {
    const guest = await Guest.findById(decoded.id).select('+authenticated');
    if (guest) {
      await guest.updateIsAuthenticated(false);
    }
    const deviceId = createDeviceId(req.get('User-Agent'), req);
    const device = guest.getDeviceByFingerprint(deviceId);
    if (!device) {
      return next(new AppError('Device not found', 404));
    }
    await guest.deactivateDevice(deviceId);
  }
  next();
});

/**
 * Logout from all devices except current one
 */
const logoutAllOtherDevices = async (req, res) => {
  try {
    const userAgent = req.get('User-Agent');
    const { createDeviceId } = require('../utils/deviceFingerprint');
    const currentDeviceId = createDeviceId(userAgent, req);

    const user = await Guest.findById(req.user.id);

    user.devices.forEach((device) => {
      if (device.deviceId !== currentDeviceId) {
        device.isActive = false;
      }
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'All other devices have been logged out',
      activeDevices: user.getActiveDevices(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};

/**
 * Remove a device permanently
 */
const deleteDevice = catchAsync(async (req, res, next) => {
  const { deviceId } = req.body;
  const user = await Guest.findById(req.user.id);

  const device = user.getDeviceByFingerprint(deviceId);

  if (!device) {
    return next(new AppError('Device not found', 404));
  }

  await user.removeDevice(deviceId);
  next();
});

module.exports = {
  detectDevice,
  getDevices,
  logoutDevice,
  logoutAllOtherDevices,
  deleteDevice,
};
