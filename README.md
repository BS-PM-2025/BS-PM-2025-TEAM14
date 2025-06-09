# Student System Project

A full-stack web application built with FastAPI and React, featuring a modern architecture and comprehensive testing suite.

## 🚀 Features

- RESTful API backend with FastAPI
- Modern React frontend
- Database integration with SQLAlchemy
- Comprehensive test coverage
- CI/CD pipeline with Azure DevOps
- Email service integration
- AI service integration
- Database migrations with Alembic

## 🛠️ Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- Pytest
- Alembic
- Python 3.x

### Frontend

- React
- CSS
- npm

### DevOps

- Azure DevOps
- Docker
- Git

## 📋 Prerequisites

- Python 3.x
- npm 6.x or higher
- Git

## 🚀 Getting Started

### Backend Setup

1. Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
cd ..
```

2. Run the development server:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📦 Project Structure

```
├── backend/
│   ├── AIService/         # AI service integration
│   ├── migrations/        # Database migrations
│   ├── tests/            # Backend tests
│   ├── main.py           # FastAPI application entry
│   ├── db_connection.py  # Database connection handling
│   ├── email_service.py  # Email service integration
│   ├── config.py         # Configuration settings
│   └── requirements.txt  # Python dependencies
│
├── frontend/
│   ├── src/              # React source code
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
│
├── Documents/            # Project documentation
└── azure-pipelines.yml   # Azure DevOps pipeline
```

## 🔄 CI/CD

The project uses Azure DevOps for continuous integration and deployment:

- Pipeline configuration in `azure-pipelines.yml`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👥 Team

- Team 14 - BS-PM-2025

## 📞 Support

For support, please open an issue in the repository or contact the team directly.
