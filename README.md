# Centralized Sales Distribution Management System (IslandLink)

A centralized Sales Distribution Management System built for regional distribution centers (RDC), dispatch logistics, and payment reconciliation. Designed using clean software architecture principles, featuring an automated Continuous Integration (CI) pipeline, automated testing, and static analysis.

## Features

1. **RDC Order Entry**: Allows RDC clerks to record customer orders on behalf of walk-in or phone customers. It resolves customer IDs by email or registers new customer accounts on-the-fly.
2. **Multi-Center Inventory**: Real-time stock tracking and updates for products across all distribution centers (Central RDC, Colombo North, Galle RDC, Kandy RDC).
3. **Inter-Branch Stock Transfers**: Supports stock requests between different centers. It transactionally deducts stock from the source center and adds it to the target center on approval, with strict safety checks for stock levels.
4. **Delivery Dispatch Scheduling**: Allows clerks to assign drivers and schedule delivery dates, timeslots, and route details. Active dispatches are visible in a live tracking table.
5. **Invoice Reconciliation**: Accounts officers can view itemized customer invoices, enter payment references (e.g., bank transfer/cheque numbers), and reconcile invoices to a completed history log.

---

## Architecture & Code Quality (ASE Principles)

* **Separation of Concerns (MVC)**: Decoupled router endpoints from controller handlers under `src/controllers/`, separating network routing from database queries.
* **Static Code Analysis**: Enforced formatting and syntax rules using **ESLint** configured in `.eslintrc.json`.
* **Automated Test Suites**: Built unit tests (`tests/db.test.js`) and integration API tests (`tests/api.test.js`) using **Jest** and **Supertest**.
* **Continuous Integration**: Configured a **GitHub Actions CI pipeline** (`.github/workflows/ci.yml`) to automatically run linting and test suites on pushes and PRs.

---

## Technologies Used

* **Runtime & Backend**: Node.js, Express.js
* **Database**: SQLite3
* **Static Analysis**: ESLint
* **Testing Framework**: Jest, Supertest
* **CI/CD Pipeline**: GitHub Actions

---

## How to Install and Run

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 2. Run Tests
To run the automated Jest unit and integration test suite:
```bash
npm run test
```

### 3. Run Linter
To run ESLint static analysis:
```bash
npm run lint
```

### 4. Start the Application
To run the server locally:
```bash
npm start
```
Open `http://localhost:3000` in your web browser. 

* **RDC Clerk Login**: Username `rdc1` / Password `123`
* **Driver Login**: Username `driver1` / Password `123`
* **Manager Login**: Username `manager1` / Password `123`
* **Customer Login**: Username `customer1` / Password `123`

---

## Academic Supervision
This project was guided  by Nimesha Rajakaruna as part of undergraduate coursework.
