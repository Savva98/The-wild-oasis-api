const Guest = require('../models/guestModel');
const AppError = require('../utils/appError');
const { getAll, getOne, deleteOne } = require('./handleFactory');

const checkUploadedData = (req, res, next) => {
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
const getAllGuests = getAll(Guest);
const getGuest = getOne(Guest);
module.exports = { getAllGuests, getGuest };
