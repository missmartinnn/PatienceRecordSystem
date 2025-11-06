import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"
import Appointment from "../models/Appointment.js"

describe("Extended Appointment Tests", () => {
  let token
  let doctorId
  let patientId
  let appointmentId

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
    doctorId = doctorRes.body.data.id

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

  describe("GET /api/appointments/:id", () => {
    beforeEach(async () => {
      const res = await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Regular checkup",
      })
      appointmentId = res.body.data._id
    })

    test("should get single appointment", async () => {
      const res = await request(app).get(`/api/appointments/${appointmentId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("_id", appointmentId)
      expect(res.body.data).toHaveProperty("patient")
      expect(res.body.data).toHaveProperty("doctor")
    })

    test("should return 404 for non-existent appointment", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app).get(`/api/appointments/${fakeId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("not found")
    })
  })

  describe("PUT /api/appointments/:id - Extended", () => {
    beforeEach(async () => {
      const res = await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Regular checkup",
      })
      appointmentId = res.body.data._id
    })

    test("should update appointment status to completed", async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "completed" })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("status", "completed")
    })

    test("should update appointment status to cancelled", async () => {
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "cancelled" })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("status", "cancelled")
    })

    test("should update appointment reason", async () => {
      const newReason = "Follow-up consultation"
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: newReason })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("reason", newReason)
    })

    test("should prevent conflicting appointment updates", async () => {
      // Create second appointment at same time
      await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-02",
        appointmentTime: "14:00",
        duration: 30,
        reason: "Checkup",
      })

      // Try to update first appointment to same time/date as second
      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          appointmentDate: "2025-12-02",
          appointmentTime: "14:00",
        })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("already booked")
    })

    test("should return 404 for non-existent appointment", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app)
        .put(`/api/appointments/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "confirmed" })

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe("DELETE /api/appointments/:id - Extended", () => {
    beforeEach(async () => {
      const res = await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Regular checkup",
      })
      appointmentId = res.body.data._id
    })

    test("should delete appointment successfully", async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify deleted
      const deletedApp = await Appointment.findById(appointmentId)
      expect(deletedApp).toBeNull()
    })

    test("should return 404 when deleting non-existent appointment", async () => {
      const fakeId = "507f1f77bcf86cd799439011"
      const res = await request(app).delete(`/api/appointments/${fakeId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe("POST /api/appointments - Extended Error Cases", () => {
    test("should not create appointment for non-existent patient", async () => {
      const fakePatientId = "507f1f77bcf86cd799439011"
      const res = await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: fakePatientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Regular checkup",
      })

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("Patient not found")
    })

    test("should not create appointment for non-existent doctor", async () => {
      const fakeDoctorId = "507f1f77bcf86cd799439011"
      const res = await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: fakeDoctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Regular checkup",
      })

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("Doctor not found")
    })
  })

  describe("GET /api/appointments/doctor/:doctorId/schedule - Extended", () => {
    beforeEach(async () => {
      // Create multiple appointments
      await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Checkup 1",
      })

      await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "14:00",
        duration: 30,
        reason: "Checkup 2",
      })
    })

    test("should get doctor schedule with all appointments", async () => {
      const res = await request(app)
        .get(`/api/appointments/doctor/${doctorId}/schedule`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("doctor")
      expect(res.body.data.doctor).toHaveProperty("id")
      expect(res.body.data.doctor).toHaveProperty("name")
      expect(res.body.data.doctor).toHaveProperty("specialization")
      expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(2)
    })

    test("should filter doctor schedule by date", async () => {
      const res = await request(app)
        .get(`/api/appointments/doctor/${doctorId}/schedule?date=2025-12-01`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.count).toBeGreaterThanOrEqual(2)
    })

    test("should return 404 for non-existent doctor schedule", async () => {
      const fakeDoctorId = "507f1f77bcf86cd799439011"
      const res = await request(app)
        .get(`/api/appointments/doctor/${fakeDoctorId}/schedule`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe("GET /api/appointments - Extended Filtering", () => {
    beforeEach(async () => {
      // Create multiple appointments with different statuses
      await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-01",
        appointmentTime: "10:00",
        duration: 30,
        reason: "Checkup",
        status: "scheduled",
      })

      await request(app).post("/api/appointments").set("Authorization", `Bearer ${token}`).send({
        patient: patientId,
        doctor: doctorId,
        appointmentDate: "2025-12-02",
        appointmentTime: "15:00",
        duration: 30,
        reason: "Checkup",
        status: "scheduled",
      })
    })

    test("should filter appointments by patient", async () => {
      const res = await request(app)
        .get(`/api/appointments?patient=${patientId}`)
        .set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    test("should filter appointments by date", async () => {
      const res = await request(app).get(`/api/appointments?date=2025-12-01`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should support pagination", async () => {
      const res = await request(app).get(`/api/appointments?page=1&limit=5`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty("currentPage")
      expect(res.body).toHaveProperty("totalPages")
      expect(res.body).toHaveProperty("total")
    })
  })
})
