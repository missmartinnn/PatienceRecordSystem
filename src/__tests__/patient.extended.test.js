import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

describe("Extended Patient Tests", () => {
  let token

  const patientData = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-05-15",
    gender: "female",
    phone: "+1234567890",
    email: "jane.doe@email.com",
    bloodGroup: "O+",
    emergencyContact: {
      name: "John Doe",
      relationship: "Spouse",
      phone: "+0987654321",
    },
  }

  beforeEach(async () => {
    const doctorRes = await request(app).post("/api/auth/register").send({
      name: "Dr. Test",
      email: "test@hospital.com",
      password: "password123",
      specialization: "General",
      licenseNumber: "LIC999",
      phone: "+1111111111",
    })
    token = doctorRes.body.token
  })

  describe("POST /api/patients - Edge Cases", () => {
    test("should validate email format", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...patientData,
          email: "invalid-email",
        })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should validate blood group from enum", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...patientData,
          bloodGroup: "Invalid",
        })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should validate phone format", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...patientData,
          phone: "invalid",
        })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should set registeredBy to current doctor", async () => {
      const res = await request(app).post("/api/patients").set("Authorization", `Bearer ${token}`).send(patientData)

      expect(res.statusCode).toBe(201)
      expect(res.body.data).toHaveProperty("registeredBy")
    })
  })

  describe("GET /api/patients/:id - Edge Cases", () => {
    let patientId

    beforeEach(async () => {
      const res = await request(app).post("/api/patients").set("Authorization", `Bearer ${token}`).send(patientData)
      patientId = res.body.data._id
    })

    test("should include all patient details", async () => {
      const res = await request(app).get(`/api/patients/${patientId}`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.data).toHaveProperty("firstName")
      expect(res.body.data).toHaveProperty("lastName")
      expect(res.body.data).toHaveProperty("dateOfBirth")
      expect(res.body.data).toHaveProperty("gender")
      expect(res.body.data).toHaveProperty("phone")
      expect(res.body.data).toHaveProperty("bloodGroup")
      expect(res.body.data).toHaveProperty("emergencyContact")
    })

    test("should reject invalid ObjectId format", async () => {
      const res = await request(app).get(`/api/patients/invalid-id`).set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(400)
    })
  })

  describe("PUT /api/patients/:id - Edge Cases", () => {
    let patientId

    beforeEach(async () => {
      const res = await request(app).post("/api/patients").set("Authorization", `Bearer ${token}`).send(patientData)
      patientId = res.body.data._id
    })

    test("should allow partial updates", async () => {
      const res = await request(app)
        .put(`/api/patients/${patientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ phone: "+9999999999" })

      expect(res.statusCode).toBe(200)
      expect(res.body.data).toHaveProperty("phone", "+9999999999")
    })

    test("should update emergency contact", async () => {
      const newContact = {
        name: "Jane Smith",
        relationship: "Sister",
        phone: "+1111111111",
      }
      const res = await request(app)
        .put(`/api/patients/${patientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ emergencyContact: newContact })

      expect(res.statusCode).toBe(200)
      expect(res.body.data.emergencyContact).toEqual(newContact)
    })

    test("should validate updates against schema", async () => {
      const res = await request(app)
        .put(`/api/patients/${patientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ gender: "invalid" })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe("GET /api/patients - Advanced Filtering", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...patientData,
          firstName: "Alice",
          lastName: "Smith",
        })

      await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...patientData,
          firstName: "Bob",
          lastName: "Johnson",
        })
    })

    test("should search by first name", async () => {
      const res = await request(app).get("/api/patients?search=Alice").set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should search by last name", async () => {
      const res = await request(app).get("/api/patients?search=Smith").set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should paginate results correctly", async () => {
      const page1 = await request(app).get("/api/patients?page=1&limit=1").set("Authorization", `Bearer ${token}`)

      const page2 = await request(app).get("/api/patients?page=2&limit=1").set("Authorization", `Bearer ${token}`)

      expect(page1.statusCode).toBe(200)
      expect(page2.statusCode).toBe(200)
      expect(page1.body.currentPage).toBe("1")
      expect(page2.body.currentPage).toBe("2")
    })
  })
})
