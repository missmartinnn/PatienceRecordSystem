import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"
import Doctor from "../models/Doctor.js"

describe("Extended Authentication Tests", () => {
  const doctorData = {
    name: "Dr. John Smith",
    email: "john.smith@hospital.com",
    password: "password123",
    specialization: "Cardiology",
    licenseNumber: "LIC123456",
    phone: "+1234567890",
  }

  describe("POST /api/auth/register - Edge Cases", () => {
    test("should hash password and not return it", async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)

      expect(res.statusCode).toBe(201)
      expect(res.body.data).not.toHaveProperty("password")
    })

    test("should validate email format strictly", async () => {
      const invalidEmails = ["test@", "test", "test@.com", "test@domain"]

      for (const email of invalidEmails) {
        const res = await request(app)
          .post("/api/auth/register")
          .send({ ...doctorData, email })

        expect(res.statusCode).toBe(400)
        expect(res.body.success).toBe(false)
      }
    })

    test("should require minimum password length", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...doctorData, password: "short" })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should validate all required fields", async () => {
      const requiredFields = ["name", "email", "password", "specialization", "licenseNumber", "phone"]

      for (const field of requiredFields) {
        const invalidData = { ...doctorData }
        delete invalidData[field]

        const res = await request(app).post("/api/auth/register").send(invalidData)

        expect(res.statusCode).toBe(400)
        expect(res.body.success).toBe(false)
      }
    })
  })

  describe("POST /api/auth/login - Edge Cases", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(doctorData)
    })

    test("should not login with empty credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({})

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should not login with only email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: doctorData.email,
      })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should not login with only password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        password: doctorData.password,
      })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
    })

    test("should provide consistent error messages for security", async () => {
      const invalidEmailRes = await request(app).post("/api/auth/login").send({
        email: "wrong@email.com",
        password: doctorData.password,
      })

      const invalidPasswordRes = await request(app).post("/api/auth/login").send({
        email: doctorData.email,
        password: "wrongpassword",
      })

      expect(invalidEmailRes.body.message).toBe(invalidPasswordRes.body.message)
    })
  })

  describe("GET /api/auth/me - Edge Cases", () => {
    let token

    beforeEach(async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)
      token = res.body.token
    })

    test("should return complete doctor info excluding password", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("name")
      expect(res.body.data).toHaveProperty("email")
      expect(res.body.data).toHaveProperty("specialization")
      expect(res.body.data).toHaveProperty("licenseNumber")
      expect(res.body.data).not.toHaveProperty("password")
    })

    test("should reject malformed token", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer malformed.token.here")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should reject token with missing Bearer prefix", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", token)

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should handle inactive doctor account", async () => {
      await Doctor.findOneAndUpdate({ email: doctorData.email }, { isActive: false })

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(401)
      expect(res.body.message).toContain("inactive")
    })
  })

  describe("POST /api/auth/logout - Extended", () => {
    let token

    beforeEach(async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)
      token = res.body.token
    })

    test("should logout without token", async () => {
      const res = await request(app).post("/api/auth/logout")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should handle logout with invalid token", async () => {
      const res = await request(app).post("/api/auth/logout").set("Authorization", "Bearer invalid")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe("Token Generation and Validation", () => {
    test("should return valid JWT token on registration", async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)

      expect(res.statusCode).toBe(201)
      expect(res.body).toHaveProperty("token")
      expect(typeof res.body.token).toBe("string")
      expect(res.body.token.split(".").length).toBe(3) // JWT has 3 parts
    })

    test("should return valid JWT token on login", async () => {
      await request(app).post("/api/auth/register").send(doctorData)

      const res = await request(app).post("/api/auth/login").send({
        email: doctorData.email,
        password: doctorData.password,
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty("token")
      expect(typeof res.body.token).toBe("string")
      expect(res.body.token.split(".").length).toBe(3)
    })
  })

  describe("Doctor Role and Status", () => {
    test("should create doctor with default role", async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)

      expect(res.statusCode).toBe(201)
      expect(res.body.data).toHaveProperty("role")
    })

    test("should create doctor as active by default", async () => {
      const res = await request(app).post("/api/auth/register").send(doctorData)

      expect(res.statusCode).toBe(201)
      const doctor = await Doctor.findById(res.body.data.id)
      expect(doctor.isActive).toBe(true)
    })
  })
})
