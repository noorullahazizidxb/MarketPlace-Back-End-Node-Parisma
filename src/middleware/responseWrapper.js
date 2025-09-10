export function responseWrapper(req, res, next) {
  res.apiSuccess = function (data = null, message = 'OK', statusCode = 200) {
  const payload = { message, statusCode, success: true, entity: res.locals?.entityName ?? null, data };
    res.status(statusCode).json(payload);
  };

  res.apiError = function (error = 'Error', statusCode = 400, details = null) {
    const message = typeof error === 'string' ? error : error.message || 'Error';
  const payload = { message, statusCode, success: false, entity: res.locals?.entityName ?? null, error: details ?? error };
    res.status(statusCode).json(payload);
  };

  next();
}
