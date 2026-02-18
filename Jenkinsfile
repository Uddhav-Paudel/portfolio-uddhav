pipeline {
    agent {
        kubernetes {
            defaultContainer 'node'
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: ci-builder
spec:
  serviceAccountName: jenkins
  containers:
    - name: node
      image: node:20-alpine
      command: ['cat']
      tty: true

    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2
      command: ['cat']
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
        REGISTRY     = "harbor.harbor.svc.cluster.local"
        PROJECT      = "lab"
        IMAGE_NAME   = "frontend-app"
        GITOPS_REPO  = "git@gitlab.com:your-gitops/platform-gitops-applications.git"
        GITOPS_PATH  = "applications/portfolio-frontend/deployment.yaml"
    }

    options {
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout Application (GitHub)') {
            steps {
                deleteDir()
                git(
                    url: 'git@github.com:uddhav-paudel/portfolio-frontend.git',
                    branch: 'main',
                    credentialsId: 'gitlab-ssh'
                )
            }
        }

        stage('Prepare Metadata') {
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.FULL_IMAGE = "${REGISTRY}/${PROJECT}/${IMAGE_NAME}:${env.IMAGE_TAG}"

                    echo "Building image: ${env.FULL_IMAGE}"
                }
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

        stage('Build & Push Image') {
            steps {
                container('kaniko') {
                    sh """
                    /kaniko/executor \
                      --context ${WORKSPACE} \
                      --dockerfile ${WORKSPACE}/Dockerfile \
                      --destination ${FULL_IMAGE} \
                      --verbosity info
                    """
                }
            }
        }

        stage('Update GitOps Repo (GitLab)') {
            steps {
                container('node') {
                    withCredentials([
                        sshUserPrivateKey(
                            credentialsId: 'gitlab-ssh',
                            keyFileVariable: 'SSH_KEY'
                        )
                    ]) {
                        sh """
                        mkdir -p ~/.ssh
                        cp \$SSH_KEY ~/.ssh/id_rsa
                        chmod 600 ~/.ssh/id_rsa
                        ssh-keyscan gitlab.com >> ~/.ssh/known_hosts

                        rm -rf gitops
                        git clone ${GITOPS_REPO} gitops
                        cd gitops

                        sed -i 's|image:.*|image: ${FULL_IMAGE}|' ${GITOPS_PATH}

                        git add ${GITOPS_PATH}
                        git -c user.name="gitops-bot" \
                            -c user.email="gitops-bot@company.com" \
                            commit -m "Update image to ${IMAGE_TAG}"

                        git push origin main
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Image pushed: ${FULL_IMAGE}"
            echo "✅ GitOps repo updated. ArgoCD will sync automatically."
        }
        failure {
            echo "❌ Pipeline failed."
        }
    }
}
