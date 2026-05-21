
# LinkedIn Typing Assistant

Extensão para Google Chrome (Manifest V3) projetada para automatizar a digitação de publicações no LinkedIn de forma natural e com preservação básica de formatação.

Visão geral
-----------
Esta extensão permite colar ou editar texto em um editor minimalista (rich-text) e reproduzi-lo no compositor de posts do LinkedIn caractere a caractere, simulando comportamento humano (velocidade variável, pausas entre palavras e frases). A extensão tenta preservar formatação básica como negrito, itálico, sublinhado, listas e quebras de linha.

Principais recursos
-------------------
- Editor rich-text com ferramentas básicas de formatação.
- Colagem que preserva HTML básico ou converte texto simples em parágrafos.
- Simulação de digitação humana (eventos de teclado e input reais).
- Botões para iniciar e interromper a digitação.
- Restrita ao domínio `linkedin.com` (especificado em `manifest.json`).

Estrutura do projeto
--------------------
- `manifest.json` — Manifest V3 da extensão.
- `popup.html`, `popup.js`, `style.css` — interface da popup e comportamento do editor.
- `content.js` — busca o compositor do LinkedIn, injeta eventos reais de teclado/input e controla a digitação simulada.
- `init_and_push.ps1` — script auxiliar (opcional) para inicializar o repositório local e enviar ao GitHub.
- `LICENSE` — licença MIT.

Instalação (modo desenvolvedor)
------------------------------
1. Abra o Chrome e acesse `chrome://extensions/`.
2. Ative "Developer mode".
3. Clique em "Load unpacked" e selecione a pasta deste projeto.
4. Abra o LinkedIn, abra a extensão, cole/edite o texto e clique em "Iniciar".

Desenvolvimento e depuração
---------------------------
- Recarregue a extensão em `chrome://extensions/` após mudanças.
- Para depurar o `content.js`, abra as DevTools na aba do LinkedIn (F12) e observe mensagens, listeners e eventos disparados.



Licença
-------
MIT — ver `LICENSE`.

Aviso de uso
------------
Esta ferramenta executa automação que interage com a interface do LinkedIn. Utilize-a com responsabilidade, respeitando os Termos de Serviço do LinkedIn e a legislação aplicável.

Contato
-------
Abra uma issue no repositório ou envie mensagens via GitHub.

---
