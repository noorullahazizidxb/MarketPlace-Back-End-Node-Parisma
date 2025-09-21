import Joi from 'joi';

export const contactSchema = Joi.object({
  phone: Joi.string().optional(),
  whatsapp: Joi.string().optional(),
  email: Joi.string().email().optional(),
  telegram: Joi.string().optional(),
  preferred: Joi.string().valid('phone','whatsapp','email','telegram').optional(),
  linkedIn:Joi.string().optional(),
  facebook:Joi.string().optional(),
  instagram:Joi.string().optional(),
  website:Joi.string().optional()
}).optional();

export const addressSchema = Joi.object({
  street: Joi.string().optional(),
  city: Joi.string().optional(),
  country: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  unit: Joi.string().optional()
}).optional();

export const createUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  photo: Joi.string().optional(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  fullName: Joi.string().max(200).optional(),
  contacts: contactSchema,
  address: addressSchema,
  metadata: Joi.object().optional()
});

export const updateUserSchema = createUserSchema.keys({
  email: Joi.string().email().optional()
});
