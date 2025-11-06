# TODO: Fix Failing Tests

## Tasks
- [ ] Edit src/controllers/medicalRecordController.js: Add authorization check in deleteMedicalRecord to allow creator or admin
- [ ] Edit src/controllers/medicalRecordController.js: Modify getMedicalRecords to default query.doctor = req.user.id if no doctor query
- [ ] Edit src/__tests__/medicalRecord.extended.test.js: Add bloodGroup to patient creation in beforeEach
- [ ] Edit src/__tests__/medicalRecord.extended.test.js: Remove ?doctor=${token} from filter test
- [ ] Edit src/models/Patient.js: Add regex validation for phone field
- [ ] Edit src/middleware/errorHandler.js: Change message to err.message || ""
- [ ] Run tests to verify fixes
