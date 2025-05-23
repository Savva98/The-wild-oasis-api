const multer = require('multer');
const sharp = require('sharp');
const Guest = require('../models/guestModel');
const AppError = require('../utils/appError');
const { getAll, getOne, deleteOne } = require('./handleFactory');
const { catchAsync } = require('../utils/catchAsync');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
const uploadUserPhoto = upload.single('photo');
const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `guest-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`Front-end/public/guests/${req.file.filename}`);

  next();
});

const checkUploadedData = (req, res, next) => {
  if (!req.body.name || !req.body.email) {
    return next(new AppError('Invalid data uploaded', 400));
  }
  if (
    req.user.email === req.body.email &&
    req.body.name === req.user.name &&
    !req.file
  ) {
    return next(
      new AppError(
        "Seems like your data was't changed. Make sure you put new data!",
        400,
      ),
    );
  }
  if (!req.body.email) {
    req.body.email = req.user.email;
  }
  next();
};
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};
const updateUserData = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400,
      ),
    );
  }
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  const updatedUser = await Guest.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }).select('+csrfToken +csrfTokenExpires');
  const csrfToken = await updatedUser.addCSRFToken();
  updatedUser.password = undefined;
  res.status(200).json({
    status: 'success',
    csrfToken,
    data: {
      user: updatedUser,
    },
  });
});
const getAllGuests = getAll(Guest);
const getGuest = getOne(Guest);
const deleteGuest = deleteOne(Guest);
const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
module.exports = {
  getAllGuests,
  getGuest,
  checkUploadedData,
  deleteGuest,
  uploadUserPhoto,
  getMe,
  updateUserData,
  resizeUserPhoto,
};
