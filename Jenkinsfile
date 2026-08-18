// Jenkinsfile — Vizag Resort Booking (vshakago.in)
// Builds each microservice image, pushes to a registry, then deploys to the
// EC2 host over SSH using the same docker-compose flow described in DEPLOY_WINSTON.md.
//
// -------------------------------------------------------------------------
// ONE-TIME JENKINS SETUP (do this before the first run)
// -------------------------------------------------------------------------
// 1) Credentials (Manage Jenkins > Credentials):
//      - "ec2-ssh-key"        : SSH Username with private key, user = ubuntu,
//                               private key = your EC2 .pem key
//      - "docker-registry"    : Username/password (or token) for your image
//                               registry (Docker Hub, ECR, GHCR, etc.)
//      - "app-env-file"       : Secret file credential containing your
//                               production .env (copied to the server as .env)
//    Optional (only needed if you want Telegram build notifications, since
//    the app already uses Telegram elsewhere):
//      - "telegram-bot-token" : Secret text
//      - "telegram-chat-id"   : Secret text
//
// 2) Jenkins node/agent needs: git, docker, docker-compose (or docker compose
//    plugin), and network access to your registry.
//
// 3) Update the values in the `environment` block below (registry, EC2 host,
//    remote deploy path) to match your actual setup.
// -------------------------------------------------------------------------

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        ansiColor('xterm')
    }

    parameters {
        booleanParam(name: 'PUSH_IMAGES', defaultValue: true, description: 'Build and push Docker images to the registry')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy to the EC2 server after a successful build')
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Override image tag (defaults to git short SHA)')
    }

    environment {
        // ---- Registry & image naming ---------------------------------------
        REGISTRY        = 'docker.io/your-dockerhub-user'   // e.g. 'docker.io/venkey' or an ECR URL
        REGISTRY_CREDS  = 'docker-registry'                 // Jenkins credentials ID
        IMAGE_TAG       = "${params.IMAGE_TAG ?: env.GIT_COMMIT?.take(7) ?: 'latest'}"

        // ---- Deploy target ---------------------------------------------------
        EC2_HOST         = 'ubuntu@35.154.92.5'             // matches DEPLOY_WINSTON.md
        EC2_SSH_CRED      = 'ec2-ssh-key'
        REMOTE_APP_DIR    = '/home/ubuntu/vizag-resort-booking'

        // ---- Services (Dockerfile name -> compose service name) --------------
        SERVICES = 'main:Dockerfile.main,admin:Dockerfile.admin,booking:Dockerfile.booking,websocket:Dockerfile.websocket,centralized-db:Dockerfile.centralized-db'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    if (!params.IMAGE_TAG?.trim()) {
                        env.IMAGE_TAG = env.GIT_SHORT
                    }
                }
                echo "Building commit ${env.GIT_SHORT} as tag ${env.IMAGE_TAG}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    node --version
                    npm ci --no-audit --no-fund
                '''
            }
        }

        stage('Lint / Sanity Check') {
            steps {
                // No lint script is currently defined in package.json.
                // This just fails fast on syntax errors before we build images.
                sh '''
                    node --check server.js
                    node --check admin-server.js
                    node --check booking-server.js
                    node --check websocket-server.js
                    node --check centralized-db-api.js
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = env.SERVICES.split(',').collectEntries {
                        def (name, dockerfile) = it.split(':')
                        [(name): dockerfile]
                    }
                    services.each { name, dockerfile ->
                        sh """
                            docker build -f ${dockerfile} -t ${REGISTRY}/vizag-${name}:${IMAGE_TAG} -t ${REGISTRY}/vizag-${name}:latest .
                        """
                    }
                }
            }
        }

        stage('Push Docker Images') {
            when { expression { params.PUSH_IMAGES } }
            steps {
                script {
                    def services = env.SERVICES.split(',').collect { it.split(':')[0] }
                    docker.withRegistry("https://${REGISTRY.split('/')[0]}", REGISTRY_CREDS) {
                        services.each { name ->
                            sh """
                                docker push ${REGISTRY}/vizag-${name}:${IMAGE_TAG}
                                docker push ${REGISTRY}/vizag-${name}:latest
                            """
                        }
                    }
                }
            }
        }

        stage('Deploy to EC2') {
            when { expression { params.DEPLOY } }
            steps {
                sshagent(credentials: [EC2_SSH_CRED]) {
                    // Push the current production env file to the server so
                    // docker-compose has the secrets it needs (kept out of git).
                    withCredentials([file(credentialsId: 'app-env-file', variable: 'ENV_FILE')]) {
                        sh """
                            scp -o StrictHostKeyChecking=no "\$ENV_FILE" ${EC2_HOST}:${REMOTE_APP_DIR}/.env
                        """
                    }
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_HOST} '
                            set -e
                            cd ${REMOTE_APP_DIR}
                            git fetch origin
                            git reset --hard origin/main
                            docker-compose pull || true
                            docker-compose build --no-cache
                            docker-compose down
                            docker-compose up -d
                            docker image prune -f
                        '
                    """
                }
            }
        }

        stage('Health Check') {
            when { expression { params.DEPLOY } }
            steps {
                sshagent(credentials: [EC2_SSH_CRED]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_HOST} '
                            sleep 10
                            curl -f http://localhost:3001/health
                            curl -f http://localhost:3002/health
                            curl -f http://localhost:3003/health
                            curl -f http://localhost:3000/ -o /dev/null -s -w "main-service: %{http_code}\\n"
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Build ${env.BUILD_NUMBER} (${env.IMAGE_TAG}) succeeded."
            script { notifyTelegram("✅ vshakago.in deploy succeeded — build #${env.BUILD_NUMBER}, commit ${env.GIT_SHORT}") }
        }
        failure {
            echo "Build ${env.BUILD_NUMBER} failed."
            script { notifyTelegram("❌ vshakago.in deploy FAILED — build #${env.BUILD_NUMBER}, commit ${env.GIT_SHORT}. Check Jenkins logs.") }
        }
        always {
            sh 'docker image prune -f || true'
            cleanWs()
        }
    }
}

// Optional Telegram notification, reusing the same bot pattern as telegram-service.js.
// No-ops silently if the credentials aren't configured.
def notifyTelegram(String message) {
    try {
        withCredentials([
            string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
            string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
        ]) {
            sh """
                curl -s -X POST "https://api.telegram.org/bot\$TG_TOKEN/sendMessage" \
                    -d chat_id=\$TG_CHAT \
                    -d text="${message}" > /dev/null
            """
        }
    } catch (err) {
        echo "Telegram notification skipped (credentials not configured)."
    }
}
