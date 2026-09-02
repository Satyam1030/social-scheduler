# Social Scheduler

Social Scheduler is a comprehensive, full-stack AI-powered social media management application. It empowers users to automatically generate engaging social media posts with AI (both text and images) and schedule them for seamless publishing across multiple platforms, including LinkedIn, Twitter (X), Facebook, and Instagram.

## ✨ Features

- **AI Content Generation**: Leverage the power of Google Gemini AI to effortlessly generate tailored text content for your posts in various tones (Professional, Casual, Humorous, etc.).
- **AI Image Generation**: Automatically generate highly relevant and striking images using Leonardo.ai or Pollinations AI as a fallback, directly attached to your posts.
- **Multi-Platform Scheduling**: Connect your social media accounts and schedule your content to be published at any future date and time.
- **Automated Publishing**: Background job scheduling ensures that your content goes live precisely when scheduled, utilizing the Zernio API for robust delivery.
- **Real-Time Dashboard**: Track your connected accounts, upcoming scheduled posts, published posts, and view a timeline of all your recent activity.
- **Media Hosting**: Secure cloud storage for generated and uploaded media via Cloudinary integration.
- **Secure Authentication**: JWT-based secure user authentication to keep your accounts and data safe.

## 🛠 Tech Stack

**Frontend:**
- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for modern, responsive styling
- [React Router](https://reactrouter.com/) for navigation
- [Axios](https://axios-http.com/) for API requests

**Backend:**
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) for the database
- [node-cron](https://www.npmjs.com/package/node-cron) for background job processing

**APIs & Integrations:**
- **[Google Gemini AI](https://deepmind.google/technologies/gemini/)**: AI text generation
- **[Leonardo.ai](https://leonardo.ai/)**: High-quality AI image generation
- **[Zernio](https://zernio.com/)**: Social media cross-posting API
- **[Cloudinary](https://cloudinary.com/)**: Image uploads and media hosting

## 🚀 Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB account (or local MongoDB server)
- API Keys for Gemini, Zernio, and Cloudinary

### 1. Clone the repository

```bash
git clone https://github.com/Satyam1030/social-scheduler.git
cd social-scheduler
```

### 2. Environment Variables

Create a `.env` file in the `server` directory (`server/.env`) and add the following keys:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
LEONARDO_API_KEY=your_leonardo_api_key # Optional, falls back to free alternative if missing

# Social Publishing (Zernio)
ZERNIO_API_KEY=your_zernio_api_key

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Create a `.env` file in the `client` directory (`client/.env`) if needed, setting the API base URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Install Dependencies

You'll need to install dependencies for both the frontend (`client`) and backend (`server`).

**Install Server Dependencies:**
```bash
cd server
npm install
```

**Install Client Dependencies:**
```bash
cd ../client
npm install
```

### 4. Run the Application

Start the backend server and the frontend development server concurrently.

**Run the Backend:**
```bash
cd server
npm run dev
```

**Run the Frontend:**
```bash
cd client
npm run dev
```

The application will be accessible at `http://localhost:5173` (or the port specified by Vite).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Satyam1030/social-scheduler/issues).

## 📝 License

This project is licensed under the MIT License.
