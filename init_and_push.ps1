<#
  Script PowerShell para inicializar um repositório Git local, commitar arquivos e enviar para um remote GitHub.
  - Executar a partir da raiz do projeto (c:\Users\Home\Documents\ANMT)
  - Se `gh` (GitHub CLI) estiver disponível e você quiser criar o repo automaticamente, basta responder quando solicitado.
#>

param()

function Prompt-Input([string]$message){
  Write-Host -NoNewline "$message " -ForegroundColor Cyan
  return Read-Host
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git não encontrado no PATH. Instale Git antes de continuar." -ForegroundColor Red
  exit 1
}

$cwd = Get-Location
Write-Host "Iniciando em: $cwd" -ForegroundColor Green

if (-not (Test-Path .git)) {
  git init
  Write-Host "Repositório Git inicializado." -ForegroundColor Green
} else {
  Write-Host "Repositório Git já existe nesta pasta." -ForegroundColor Yellow
}

git add --all

$commitMessage = Prompt-Input "Mensagem do commit (enter para usar 'Initial commit')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) { $commitMessage = 'Initial commit' }

git commit -m "$commitMessage" -q
Write-Host "Arquivos commitados." -ForegroundColor Green

# Tentar usar gh para criar repositório remoto se usuário desejar
$useGh = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $choice = Prompt-Input "Deseja criar o repositório no GitHub usando 'gh' (requer login)? (s/N)"
  if ($choice -match '^(s|S|y|Y)') { $useGh = $true }
}

if ($useGh) {
  $repoName = Prompt-Input "Nome do repositório no GitHub (enter para usar 'anmt-linkedin-typing')"
  if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = 'anmt-linkedin-typing' }

  gh repo create $repoName --public --source=. --remote=origin --push
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Repositório criado e push realizado." -ForegroundColor Green
    exit 0
  } else {
    Write-Host "Falha ao criar com 'gh'. Você pode fornecer manualmente a URL do remote." -ForegroundColor Yellow
  }
}

# Se não usar gh, pedir URL remota
$remoteUrl = Prompt-Input "URL do repositório remoto (ex: https://github.com/usuario/repo.git) ou enter para mostrar instruções"

if (![string]::IsNullOrWhiteSpace($remoteUrl)) {
  git remote remove origin -ErrorAction SilentlyContinue
  git remote add origin $remoteUrl
  git branch -M main
  git push -u origin main
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Push finalizado com sucesso." -ForegroundColor Green
    exit 0
  } else {
    Write-Host "Falha no push. Verifique a URL e suas credenciais." -ForegroundColor Red
    exit 1
  }
}

Write-Host "--- Instruções manuais ---" -ForegroundColor Cyan
Write-Host "1) Crie um repositório no GitHub via web UI." -ForegroundColor White
Write-Host "2) Depois rode:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow

exit 0
