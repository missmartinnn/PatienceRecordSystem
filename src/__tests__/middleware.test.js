import { describe, test, expect, beforeEach } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

describe("Middleware Tests", () => {
  let token
  let doctorId

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Dr. Test",
      email: "test@hospital.com",
      password: "password123",
      specialization: "General",
      licenseNumber: "LIC999",
      phone: "+1111111111",
    })
    token = res.body.token
    doctorId = res.body.data.id
  })

  describe("Auth Middleware - protect", () => {
    test("should allow request with valid token", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test("should reject request without token", async () => {
      const res = await request(app).get("/api/auth/me")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("Not authorized")
    })

    test("should reject request with invalid token format", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid_token")

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })

    test("should reject request with missing Bearer keyword", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Token ${token}`)

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe("App Routes", () => {
    test("should return health check", async () => {
      const res = await request(app).get("/health")

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Server is running")
      expect(res.body).toHaveProperty("timestamp")
    })

    test("should return 404 for non-existent route", async () => {
      const res = await request(app).get("/api/non-existent-route")

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain("not found")
    })
  })
})
