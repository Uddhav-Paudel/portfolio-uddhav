pipeline {
    agent {
        kubernetes {
            defaultContainer 'node'
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: ci-portfolio-frontend
spec:
  serviceAccountName: jenkins

  containers:
    - name: node
      image: node:20-alpine
      command: ['sh', '-c', 'apk add --no-cache git openssh-client bash && cat']
      tty: true
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"
        limits:
          cpu: "1000m"
          memory: "1Gi"

    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      command: ["/busybox/cat"]
      tty: true
      args: ["--insecure"]
      volumeMounts:
        - name: harbor-secret
          mountPath: /kaniko/.docker
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"

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

        GITOPS_REPO  = "git@gitlab.com:udi-gitops/platform-gitops-applications.git"
        GITOPS_PATH  = "applications/portfolio-frontend/deployment.yaml"
        GIT_BRANCH   = "main"
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    stages {

        stage('Checkout Application') {
            steps {
                deleteDir()
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/main"]],
                    userRemoteConfigs: [[
                        url: 'git@github.com:Uddhav-Paudel/portfolio-uddhav.git',
                        credentialsId: 'gitlab-ssh'
                    ]]
                ])
            }
        }

        stage('Prepare Metadata') {
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.FULL_IMAGE = "${REGISTRY}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}"

                    echo "Building image: ${FULL_IMAGE}"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                set -e
                npm ci
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                set -e
                npm test -- --watchAll=false
                '''
            }
        }

        stage('Build React App') {
            steps {
                sh '''
                set -e
                npm run build
                '''
            }
        }

        stage('Build & Push Image (Kaniko)') {
            steps {
                container('kaniko') {
                    sh """
                    /kaniko/executor \
                      --context ${WORKSPACE} \
                      --dockerfile ${WORKSPACE}/Dockerfile \
                      --destination ${FULL_IMAGE} \
                      --cache=true \
                      --cache-repo=${REGISTRY}/${PROJECT}/cache \
                      --snapshot-mode=redo \
                      --verbosity=info
                    """
                }
            }
        }

        stage('Update GitOps Repository') {
            steps {
                container('node') {
                    withCredentials([
                        sshUserPrivateKey(
                            credentialsId: 'gitlab-ssh',
                            keyFileVariable: 'SSH_KEY'
                        )
                    ]) {
                        sh """
                        set -e

                        mkdir -p ~/.ssh
                        cp \$SSH_KEY ~/.ssh/id_rsa
                        chmod 600 ~/.ssh/id_rsa
                        ssh-keyscan gitlab.com >> ~/.ssh/known_hosts

                        rm -rf gitops
                        git clone --branch ${GIT_BRANCH} ${GITOPS_REPO} gitops
                        cd gitops

                        sed -i 's|image:.*|image: ${FULL_IMAGE}|' ${GITOPS_PATH}

                        if git diff --quiet; then
                          echo "No image change detected. Skipping commit."
                          exit 0
                        fi

                        git add ${GITOPS_PATH}
                        git -c user.name="gitops-bot" \
                            -c user.email="gitops-bot@company.com" \
                            commit -m "Update image to ${IMAGE_TAG}"

                        git push origin ${GIT_BRANCH}
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Image pushed: ${FULL_IMAGE}"
            echo "GitOps updated. ArgoCD will sync automatically."
        }
        failure {
            echo "Pipeline failed."
        }
        cleanup {
            cleanWs()
        }
    }
}
