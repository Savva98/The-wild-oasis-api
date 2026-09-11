# Wild Oasis API

> API for the Wild Oasis application

## Overview

The Wild Oasis API is a RESTful backend service built with JavaScript that powers the Wild Oasis application. It provides endpoints for managing bookings, cabins, guests, and other core functionality for a hospitality management system.

## Features

- 🏨 **Cabin Management** - Create, read, update, and delete cabin information
- 📅 **Booking System** - Manage reservations and check-ins
- 👥 **Guest Management** - Handle guest profiles and information
- 🔐 **Authentication** - Secure API endpoints with user authentication
- 📊 **Dashboard Analytics** - Retrieve insights and statistics
- ⚙️ **Settings Management** - Configure application settings

## Tech Stack

- **Runtime:** Node.js
- **Language:** JavaScript
- **API Type:** RESTful

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Savva98/The-wild-oasis-api.git
cd The-wild-oasis-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Running the Server

Start the development server:
```bash
npm start
```

The API will be available at `http://localhost:3000` (or your configured port).

## API Endpoints

### Cabins
- `GET /api/cabins` - Get all cabins
- `GET /api/cabins/:id` - Get a specific cabin
- `POST /api/cabins` - Create a new cabin
- `PATCH /api/cabins/:id` - Update a cabin
- `DELETE /api/cabins/:id` - Delete a cabin

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get a specific booking
- `POST /api/bookings` - Create a new booking
- `PATCH /api/bookings/:id` - Update a booking
- `DELETE /api/bookings/:id` - Delete a booking

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get a specific guest
- `POST /api/guests` - Create a new guest
- `PATCH /api/guests/:id` - Update a guest
- `DELETE /api/guests/:id` - Delete a guest

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration

### Settings
- `GET /api/settings` - Get application settings
- `PATCH /api/settings` - Update application settings

## Project Structure

```
The-wild-oasis-api/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── utils/           # Utility functions
├── .env.example         # Environment variables template
├── server.js            # Server entry point
└── package.json         # Dependencies and scripts
```

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
```

## Testing

Run tests with:
```bash
npm test
```

## Development

Install development dependencies:
```bash
npm install --save-dev nodemon
```

Run with auto-reload:
```bash
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on the [GitHub repository](https://github.com/Savva98/The-wild-oasis-api/issues).

---

Made with ❤️ for Wild Oasis
