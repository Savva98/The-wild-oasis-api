const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const {
  desktopOperationSystems,
  mobileOperationSystems,
} = require('../consts/constantValues');

const parseAgentandReturnResult = (userAgent) => {
  const parser = new UAParser(userAgent);
  return parser.getResult();
};

const getDevice = (userAgent, ipAddress) => {
  const result = parseAgentandReturnResult(userAgent);
  let deviceType;
  if (!result.device || !result.device.type) {
    if (result.os && result.os.name) {
      if (desktopOperationSystems.includes(result.os.name)) {
        deviceType = 'desktop';
      } else if (mobileOperationSystems.includes(result.os.name)) {
        deviceType = 'mobile';
      } else {
        deviceType = 'unknown';
      }
    }
  } else {
    deviceType = result.device.type;
  }
  deviceSignature = {
    type: deviceType,
    browser: result.browser.name,
    os: result.os.name,
    userAgent: userAgent,
    browserVersion: result.browser.version,
    osVersion: result.os.version,
  };
  if (ipAddress) {
    deviceSignature.ipAddress = ipAddress;
  }
  return deviceSignature;
};

/**
 * Creates a unique device identifier from multiple factors
 * This ensures devices are uniquely identified even on the same network
 */
const createDeviceId = (userAgent, req) => {
  const deviceSignature = getDevice(userAgent);
  // Create a hash from the combined device info
  const combined = JSON.stringify(deviceSignature);
  const deviceId = crypto.createHash('sha256').update(combined).digest('hex');
  return deviceId;
};

/**
 * Parse device information from User-Agent and request
 */
const parseDeviceInfo = (userAgent, req) => {
  const result = parseAgentandReturnResult(userAgent);
  const deviceInfo = getDevice(userAgent, req.ip);
  deviceInfo.deviceId = createDeviceId(userAgent, req);
  deviceInfo.deviceName = generateDeviceName(result);
  return deviceInfo;
};

/**
 * Generate a human-readable device name
 */
const generateDeviceName = (parsedUA) => {
  const browser = parsedUA.browser.name || 'Unknown Browser';
  const os = parsedUA.os.name || 'Unknown OS';
  const deviceType = parsedUA.device.type || 'desktop';

  if (deviceType === 'mobile' || deviceType === 'tablet') {
    return `${os} ${deviceType} - ${browser}`;
  }

  return `${os} ${deviceType} - ${browser}`;
};

/**
 * Compare if two devices are the same (more lenient check)
 */
const isSameDevice = (device1, device2) => {
  return (
    device1.os === device2.os &&
    device1.browser === device2.browser &&
    device1.type === device2.type &&
    device1.userAgent === device2.userAgent
  );
};

module.exports = {
  createDeviceId,
  parseDeviceInfo,
  generateDeviceName,
  isSameDevice,
};
