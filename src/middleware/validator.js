import { body, param, validationResult } from "express-validator"

export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    })
  }
  next()
}

// Doctor validation rules
export const doctorRegisterValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("specialization").trim().notEmpty().withMessage("Specialization is required"),
  body("licenseNumber").trim().notEmpty().withMessage("License number is required"),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
]

export const doctorLoginValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
]

// Patient validation rules
export const patientValidation = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("dateOfBirth").isISO8601().withMessage("Valid date of birth is required"),
  body("gender").isIn(["male", "female", "other"]).withMessage("Gender must be male, female, or other"),
  body("phone").trim().notEmpty().withMessage("Phone number is required").matches(/^\+?[1-9]\d{1,14}$/).withMessage("Please provide a valid phone number"),
  body("emergencyContact.name").trim().notEmpty().withMessage("Emergency contact name is required"),
  body("emergencyContact.phone").trim().notEmpty().withMessage("Emergency contact phone is required"),
]

export const updatePatientValidation = [
  body("firstName").optional().trim().notEmpty().withMessage("First name is required"),
  body("lastName").optional().trim().notEmpty().withMessage("Last name is required"),
  body("dateOfBirth").optional().isISO8601().withMessage("Valid date of birth is required"),
  body("gender").optional().isIn(["male", "female", "other"]).withMessage("Gender must be male, female, or other"),
  body("phone").optional().trim().notEmpty().withMessage("Phone number is required"),
  body("emergencyContact.name").optional().trim().notEmpty().withMessage("Emergency contact name is required"),
  body("emergencyContact.phone").optional().trim().notEmpty().withMessage("Emergency contact phone is required"),
]

// Medical record validation rules
export const medicalRecordValidation = [
  body("patient").notEmpty().withMessage("Patient ID is required"),
  body("chiefComplaint").trim().notEmpty().withMessage("Chief complaint is required"),
  body("diagnosis").trim().notEmpty().withMessage("Diagnosis is required"),
]

// Appointment validation rules
export const appointmentValidation = [
  body("patient").notEmpty().withMessage("Patient ID is required"),
  body("doctor").notEmpty().withMessage("Doctor ID is required"),
  body("appointmentDate").isISO8601().withMessage("Valid appointment date is required"),
  body("appointmentTime").trim().notEmpty().withMessage("Appointment time is required"),
  body("reason").trim().notEmpty().withMessage("Reason is required"),
]

export const idValidation = [param("id").isMongoId().withMessage("Invalid ID format")]

export const doctorIdValidation = [param("doctorId").isMongoId().withMessage("Invalid doctor ID format")]

export const patientIdValidation = [param("patientId").isMongoId().withMessage("Invalid patient ID format")]
