# Samayk-Your-CampusMitra
# Samayak – Your CampusMitra 🎓

> A centralized academic management portal bridging faculty and students in one secure digital space.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Authentication & Access Control](#authentication--access-control)
- [Faculty Module](#faculty-module)
- [Student Module](#student-module)
- [Data Privacy & Security](#data-privacy--security)
- [Excel-Based Bulk Data Upload](#excel-based-bulk-data-upload)
- [Activity Tracking](#activity-tracking)
- [Future Scope](#future-scope)
- [Target Audience](#target-audience)

---

## Overview

**Samayak: Your CampusMitra** is a role-based, web-based student information and academic management portal built to streamline communication between faculty and students. Initially deployed for the **CSIT-1 classroom** of the CSIT Department (Batch 2024–2028), the system is designed to scale across sections, batches, and departments.

The platform replaces repetitive manual data entry and scattered communication (WhatsApp groups, emails) with a single organized digital space.

---

## Key Features

| Feature | Description |
|---|---|
| 🔐 Role-Based Access | Separate Faculty and Student portals with distinct permissions |
| 📊 Excel Bulk Upload | Upload attendance, MST marks, and internal marks via spreadsheets |
| 📅 Timetable Management | Regular, MST, practical, and revised timetables |
| 📋 Attendance Tracking | Per-student attendance visibility with privacy controls |
| 📝 Marks Management | MST and internal assessment marks, subject-wise |
| 📢 Announcements | Centralized digital notice board for the class |
| 📚 Syllabus Access | Upload and download subject syllabi |
| 📈 Academic Progress | Combined overview of attendance, MST, and internal performance |
| 🔒 Activity Logging | All login and signup events are tracked automatically |

---

## User Roles

### 👨‍🏫 Faculty
- Upload and manage all academic content
- Full CRUD control over timetables, marks, attendance, and announcements
- Register using a **Faculty Verification Code** issued by the admin

### 👨‍🎓 Student
- View-only access to their own academic information
- Cannot view any other student's records
- Register using a unique **enrollment number** and college email

---

## Authentication & Access Control

### Faculty Registration
Required fields:
- College Email Address
- Password
- **Faculty Verification Code** *(issued by admin; prevents unauthorized registrations)*

### Student Registration
Required fields:
- College Email Address
- Password
- **Enrollment Number** *(must be unique; duplicates are rejected)*

> After registration, all users log in using their **email + password** only.

---

## Faculty Module

### Timetable Management
Upload any of the following:
- Regular Class Timetable
- MST Examination Timetable
- Practical / Laboratory Timetable
- Special Event Timetable
- Revised / Updated Timetable

### Syllabus Management
- Upload subject syllabi in PDF or document format
- Students can view and download at any time

### Attendance Management
Upload an Excel sheet with columns:

```
Enrollment Number | Student Name | Attendance Percentage
241CS001          | Student A    | 92
241CS002          | Student B    | 85
```

System auto-reads and updates the database. Each student sees only their own record.

### MST Marks Management
Upload an Excel sheet containing:
- Enrollment Number
- Subject Name
- MST Marks

### Internal Marks Management
Upload an Excel sheet containing:
- Enrollment Number
- Subject Name
- Internal Marks

### Announcements
Create notices directly on the portal — visible to all students immediately. Examples:
- Assignment deadlines
- Exam notifications
- Holiday notices
- Classroom changes

---

## Student Module

After login, the student dashboard displays:

### Personal Info
- Name, Enrollment Number, Department, Batch, Section
  - Default: CSIT | 2024–2028 | CSIT-1

### Attendance
- Overall Attendance Percentage
- Subject-wise Attendance
- Attendance Status

### MST Marks
- Subject-wise MST marks
- Total marks and performance summary

### Internal Marks
- Subject-wise internal assessment marks
- Overall internal performance

### Academic Progress Indicator
Combined overview with labels:
- ✅ Excellent
- 🟢 Good
- 🟡 Average
- 🔴 Needs Improvement

### Timetable & Syllabus
- View all uploaded timetables
- Download subject syllabi

### Announcements
- Read all faculty notices from the dashboard

---

## Data Privacy & Security

- Each student has a **unique enrollment number** and **unique email**
- **Faculty Verification Code** prevents unauthorized faculty accounts
- **Role-based access control** — students cannot access faculty features
- Students are restricted to viewing **only their own data**
- All authentication is secured through proper login flow

---

## Excel-Based Bulk Data Upload

Instead of manual per-student entry, faculty upload a single Excel sheet. The system:

1. Parses the spreadsheet automatically
2. Maps data by enrollment number
3. Updates the database in bulk

**Benefits:**
- Significantly reduced faculty workload
- Faster and error-free updates
- Scalable to larger class sizes

---

## Activity Tracking

Every signup and login event is automatically logged:

| Field | Value |
|---|---|
| User Type | Faculty / Student |
| User ID | Registered ID |
| Activity Type | Signup / Login |
| Timestamp | Date & Time |

---

## Future Scope

Planned expansions:

**Section/Department Expansion**
- CSIT-2, CY Section, entire CSIT Department, multiple departments

**Feature Additions**
- Assignment Submission Portal
- Study Material Repository
- CGPA Calculator
- Faculty Profiles
- Event Calendar
- Placement Information
- Student Feedback System
- Mobile Application
- Email Notifications
- Attendance Shortage Alerts

---

## Target Audience

- **Primary:** CSIT-1, CSIT Department, Batch 2024–2028
- **Future:** All sections, batches, and departments of the institution

---

*Samayak bridges the communication gap between faculty and students through a secure, organized, and easy-to-use academic platform.*
