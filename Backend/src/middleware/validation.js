const Joi = require('joi');
const logger = require('../utils/logger');

const urlSchema = Joi.object({
    longUrl: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required()
        .messages({
            'string.uri': 'Please provide a valid URL starting with http:// or https://',
            'any.required': 'URL is required'
        }),
    password: Joi.string()
        .min(4)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Password must be at least 4 characters long',
            'string.max': 'Password must be less than 100 characters'
        }),
    isOneTime: Joi.boolean().optional(),
    expiryHours: Joi.number()
        .integer()
        .min(1)
        .max(8760) // Max 1 year
        .optional()
        .messages({
            'number.min': 'Expiry must be at least 1 hour',
            'number.max': 'Expiry cannot exceed 8760 hours (1 year)',
            'number.base': 'Expiry must be a valid number'
        })
}).unknown(false); // Strip unknown fields

const validateShortenUrl = (req, res, next) => {
    const { error, value } = urlSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const details = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        logger.warn('Validation failed', { 
            errors: details,
            body: req.body 
        });

        return res.status(400).json({
            error: 'Validation failed',
            details: details.map(d => d.message)
        });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
};

module.exports = validateShortenUrl;
