import express from "express"
import {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getPatientHistory,
} from "../controllers/medicalRecordController.js"
import { protect, authorize } from "../middleware/auth.js"
import { medicalRecordValidation, idValidation, patientIdValidation, validate } from "../middleware/validator.js"

const router = express.Router()

router.use(protect)

router.route("/").post(medicalRecordValidation, validate, createMedicalRecord).get(getMedicalRecords)

router.get("/patient/:patientId/history", patientIdValidation, validate, getPatientHistory)

router
  .route("/:id")
  .get(idValidation, validate, getMedicalRecord)
  .put(idValidation, validate, updateMedicalRecord)
  .delete(idValidation, validate, authorize("admin"), deleteMedicalRecord)

export default router
