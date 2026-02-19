pipeline {
    agent {
        kubernetes {
            namespace 'jenkins'
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
      command:
        - sh
        - -c
        - |
          apk add --no-cache git bash openssh
          git config --global --add safe.directory '*'
          cat
      tty: true

    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      command: ["/busybox/cat"]
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
        GITOPS_REPO  = "git@gitlab.com:udi-gitops/platform-gitops-applications.git"
        GITOPS_PATH  = "applications/portfolio-frontend/deployment.yaml"
    }

    options {
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout Application (GitHub)') {
            steps {
                deleteDir()
                container('node') {
                    sh "git config --global --add safe.directory ${WORKSPACE}"
                    git(
                        url: 'git@github.com:uddhav-paudel/portfolio-uddhav.git',
                        branch: 'main',
                        credentialsId: 'gitlab-ssh'
                    )
                }
            }
        }

        stage('Prepare Metadata') {
            steps {
                container('node') {
                    script {
                        env.IMAGE_TAG = sh(
                            script: "git rev-parse --short HEAD",
                            returnStdout: true
                        ).trim()

                        env.FULL_IMAGE =
                          "${REGISTRY}/${PROJECT}/${IMAGE_NAME}:${env.IMAGE_TAG}"

                        echo "🚀 Building image: ${env.FULL_IMAGE}"
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                container('node') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build React App') {
            steps {
                container('node') {
                    sh 'npm run build'
                }
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
                        git config --global --add safe.directory '*'

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
                            commit -m "Update image to ${IMAGE_TAG}" || echo "No changes"

                        git push origin main
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Image pushed successfully: ${FULL_IMAGE}"
            echo "✅ GitOps repo updated. ArgoCD will sync automatically."
        }
        failure {
            echo "❌ Pipeline failed."
        }
    }
}