const messageEditor = document.getElementById('messageEditor');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const hint = document.getElementById('hint');
const statusDot = document.getElementById('statusDot');
const toolButtons = Array.from(document.querySelectorAll('.tool-button'));

function setStatus(text, active = false) {
  hint.textContent = text;
  statusDot.classList.toggle('status-dot-active', active);
}

function focusEditor() {
  messageEditor.focus();
}

function selectEditorContents() {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(messageEditor);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertHtmlAtCursor(html) {
  focusEditor();
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    messageEditor.insertAdjacentHTML('beforeend', html);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function normalizeClipboardHtml(html) {
  return html
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

function plainTextToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.split('\n').join('<br>')}</p>`)
    .join('');
}

function getEditorHtml() {
  const html = messageEditor.innerHTML.trim();
  if (!html || html === '<br>') {
    return '';
  }

  return html;
}

function setEditorHtml(html) {
  messageEditor.innerHTML = html;
}

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const command = button.dataset.command;
    focusEditor();

    if (command === 'removeFormat') {
      document.execCommand('removeFormat', false);
      document.execCommand('unlink', false);
      return;
    }

    document.execCommand(command, false, null);
  });
});

messageEditor.addEventListener('paste', (event) => {
  event.preventDefault();

  const html = event.clipboardData?.getData('text/html');
  const text = event.clipboardData?.getData('text/plain') || '';

  if (html) {
    insertHtmlAtCursor(normalizeClipboardHtml(html));
    return;
  }

  insertHtmlAtCursor(plainTextToHtml(text).replace(/<p><\/p>/g, '<p>&nbsp;</p>'));
});

messageEditor.addEventListener('input', () => {
  if (!messageEditor.textContent.trim()) {
    messageEditor.dataset.empty = 'true';
  } else {
    delete messageEditor.dataset.empty;
  }
});

messageEditor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    document.execCommand('insertText', false, '\t');
  }
});

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function sendToContentScript(message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [tab] = tabs;

      if (!tab?.id || !tab.url || !tab.url.includes('linkedin.com')) {
        reject(new Error('Abra o LinkedIn em uma aba ativa para usar esta extensão.'));
        return;
      }

      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              files: ['content.js'],
            },
            () => {
              if (chrome.runtime.lastError) {
                reject(new Error('Não foi possível se comunicar com a página do LinkedIn.'));
                return;
              }

              chrome.tabs.sendMessage(tab.id, message, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  reject(new Error('Não foi possível se comunicar com a página do LinkedIn.'));
                  return;
                }

                resolve(retryResponse);
              });
            }
          );
          return;
        }

        resolve(response);
      });
    });
  });
}

startButton.addEventListener('click', async () => {
  const html = getEditorHtml();
  const text = messageEditor.innerText.trim();

  if (!text) {
    setStatus('Cole um texto antes de iniciar.', false);
    return;
  }

  startButton.disabled = true;
  setStatus('Procurando o compositor do LinkedIn...', true);

  try {
    const response = await sendToContentScript({
      type: 'START_TYPING',
      text,
      html,
    });

    setStatus(response?.message || 'Digitação iniciada.', true);
  } catch (error) {
    setStatus(error.message, false);
  } finally {
    startButton.disabled = false;
  }
});

stopButton.addEventListener('click', async () => {
  try {
    const response = await sendToContentScript({ type: 'STOP_TYPING' });
    setStatus(response?.message || 'Digitação interrompida.', false);
  } catch (error) {
    setStatus(error.message, false);
  }
});

getActiveTab().then((tab) => {
  if (!tab?.url || !tab.url.includes('linkedin.com')) {
    setStatus('Abra uma aba do LinkedIn antes de usar a extensão.', false);
  }
});

messageEditor.addEventListener('focus', () => {
  if (!messageEditor.textContent.trim()) {
    messageEditor.dataset.empty = 'true';
  }
});