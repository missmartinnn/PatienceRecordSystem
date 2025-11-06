import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

describe("Authorization Tests", () => {
  let doctorToken
  let adminToken
  let recordId
  let patientId

  beforeEach(async () => {
    // Register regular doctor
    const doctorRes = await request(app).post("/api/auth/register").send({
      name: "Dr. Regular",
      email: "doctor@hospital.com",
      password: "password123",
      specialization: "General",
      licenseNumber: "LIC111",
      phone: "+1111111111",
    })
    doctorToken = doctorRes.body.token

    // Register admin doctor
    const adminRes = await request(app).post("/api/auth/register").send({
      name: "Dr. Admin",
      email: "admin@hospital.com",
      password: "password123",
      specialization: "Administration",
      licenseNumber: "LIC222",
      phone: "+2222222222",
      role: "admin",
    })
    adminToken = adminRes.body.token

    // Create patient
    const patientRes = await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        firstName: "Test",
        lastName: "Patient",
        dateOfBirth: "1990-01-01",
        gender: "male",
        phone: "+3333333333",
        emergencyContact: {
          name: "Emergency Contact",
          phone: "+4444444444",
        },
      })
    patientId = patientRes.body.data._id

    // Create medical record
    const recordRes = await request(app)
      .post("/api/medical-records")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patient: patientId,
        chiefComplaint: "Test complaint",
        diagnosis: "Test diagnosis",
      })
    recordId = recordRes.body.data._id
  })

  describe("Role-based Access Control", () => {
    test("regular doctor should not delete other doctors medical records", async () => {
      // Create another doctor
      const otherDoctorRes = await request(app).post("/api/auth/register").send({
        name: "Dr. Other",
        email: "other@hospital.com",
        password: "password123",
        specialization: "Other",
        licenseNumber: "LIC333",
        phone: "+5555555555",
      })
      const otherDoctorToken = otherDoctorRes.body.token

      const res = await request(app)
        .delete(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`)

      expect(res.statusCode).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("not authorized")
    })

    test("admin should be able to delete medical records", async () => {
      const res = await request(app)
        .delete(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${adminToken}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe("Protected Routes", () => {
    test("should require authentication for all patient routes", async () => {
      const res = await request(app).get("/api/patients")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should require authentication for all medical record routes", async () => {
      const res = await request(app).get("/api/medical-records")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should require authentication for all appointment routes", async () => {
      const res = await request(app).get("/api/appointments")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe("Ownership Validation", () => {
    let otherDoctorToken

    beforeEach(async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Dr. Other",
        email: "other@hospital.com",
        password: "password123",
        specialization: "Other",
        licenseNumber: "LIC333",
        phone: "+5555555555",
      })
      otherDoctorToken = res.body.token
    })

    test("doctor should not update another doctors medical record", async () => {
      const res = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`)
        .send({ notes: "Trying to update" })

      expect(res.statusCode).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })
})
