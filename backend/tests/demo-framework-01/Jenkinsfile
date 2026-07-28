pipeline {
  agent any

  options {
    timestamps()
  }

  parameters {
    choice(
      name: 'EXECUTION_MODE',
      choices: ['suite', 'spec'],
      description: 'suite = run sanity/regression folder, spec = run one spec file'
    )
    choice(
      name: 'BROWSER',
      choices: ['chromium', 'chrome', 'msedge', 'firefox', 'webkit'],
      description: 'Playwright project name'
    )
    booleanParam(
      name: 'HEADED',
      defaultValue: false,
      description: 'Run browser in headed mode'
    )
    string(
      name: 'TARGET',
      defaultValue: 'regression',
      description: 'For suite mode use sanity or regression. For spec mode use a spec path like regression/test_kortis_01.spec.js'
    )
  }

  stages {
    stage('Install') {
      steps {
        powershell 'npm ci'
        powershell 'npx playwright install'
      }
    }

    stage('Run Tests') {
      steps {
        script {
          def headedArg = params.HEADED ? '--headed' : ''
          def browserArg = '--project=' + params.BROWSER
          def suiteTarget = params.TARGET.trim()
          def target = params.EXECUTION_MODE == 'suite'
              ? (suiteTarget == 'sanity' ? 'sanity' : 'regression')
              : suiteTarget
          def command = 'npx playwright test "' + target + '" ' + browserArg
          if (headedArg) {
            command = command + ' ' + headedArg
          }
          powershell(command)
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'test-results/**, playwright-report/**, allure-results/**, allure-report/**', allowEmptyArchive: true
      allure([
        includeProperties: false,
        jdk: '',
        results: [[path: 'allure-results']]
      ])
      publishHTML([
          reportDir: 'playwright-report',
          reportFiles: 'index.html',
          reportName: 'Playwright HTML Report',
          keepAll: true,
          alwaysLinkToLastBuild: true,
          allowMissing: true
      ])
    }
  }
}
