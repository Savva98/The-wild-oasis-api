const AppError = require('../utils/appError');
const { allowedFields } = require('../consts/constantValues');

const sanitizeQuery = (query) => {
  const allowedOperators = ['$gte', '$lte', '$gt', '$lt'];

  const sanitizedQuery = {};
  Object.keys(query).forEach((key) => {
    if (!allowedFields.includes(key)) {
      throw new AppError(`Filtering by ${key} is not allowed`, 400);
    }
    const value = query[key];
    if (
      typeof key === 'string' &&
      key.startsWith('$') &&
      !allowedOperators.includes(key)
    )
      return;
    if (typeof value === 'string' && value.startsWith('$')) return;
    if (typeof value === 'string') {
      sanitizedQuery[key] = value.replace(/\$/g, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitizedQuery[key] = sanitizeQuery(value);
    } else {
      sanitizedQuery[key] = value;
    }
  });
  return sanitizedQuery;
};
module.exports = { sanitizeQuery };
