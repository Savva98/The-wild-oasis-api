exports.catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

exports.catchAsyncWithArgs = function (fn) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      console.log('Arguments passed to catchAsyncWithArgs:', args);
      return fn.apply(null, args).catch(lastArg);
    }
    return fn.apply(null, args).catch(function (err) {
      console.error('Error in catchAsyncWithArgs:', err);
      throw err;
    });
  };
};
