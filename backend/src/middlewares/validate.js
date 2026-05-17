function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join('; '));
      err.status = 400;
      err.details = error.details;
      return next(err);
    }
    req[property] = value;
    next();
  };
}

export { validate };
