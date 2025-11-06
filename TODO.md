# TODO: Fix Failing Tests

## Issues to Fix:
1. **DELETE /api/medical-records/:id** - Remove `authorize("admin")` from route since controller handles authorization for creator and admin.
2. **GET /api/medical-records?doctor=${token}** - Test passes JWT token instead of doctor ID. Need to extract doctor ID from token in test or modify controller to handle JWT.
3. **Phone validation in patient creation** - Add proper phone number validation regex in validator.js.
4. **Error handler message** - When error has no message, return empty string instead of "Server Error".

## Steps:
- [ ] Remove authorize("admin") from delete route in medicalRecordRoutes.js
- [ ] Fix the test to pass doctor ID instead of token, or modify controller to accept JWT and extract ID
- [ ] Add phone validation regex in patientValidation
- [ ] Update errorHandler.js to return empty message if err.message is falsy
- [ ] Run tests to verify fixes
