const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // let filter = {};
    // if(Model.collection.name === '')
    const feature = new ApiFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await feature.query;
    if (!doc) {
      return next(new AppError('No document found', 404));
    }
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        [Model.collection.name]: doc,
      },
    });
  });

const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const query = Model.findById(req.params.id);
    if (popOptions) query.populate(popOptions);
    const document = await query;
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        [Model.collection.name]: document,
      },
    });
  });

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

module.exports = { getAll, getOne, deleteOne };
