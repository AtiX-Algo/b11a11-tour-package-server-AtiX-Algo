# The Vagabond Tour (Server)

This is the back-end REST API for "The Vagabond Tour," a full-stack tour package booking platform. It is built with Node.js, Express.js, and MongoDB.

### Live API URL
**https://the-vagabond-tour.onrender.com**

---

### Features

* **RESTful API:** Provides endpoints for all CRUD (Create, Read, Update, Delete) operations for tour packages and bookings.
* **Secure Authentication:** Generates and verifies JSON Web Tokens (JWTs) to protect routes.
* **Role-Based Access Control:** API endpoint to verify user roles (e.g., 'tour_guide').
* **Database Integration:** Connects to a MongoDB database to store and retrieve all application data.

### Main API Endpoints

* `POST /jwt` - Generates a JWT for a logged-in user.
* `POST /users` - Creates a new user in the database.
* `GET /users/role/:email` - Securely checks the role of a user.
* `GET /packages` - Retrieves all tour packages (with search).
* `GET /packages/:id` - Retrieves a single tour package.
* `POST /packages` - Adds a new tour package.
* `PUT /packages/:id` - Updates an existing package.
* `DELETE /packages/:id` - Deletes a package.
* `POST /bookings` - Creates a new booking and increments the package's booking count.
* `GET /my-bookings/:email` - Retrieves all bookings for a specific user.
* `PATCH /my-bookings/:email/:id` - Updates the status of a booking.


### Technology Stack

* Node.js
* Express.js
* MongoDB (using `mongodb` driver)
* JSON Web Token (JWT)
* CORS
* Dotenv

### Local Setup

1.  Clone the repository.
2.  Run `npm install`.
3.  Create a `.env` file and add your `DB_USER`, `DB_PASS`, and `ACCESS_TOKEN_SECRET`.
4.  Run `node index.js`.