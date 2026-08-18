// ============================================================================
// Jenkinsfile - VshakaGo / Vizag Resort Booking
// Same-EC2 CI/CD with local Docker images and automatic rollback.
//
// GitHub -> Jenkins -> validation -> Docker build -> deploy -> health check
//                                             |-> failure -> previous release
//
// No Docker Hub/ECR/GHCR and no SSH are required.
// ============================================================================

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        ansiColor('xterm')
        timeout(time: 30, unit: 'MINUTES')
    }

    parameters {
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Deploy after a successful Docker build'
        )
        booleanParam(
            name: 'RUN_HEALTH_CHECK',
            defaultValue: true,
            description: 'Run health checks after deployment'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: '',
            description: 'Optional Docker image tag. Leave blank to use the 7-character Git SHA.'
        )
    }

    environment {
        APP_DIR = '/home/ubuntu/vizag-resort-booking'
        COMPOSE_FILE = 'docker-compose.yml'
        ENV_CREDENTIAL_ID = 'app-env-file'
        STATE_DIR = '/var/lib/jenkins/vshakago-deploy'

        MAIN_IMAGE = 'vshakago/main-service'
        ADMIN_IMAGE = 'vshakago/admin-service'
        BOOKING_IMAGE = 'vshakago/booking-service'
        DB_IMAGE = 'vshakago/centralized-db-api'
        WS_IMAGE = 'vshakago/websocket-service'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                script {
                    env.GIT_SHORT = sh(
                        script: 'git rev-parse --short=7 HEAD',
                        returnStdout: true
                    ).trim()

                    env.DEPLOY_TAG = params.IMAGE_TAG?.trim()
                        ? params.IMAGE_TAG.trim()
                        : env.GIT_SHORT
                }

                echo "Commit: ${env.GIT_SHORT}"
                echo "Image tag: ${env.DEPLOY_TAG}"
            }
        }

        stage('Environment Check') {
            steps {
                sh '''
                    set -e
                    node --version
                    npm --version
                    docker --version
                    docker compose version
                    git --version
                    echo ""
                    df -h /
                    echo ""
                    free -h
                    echo ""
                    docker system df
                '''
            }
        }

        stage('Node Syntax Check') {
            steps {
                sh '''
                    set -e
                    node --check server.js
                    node --check admin-server.js
                    node --check booking-server.js
                    node --check websocket-server.js
                    node --check centralized-db-api.js
                '''
            }
        }

        stage('Validate Compose') {
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CREDENTIAL_ID}", variable: 'PRODUCTION_ENV')
                ]) {
                    sh '''
                        set -e
                        docker compose \
                          --env-file "$PRODUCTION_ENV" \
                          -f "$COMPOSE_FILE" \
                          config -q
                        echo "Compose validation passed."
                    '''
                }
            }
        }

        stage('Prepare Rollback State') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                script {
                    sh '''
                        set -e
                        mkdir -p "$STATE_DIR"
                    '''

                    def currentFile = "${env.STATE_DIR}/current_tag"
                    def currentTag = sh(
                        script: "test -f '${currentFile}' && cat '${currentFile}' || true",
                        returnStdout: true
                    ).trim()

                    // The first deployment needs to preserve the images that
                    // are already running under the old Compose configuration.
                    if (!currentTag) {
                        currentTag = "legacy-${env.BUILD_NUMBER}"

                        def services = [
                            'main-service': env.MAIN_IMAGE,
                            'admin-service': env.ADMIN_IMAGE,
                            'booking-service': env.BOOKING_IMAGE,
                            'centralized-db-api': env.DB_IMAGE,
                            'websocket-service': env.WS_IMAGE
                        ]

                        services.each { service, imageName ->
                            def containerId = sh(
                                script: "docker ps -q --filter label=com.docker.compose.service=${service} | head -1",
                                returnStdout: true
                            ).trim()

                            if (!containerId) {
                                containerId = sh(
                                    script: "docker ps -q --filter name=${service} | head -1",
                                    returnStdout: true
                                ).trim()
                            }

                            if (!containerId) {
                                error("No running container found for ${service}. Do not deploy until the existing production containers are running.")
                            }

                            def imageId = sh(
                                script: "docker inspect -f '{{.Image}}' ${containerId}",
                                returnStdout: true
                            ).trim()

                            sh "docker tag ${imageId} ${imageName}:${currentTag}"
                            echo "Preserved ${service} as ${imageName}:${currentTag}"
                        }

                        sh "printf '%s\\n' '${currentTag}' > '${currentFile}'"
                    }

                    env.ROLLBACK_TAG = currentTag
                    echo "Rollback target: ${env.ROLLBACK_TAG}"
                }
            }
        }

        stage('Docker Build') {
            steps {
                withCredentials([
                    file(credentialsId: "${ENV_CREDENTIAL_ID}", variable: 'PRODUCTION_ENV')
                ]) {
                    sh '''
                        set -e

                        echo "Building local Docker images with tag: $DEPLOY_TAG"

                        IMAGE_TAG="$DEPLOY_TAG" \
                        docker compose \
                          --env-file "$PRODUCTION_ENV" \
                          -f "$COMPOSE_FILE" \
                          build

                        echo ""
                        echo "Built VshakaGo images:"
                        docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}' | \
                          grep '^vshakago/' || true
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                script {
                    env.DEPLOY_STARTED = 'true'
                }

                withCredentials([
                    file(credentialsId: "${ENV_CREDENTIAL_ID}", variable: 'PRODUCTION_ENV')
                ]) {
                    sh '''
                        set -e

                        echo "Deploying local image tag: $DEPLOY_TAG"

                        IMAGE_TAG="$DEPLOY_TAG" \
                        docker compose \
                          --env-file "$PRODUCTION_ENV" \
                          -f "$COMPOSE_FILE" \
                          up -d --no-build --remove-orphans

                        docker compose \
                          --env-file "$PRODUCTION_ENV" \
                          -f "$COMPOSE_FILE" \
                          ps
                    '''
                }
            }
        }

        stage('Health Check') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return params.RUN_HEALTH_CHECK }
                }
            }
            steps {
                sh '''
                    set -e

                    check_http() {
                        URL="$1"
                        NAME="$2"

                        echo "Checking $NAME ..."

                        for i in $(seq 1 30); do
                            if curl --fail --silent --show-error --max-time 5 "$URL" > /dev/null; then
                                echo "$NAME: OK"
                                return 0
                            fi
                            echo "$NAME not ready yet ($i/30)"
                            sleep 2
                        done

                        echo "$NAME: FAILED"
                        return 1
                    }

                    check_http "http://127.0.0.1:3000/" "Main service"
                    check_http "http://127.0.0.1:3001/health" "Admin service"
                    check_http "http://127.0.0.1:3002/health" "Booking service"
                    check_http "http://127.0.0.1:3003/health" "Centralized DB service"

                    WS_ID=$(docker ps -q --filter label=com.docker.compose.service=websocket-service | head -1)
                    test -n "$WS_ID"
                    test "$(docker inspect -f '{{.State.Running}}' "$WS_ID")" = "true"

                    echo ""
                    echo "ALL HEALTH CHECKS PASSED."
                '''
            }
        }

        stage('Commit Deployment State') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                script {
                    def currentFile = "${env.STATE_DIR}/current_tag"
                    def previousFile = "${env.STATE_DIR}/previous_tag"

                    def oldCurrent = sh(
                        script: "test -f '${currentFile}' && cat '${currentFile}' || true",
                        returnStdout: true
                    ).trim()

                    def oldPrevious = sh(
                        script: "test -f '${previousFile}' && cat '${previousFile}' || true",
                        returnStdout: true
                    ).trim()

                    sh "printf '%s\\n' '${env.DEPLOY_TAG}' > '${currentFile}'"
                    sh "printf '%s\\n' '${oldCurrent}' > '${previousFile}'"

                    // Keep exactly one previous release for rollback.
                    if (oldPrevious && oldPrevious != oldCurrent && oldPrevious != env.DEPLOY_TAG) {
                        sh """
                            docker image rm -f \\
                              ${env.MAIN_IMAGE}:${oldPrevious} \\
                              ${env.ADMIN_IMAGE}:${oldPrevious} \\
                              ${env.BOOKING_IMAGE}:${oldPrevious} \\
                              ${env.DB_IMAGE}:${oldPrevious} \\
                              ${env.WS_IMAGE}:${oldPrevious} \\
                              || true
                        """
                    }

                    sh '''
                        docker image prune -f || true
                        docker builder prune -f --filter 'until=24h' || true
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "VshakaGo deployment succeeded: ${env.DEPLOY_TAG}"
            script {
                notifyTelegram(
                    "✅ VshakaGo deployment SUCCESS\n" +
                    "Build: #${env.BUILD_NUMBER}\n" +
                    "Commit: ${env.GIT_SHORT}\n" +
                    "Tag: ${env.DEPLOY_TAG}"
                )
            }
        }

        failure {
            script {
                if (env.DEPLOY_STARTED == 'true' && env.ROLLBACK_TAG?.trim()) {
                    echo "Deployment failed. Rolling back to ${env.ROLLBACK_TAG}"

                    try {
                        rollbackDeployment()

                        notifyTelegram(
                            "❌ VshakaGo deployment FAILED\n" +
                            "Build: #${env.BUILD_NUMBER}\n" +
                            "Automatic rollback completed to ${env.ROLLBACK_TAG}."
                        )
                    } catch (rollbackError) {
                        echo "ROLLBACK FAILED: ${rollbackError}"

                        notifyTelegram(
                            "🚨 VshakaGo deployment FAILED\n" +
                            "Build: #${env.BUILD_NUMBER}\n" +
                            "Automatic rollback ALSO FAILED. Immediate investigation required."
                        )
                    }
                } else {
                    echo 'Build/validation failed before deployment. Existing production containers were not intentionally changed.'

                    notifyTelegram(
                        "❌ VshakaGo build/validation FAILED\n" +
                        "Build: #${env.BUILD_NUMBER}\n" +
                        "Production deployment was not started."
                    )
                }
            }
        }

        always {
            sh 'docker image prune -f || true'
            cleanWs(deleteDirs: true, disableDeferredWipeout: true)
        }
    }
}


def rollbackDeployment() {
    withCredentials([
        file(credentialsId: "${env.ENV_CREDENTIAL_ID}", variable: 'PRODUCTION_ENV')
    ]) {
        sh '''
            set -e

            echo "Restoring previous Docker image tag: $ROLLBACK_TAG"

            IMAGE_TAG="$ROLLBACK_TAG" \
            docker compose \
              --env-file "$PRODUCTION_ENV" \
              -f "$COMPOSE_FILE" \
              up -d --no-build --remove-orphans

            echo "Waiting for rollback services..."
            sleep 10

            check_http() {
                URL="$1"
                for i in $(seq 1 20); do
                    if curl --fail --silent --show-error --max-time 5 "$URL" > /dev/null; then
                        return 0
                    fi
                    sleep 2
                done
                return 1
            }

            check_http "http://127.0.0.1:3000/"
            check_http "http://127.0.0.1:3001/health"
            check_http "http://127.0.0.1:3002/health"
            check_http "http://127.0.0.1:3003/health"

            WS_ID=$(docker ps -q --filter label=com.docker.compose.service=websocket-service | head -1)
            test -n "$WS_ID"
            test "$(docker inspect -f '{{.State.Running}}' "$WS_ID")" = "true"

            echo "Rollback health checks passed."
        '''
    }
}


def notifyTelegram(String message) {
    try {
        withCredentials([
            string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
            string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT')
        ]) {
            withEnv(["TG_MESSAGE=${message}"]) {
                sh '''
                    set +x
                    curl --fail --silent --show-error --max-time 10 \
                      -X POST \
                      "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                      --data-urlencode "chat_id=${TG_CHAT}" \
                      --data-urlencode "text=${TG_MESSAGE}" \
                      > /dev/null
                '''
            }
        }
    } catch (err) {
        echo 'Telegram notification skipped; credentials are not configured.'
    }
}
