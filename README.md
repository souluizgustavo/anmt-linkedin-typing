# LinkedIn Typing Assistant

Extensão Chrome (Manifest V3) que abre um editor minimalista para colar/formatar texto e digita o conteúdo no compositor do LinkedIn simulando digitação humana (caractere a caractere).

Arquivos incluídos:

- `manifest.json`
- `popup.html`
- `popup.js`
- `content.js`
- `style.css`
- `init_and_push.ps1` (script de auxílio para inicializar repositório e enviar ao GitHub)
- `LICENSE`

Como subir este projeto para o seu GitHub (passos recomendados):

1. Abra um terminal PowerShell na pasta do projeto (`c:\Users\Home\Documents\ANMT`).
2. (Opcional) Revise os arquivos e faça alterações.
3. Execute o script de inicialização e push abaixo e siga as instruções interativas para informar a URL do repositório remoto (ex.: `https://github.com/SEU_USUARIO/REPO.git`).

   ```powershell
   .\init_and_push.ps1
   ```

Alternativa com `gh` (GitHub CLI) se você estiver autenticado:

```powershell
# cria repositório público com o nome 'anmt-linkedin-typing' e envia a branch main
gh repo create anmt-linkedin-typing --public --source=. --remote=origin --push
```

Notas de segurança e uso:

- A extensão foi projetada para funcionar apenas em `linkedin.com`.
- A extensão simula digitação real; use com responsabilidade e dentro das políticas do LinkedIn.

---
