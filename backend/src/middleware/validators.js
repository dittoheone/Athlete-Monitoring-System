const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

// Register validation
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['medis', 'pelatih'])
    .withMessage('Role must be either "medis" or "pelatih"'),
  body('teamId')
    .isInt({ min: 1 })
    .withMessage('Valid team ID is required'),
  handleValidationErrors
];

// Athlete validation
const validateAthlete = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Athlete name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('position')
    .isIn(['Striker', 'Midfielder', 'Defender', 'Goalkeeper'])
    .withMessage('Position must be Striker, Midfielder, Defender, or Goalkeeper'),
  handleValidationErrors
];

// Assessment validation
const validateAssessment = [
  body('athleteId')
    .isInt({ min: 1 })
    .withMessage('Valid athlete ID is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('weight')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Weight must be between 30 and 200 kg'),
  body('metrics')
    .isObject()
    .withMessage('Metrics must be an object'),
  handleValidationErrors
];

// ID parameter validation
const validateIdParam = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`Valid ${paramName} is required`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateAthlete,
  validateAssessment,
  validateIdParam
};
