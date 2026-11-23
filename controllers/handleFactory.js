const { mongo, default: mongoose } = require('mongoose');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // console.log(req);
    let limit = req.query.limit * 1 || 10;
    const feature = new ApiFeatures(Model.find(), req.query);
    let count = await Model.countDocuments();
    if (req.baseUrl.includes('bookings')) {
      if (req.query.status && req.query.status !== 'all')
        count = await Model.countDocuments({ status: req.query.status });
      feature.getBydate().getAfterDate();
      if (req.query.page && req.query.page > 1 && !req.query.cursor) {
        await feature.createCursor(count);
      }
    }
    feature.sort().limitFields().paginate().filter();
    const doc = await feature.query;
    let hasMore = false;
    const pagiantion = {};
    if (req.baseUrl.includes('bookings')) {
      const { direction = 'next' } = req.query;
      const { nextCursor, prevCursor, hasMoreDocuments } = createCursors(
        doc,
        limit,
        req.query.page * 1 || 1,
        direction,
      );
      pagiantion.nextCursor = nextCursor;
      pagiantion.prevCursor = prevCursor;
      hasMore = hasMoreDocuments;
    }
    if (!doc) {
      return next(new AppError('No document found', 404));
    }
    res.status(200).json({
      status: 'success',
      results: doc.length,
      totalDocuments: count,
      hasMore,
      [Model.collection.name]: doc,
      pagination: pagiantion,
    });
  });

const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid ID format', 400));
    }
    const query = Model.findById(req.params.id);
    if (popOptions) query.populate(popOptions);
    const document = await query;
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      [Model.collection.name]: document,
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

const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      [Model.collection.name]: document,
    });
  });

const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      [Model.collection.name]: document,
    });
  });
function createCursors(documents, limit, page, direction = 'next') {
  let nextCursor = null;
  let prevCursor = null;
  let hasMoreDocuments = false;
  if (direction === 'previous') {
    documents.reverse();
    hasMoreDocuments = true;
  }
  if (
    documents.length > 0 &&
    documents.length === limit + 1 &&
    direction === 'next'
  ) {
    const pointerForaCursor = documents.length - limit + 1;
    nextCursor = documents[documents.length - pointerForaCursor]._id;
  } else if (documents.length > 0 && direction === 'previous') {
    nextCursor = documents[documents.length - 1]._id;
  }
  prevCursor = documents[0]._id;

  if (documents.length > limit && direction === 'next') {
    documents.pop();
    hasMoreDocuments = true;
  }
  if (page === 1) {
    prevCursor = null;
  }
  return { nextCursor, prevCursor, hasMoreDocuments };
}

module.exports = { getAll, getOne, deleteOne, updateOne, createOne };
