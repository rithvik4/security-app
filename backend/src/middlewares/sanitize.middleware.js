const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value.trim().replace(/[<>]/g, "");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      next[key] = sanitizeValue(val);
    }
    return next;
  }

  return value;
};

export const sanitizeMiddleware = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};
