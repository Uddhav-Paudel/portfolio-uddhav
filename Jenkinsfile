pipeline {
    agent {
        kubernetes {
            yaml """
                apiVersion: v1
                kind: Pod
                metadata:
                labels:
                    app: kaniko-builder
                spec:
                containers:
                - name: kaniko
                    image: gcr.io/kaniko-project/executor:latest
                    command:
                    - cat
                    tty: true
                    volumeMounts:
                    - name: harbor-secret
                        mountPath: /kaniko/.docker
                volumes:
                    - name: harbor-secret
                    secret:
                        secretName: harbor-secret
                """
        }
    }

    environment {
        REGISTRY = "harbor.harbor.svc.cluster.local"  // internal Harbor service DNS
        IMAGE_NAME = "frontend-app"                            // generic name
        IMAGE_TAG = "${GIT_COMMIT.take(7)}"                   // short git commit hash
        FULL_IMAGE = "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test -- --watchAll=false'
            }
        }

        stage('Build React App') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    sh """
                    /kaniko/executor \
                        --context `pwd` \
                        --dockerfile Dockerfile \
                        --destination ${FULL_IMAGE} \
                        --skip-tls-verify
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Image ${FULL_IMAGE} built and pushed successfully."
        }
        failure {
            echo "❌ Pipeline failed."
        }
    }
}
