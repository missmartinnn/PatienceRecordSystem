import MedicalRecord from "../models/MedicalRecord.js"
import Patient from "../models/Patient.js"

// @desc    Create a new medical record
// @route   POST /api/medical-records
// @access  Private
export const createMedicalRecord = async (req, res, next) => {
  try {
    // Verify patient exists
    const patient = await Patient.findById(req.body.patient)
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      })
    }

    req.body.doctor = req.user.id
    const medicalRecord = await MedicalRecord.create(req.body)

    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate("patient", "firstName lastName dateOfBirth gender")
      .populate("doctor", "name specialization")

    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data: populatedRecord,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get all medical records
// @route   GET /api/medical-records
// @access  Private
export const getMedicalRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, patient, doctor } = req.query

    const query = {}

    if (patient) {
      query.patient = patient
    }

    if (doctor) {
      query.doctor = doctor
    } else {
      // Default to current doctor's records if no doctor specified
      query.doctor = req.user.id
    }

    const medicalRecords = await MedicalRecord.find(query)
      .populate("patient", "firstName lastName dateOfBirth gender")
      .populate("doctor", "name specialization")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ visitDate: -1 })

    const count = await MedicalRecord.countDocuments(query)

    res.status(200).json({
      success: true,
      count: medicalRecords.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: medicalRecords,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get single medical record
// @route   GET /api/medical-records/:id
// @access  Private
export const getMedicalRecord = async (req, res, next) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id)
      .populate("patient", "firstName lastName dateOfBirth gender phone")
      .populate("doctor", "name specialization licenseNumber")

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      })
    }

    res.status(200).json({
      success: true,
      data: medicalRecord,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update medical record
// @route   PUT /api/medical-records/:id
// @access  Private
export const updateMedicalRecord = async (req, res, next) => {
  try {
    let medicalRecord = await MedicalRecord.findById(req.params.id)

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      })
    }

    // Only the doctor who created the record can update it
    if (medicalRecord.doctor.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this medical record",
      })
    }

    medicalRecord = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("patient", "firstName lastName")
      .populate("doctor", "name specialization")

    res.status(200).json({
      success: true,
      message: "Medical record updated successfully",
      data: medicalRecord,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete medical record
// @route   DELETE /api/medical-records/:id
// @access  Private
export const deleteMedicalRecord = async (req, res, next) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id)

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      })
    }

    // Only the doctor who created the record or admin can delete it
    if (medicalRecord.doctor.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this medical record",
      })
    }

    await MedicalRecord.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "Medical record deleted successfully",
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get patient medical history
// @route   GET /api/medical-records/patient/:patientId/history
// @access  Private
export const getPatientHistory = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.patientId)

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      })
    }

    const medicalRecords = await MedicalRecord.find({
      patient: req.params.patientId,
    })
      .populate("doctor", "name specialization")
      .sort({ visitDate: -1 })

    res.status(200).json({
      success: true,
      count: medicalRecords.length,
      data: {
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
        },
        records: medicalRecords,
      },
    })
  } catch (error) {
    next(error)
  }
}
