const Setting = require('../models/settingModel');
const { catchAsync } = require('../utils/catchAsync');

const getSetting = catchAsync(async (req, res, next) => {
  const settings = await Setting.find();
  res.status(200).json({
    status: 'success',
    settings,
  });
});

const updateSetting = catchAsync(async (req, res, next) => {
  const settings = await Setting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    settings,
  });
});

module.exports = {
  getSetting,
  updateSetting,
};
