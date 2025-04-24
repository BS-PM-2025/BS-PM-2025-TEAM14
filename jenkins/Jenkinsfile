pipeline {
    agent any

    // Define tools installed via Jenkins global configuration
    tools {
        nodejs 'NodeJS 14'       // Name of your Node.js installation in Jenkins
        python 'Python3'         // Name of your Python installation in Jenkins
    }

    environment {
        VENV_DIR = 'venv'
    }

    stages {
        stage('Checkout') {
            steps {
                // Pull code from SCM (Git)
                checkout scm
            }
        }

        stage('Setup Backend') {
            steps {
                // Create and activate Python virtual environment, then install dependencies
                sh 'python3 -m venv ${VENV_DIR}'
                sh '. ${VENV_DIR}/bin/activate && pip install -r requirements.txt'
            }
        }

        stage('Test Backend') {
            steps {
                // Run backend tests with pytest
                sh '. ${VENV_DIR}/bin/activate && pytest --maxfail=1 --disable-warnings -q'
            }
        }

        stage('Setup Frontend') {
            steps {
                // Install frontend dependencies
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Test Frontend') {
            steps {
                // Run frontend tests (adjust if using a different test runner)
                dir('frontend') {
                    sh 'npm test -- --watchAll=false'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                // Build production-ready React app
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                // Archive built frontend assets
                archiveArtifacts artifacts: 'frontend/build/**', fingerprint: true
            }
        }

    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Please check the logs for details.'
        }
    }
}
