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
    choice(
      name: 'EXECUTION',
      choices: ['parallel', 'sequential'],
      description: 'parallel = multiple workers, sequential = one worker'
    )
    string(
      name: 'WORKERS',
      defaultValue: '4',
      description: 'Number of parallel workers (only used when EXECUTION=parallel)'
    )
    string(
      name: 'TARGET',
      defaultValue: 'regression',
      description: 'For suite mode use sanity or regression. For spec mode use a spec path like regression/test_kortis_01.spec.js'
    )
  }
  stages {
    stage('Clean Workspace') {
      steps {
        cleanWs()
        checkout scm
      }
    }

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
          def workersArg = params.EXECUTION == 'sequential' ? '--workers=1' : '--workers=' + params.WORKERS.trim()
          def suiteTarget = params.TARGET.trim()
          def target = params.EXECUTION_MODE == 'suite'
              ? (suiteTarget == 'sanity' ? 'sanity' : 'regression')
              : suiteTarget
          def command = 'npx playwright test "' + target + '" ' + browserArg + ' ' + workersArg
          if (headedArg) {
            command = command + ' ' + headedArg
          }

          echo "==================================="
          echo "HEADED: ${params.HEADED}"
          echo "EXECUTION: ${params.EXECUTION}"
          echo "WORKERS: ${params.WORKERS}"
          echo "FINAL COMMAND: ${command}"
          echo "==================================="

          catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            powershell(command)
          }
        }
      }
    }

    stage('Generate Allure Report') {
      steps {
        powershell '''
          if (Test-Path "allure-results") {
            try {
              npx -p allure-commandline allure generate allure-results -o allure-report --clean
              Write-Host "Allure HTML report generated."
            } catch {
              Write-Host "Allure generation failed: $_"
            }
          } else {
            Write-Host "No allure-results directory; skipping Allure HTML generation."
          }
        '''
      }
    }
  }
  post {
    always {
      archiveArtifacts(
        artifacts: 'test-results/**, playwright-report/**, allure-results/**, allure-report/**',
        allowEmptyArchive: true
      )
    }
  }
}