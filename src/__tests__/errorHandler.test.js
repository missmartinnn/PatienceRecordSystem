import { describe, test, expect, beforeEach, jest } from "@jest/globals"
import { errorHandler } from "../middleware/errorHandler.js"

describe("Error Handler Middleware Tests", () => {
  let req, res, next

  beforeEach(() => {
    req = {}
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
  })

  describe("Mongoose Errors", () => {
    test("should handle CastError (invalid ObjectId)", () => {
      const err = new Error("Cast to ObjectId failed")
      err.name = "CastError"

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Resource not found",
      })
    })

    test("should handle duplicate key error", () => {
      const err = new Error("E11000 duplicate key error")
      err.code = 11000
      err.keyValue = { email: "test@test.com" }

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "email already exists",
      })
    })

    test("should handle validation error", () => {
      const err = new Error("Validation failed")
      err.name = "ValidationError"
      err.errors = {
        name: { message: "Name is required" },
        email: { message: "Email is invalid" },
      }

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Name is required, Email is invalid",
      })
    })

    test("should handle multiple validation errors", () => {
      const err = new Error("Validation failed")
      err.name = "ValidationError"
      err.errors = {
        field1: { message: "Error 1" },
        field2: { message: "Error 2" },
        field3: { message: "Error 3" },
      }

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Error 1"),
        }),
      )
    })
  })

  describe("Generic Errors", () => {
    test("should handle error with custom statusCode", () => {
      const err = new Error("Custom error")
      err.statusCode = 422

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Custom error",
      })
    })

    test("should default to 500 for unknown errors", () => {
      const err = new Error("Unknown error")

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unknown error",
      })
    })

    test("should handle error without message", () => {
      const err = new Error()
      err.statusCode = 400

      errorHandler(err, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "",
      })
    })
  })
})
