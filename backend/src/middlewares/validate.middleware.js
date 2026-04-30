import { ApiError } from "../utils/apiError.js";

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    return next(new ApiError(400, "Validation failed", result.error.flatten()));
  }

  req.body = result.data.body;
  req.query = result.data.query;
  req.params = result.data.params;
  next();
};
