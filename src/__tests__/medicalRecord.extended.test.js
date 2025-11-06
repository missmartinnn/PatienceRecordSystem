import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

describe("Extended Medical Record Tests", () => {
  let token
  let patientId
  let recordId

  beforeEach(async () => {
    // Register doctor
    const doctorRes = await request(app).post("/api/auth/register").send({
      name: "Dr. Test",
      email: "test@hospital.com",
      password: "password123",
      specialization: "General",
      licenseNumber: "LIC999",
      phone: "+1111111111",
    })
    token = doctorRes.body.token

    // Create patient
    const patientRes = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        gender: "female",
        phone: "+1234567890",
        emergencyContact: {
          name: "John Doe",
          phone: "+0987654321",
        },
      })
    patientId = patientRes.body.data._id
  })

  const recordData = {
    chiefComplaint: "Fever and headache",
    diagnosis: "Viral infection",
    symptoms: ["fever", "headache", "fatigue"],
    vitalSigns: {
      temperature: 38.5,
      bloodPressure: "120/80",
      heartRate: 80,
    },
    prescriptions: [
      {
        medication: "Paracetamol",
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "5 days",
      },
    ],
  }

  describe("GET /api/medical-records/:id", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...recordData, patient: patientId })
      recordId = res.body.data._id
    })

    test("should get single medical record", async () => {
      const res = await request(app).get(`/api/medical-records/${recordId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("_id", recordId)
      expect(res.body.data).toHaveProperty("patient")
      expect(res.body.data).toHaveProperty("doctor")
    })

    test("should return 404 for non-existent record", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app).get(`/api/medical-records/${fakeId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("not found")
    })
  })

  describe("PUT /api/medical-records/:id - Extended", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...recordData, patient: patientId })
      recordId = res.body.data._id
    })

    test("should update medical record with new notes", async () => {
      const newNotes = "Patient recovering well, follow up in 2 weeks"
      const res = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ notes: newNotes })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("notes", newNotes)
    })

    test("should update medical record with new prescriptions", async () => {
      const newPrescriptions = [
        {
          medication: "Ibuprofen",
          dosage: "400mg",
          frequency: "Three times daily",
          duration: "7 days",
        },
      ]
      const res = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ prescriptions: newPrescriptions })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should return 404 when updating non-existent record", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app)
        .put(`/api/medical-records/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ notes: "Updated" })

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })

    test("should prevent non-creator from updating record", async () => {
      // Register another doctor
      const otherDoctorRes = await request(app).post("/api/auth/register").send({
        name: "Dr. Other",
        email: "other@hospital.com",
        password: "password123",
        specialization: "Pediatrics",
        licenseNumber: "LIC888",
        phone: "+2222222222",
      })
      const otherToken = otherDoctorRes.body.token

      const res = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ notes: "Updated by other" })

      expect(res.statusCode).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("Not authorized")
    })
  })

  describe("DELETE /api/medical-records/:id", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...recordData, patient: patientId })
      recordId = res.body.data._id
    })

    test("should delete medical record", async () => {
      const res = await request(app).delete(`/api/medical-records/${recordId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should return 404 when deleting non-existent record", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app).delete(`/api/medical-records/${fakeId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe("GET /api/medical-records/patient/:patientId/history - Extended", () => {
    beforeEach(async () => {
      // Create multiple records
      await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...recordData,
          patient: patientId,
          chiefComplaint: "Fever",
        })

      await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...recordData,
          patient: patientId,
          chiefComplaint: "Headache",
        })
    })

    test("should get complete patient medical history", async () => {
      const res = await request(app)
        .get(`/api/medical-records/patient/${patientId}/history`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("patient")
      expect(res.body.data.patient).toHaveProperty("name")
      expect(res.body.data.patient).toHaveProperty("dateOfBirth")
      expect(res.body.data.patient).toHaveProperty("gender")
      expect(res.body.data.patient).toHaveProperty("bloodGroup")
      expect(res.body.data).toHaveProperty("records")
      expect(res.body.data.records.length).toBeGreaterThanOrEqual(2)
      expect(res.body.count).toBeGreaterThanOrEqual(2)
    })

    test("should return 404 for non-existent patient history", async () => {
      const fakePatientId = "507f1f77bcf86cd799439011"
      const res = await request(app)
        .get(`/api/medical-records/patient/${fakePatientId}/history`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe("GET /api/medical-records - Extended Filtering", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...recordData, patient: patientId })
    })

    test("should filter records by doctor", async () => {
      const res = await request(app).get(`/api/medical-records?doctor=${token}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should support pagination", async () => {
      const res = await request(app).get(`/api/medical-records?page=1&limit=5`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty("currentPage")
      expect(res.body).toHaveProperty("totalPages")
      expect(res.body).toHaveProperty("total")
      expect(res.body).toHaveProperty("count")
    })
  })

  describe("POST /api/medical-records - Extended Error Cases", () => {
    test("should not create record for non-existent patient", async () => {
      const fakePatientId = "507f1f77bcf86cd799439011"
      const res = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...recordData, patient: fakePatientId })

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("Patient not found")
    })
  })
})
