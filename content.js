window.__linkedinTypingAssistantInjected = true;

let typingState = {
  running: false,
  stopRequested: false,
  target: null,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function isSentenceEnd(char) {
  return char === '.' || char === '!' || char === '?';
}

function isPauseChar(char) {
  return char === ',' || char === ';' || char === ':';
}

function getTypingDelay(char, previousChar) {
  if (char === '\n') {
    return randomBetween(180, 340);
  }

  if (isSentenceEnd(previousChar)) {
    return randomBetween(220, 520);
  }

  if (isSentenceEnd(char)) {
    return randomBetween(120, 260);
  }

  if (isPauseChar(char)) {
    return randomBetween(90, 220);
  }

  if (char === ' ') {
    return randomBetween(45, 130);
  }

  return randomBetween(25, 95);
}

function getActiveMarks(markSet) {
  return {
    bold: markSet.has('bold'),
    italic: markSet.has('italic'),
    underline: markSet.has('underline'),
  };
}

function getKeyMetadata(char) {
  if (char === ' ') {
    return { key: ' ', code: 'Space', keyCode: 32, charCode: 32 };
  }

  if (char === '\n') {
    return { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13 };
  }

  if (/^[a-z]$/i.test(char)) {
    return { key: char, code: `Key${char.toUpperCase()}`, keyCode: char.toUpperCase().charCodeAt(0), charCode: char.toUpperCase().charCodeAt(0) };
  }

  if (/^[0-9]$/.test(char)) {
    return { key: char, code: `Digit${char}`, keyCode: char.charCodeAt(0), charCode: char.charCodeAt(0) };
  }

  return { key: char, code: 'Unidentified', keyCode: 0, charCode: 0 };
}

function dispatchKeyboardEvent(target, type, char) {
  const { key, code, keyCode, charCode } = getKeyMetadata(char);
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    code,
    charCode,
    keyCode,
  });

  target.dispatchEvent(event);
}

function dispatchInputEvent(target, type, data, inputType = 'insertText') {
  const event = new InputEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    data,
    inputType,
  });

  target.dispatchEvent(event);
}

function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value') ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value') ||
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function insertTextIntoContentEditable(element, text) {
  const selection = window.getSelection();
  let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  if (!range || !element.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
  }

  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

function insertLineBreakIntoContentEditable(element) {
  const selection = window.getSelection();
  let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  if (!range || !element.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
  }

  range.deleteContents();

  const lineBreak = document.createElement('br');
  range.insertNode(lineBreak);

  const filler = document.createTextNode('\u200B');
  lineBreak.parentNode.insertBefore(filler, lineBreak.nextSibling);

  range.setStartAfter(filler);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

function insertTextIntoInput(element, text) {
  const previousValue = element.value ?? '';
  const selectionStart = element.selectionStart ?? previousValue.length;
  const selectionEnd = element.selectionEnd ?? previousValue.length;
  const nextValue = `${previousValue.slice(0, selectionStart)}${text}${previousValue.slice(selectionEnd)}`;

  setNativeValue(element, nextValue);

  const nextCaret = selectionStart + text.length;
  if (typeof element.setSelectionRange === 'function') {
    element.setSelectionRange(nextCaret, nextCaret);
  }
}

function setFormattingState(element, previousMarks, nextMarks) {
  const commands = [
    ['bold', 'bold'],
    ['italic', 'italic'],
    ['underline', 'underline'],
  ];

  for (const [mark, command] of commands) {
    if (previousMarks[mark] !== nextMarks[mark]) {
      element.focus();
      document.execCommand(command, false, null);
    }
  }
}

function insertRichCharacter(element, char) {
  if (char === '\n') {
    insertLineBreakIntoContentEditable(element);
    return;
  }

  insertTextIntoContentEditable(element, char);
}

function insertTextIntoField(element, text) {
  dispatchKeyboardEvent(element, 'keydown', text);

  if (element.isContentEditable) {
    element.focus();
    dispatchInputEvent(element, 'beforeinput', text, text === '\n' ? 'insertParagraph' : 'insertText');
    insertTextIntoContentEditable(element, text);
    dispatchInputEvent(element, 'input', text, text === '\n' ? 'insertParagraph' : 'insertText');
  } else {
    dispatchInputEvent(element, 'beforeinput', text, 'insertText');
    insertTextIntoInput(element, text);
    dispatchInputEvent(element, 'input', text, 'insertText');
  }

  dispatchKeyboardEvent(element, 'keypress', text);
  dispatchKeyboardEvent(element, 'keyup', text);
}

function sanitizeHtml(html) {
  const root = document.createElement('div');
  root.innerHTML = html;

  root.querySelectorAll('script, style, meta').forEach((node) => node.remove());

  return root.innerHTML;
}

function htmlToOperations(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizeHtml(html);

  const operations = [];

  function walk(node, marks) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue || '';
      if (value.trim() || value.includes('\n')) {
        operations.push({ type: 'text', value, marks: new Set(marks) });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (tag === 'br') {
      operations.push({ type: 'break' });
      return;
    }

    if (tag === 'strong' || tag === 'b') {
      const nextMarks = new Set(marks);
      nextMarks.add('bold');
      node.childNodes.forEach((child) => walk(child, nextMarks));
      return;
    }

    if (tag === 'em' || tag === 'i') {
      const nextMarks = new Set(marks);
      nextMarks.add('italic');
      node.childNodes.forEach((child) => walk(child, nextMarks));
      return;
    }

    if (tag === 'u') {
      const nextMarks = new Set(marks);
      nextMarks.add('underline');
      node.childNodes.forEach((child) => walk(child, nextMarks));
      return;
    }

    if (tag === 'li') {
      operations.push({ type: 'text', value: '• ', marks: new Set() });
      node.childNodes.forEach((child) => walk(child, marks));
      operations.push({ type: 'break' });
      return;
    }

    const childMarks = new Set(marks);
    node.childNodes.forEach((child) => walk(child, childMarks));

    if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
      operations.push({ type: 'break' });
    }
  }

  wrapper.childNodes.forEach((child) => walk(child, new Set()));
  return operations;
}

async function typeRichContent(html, field) {
  const operations = htmlToOperations(html);
  let previousMarks = getActiveMarks(new Set());

  typingState.running = true;
  typingState.stopRequested = false;
  typingState.target = field;

  field.focus();

  for (const operation of operations) {
    if (typingState.stopRequested) {
      break;
    }

    if (operation.type === 'break') {
      dispatchKeyboardEvent(field, 'keydown', '\n');
      dispatchInputEvent(field, 'beforeinput', '\n', 'insertParagraph');
      insertLineBreakIntoContentEditable(field);
      dispatchInputEvent(field, 'input', '\n', 'insertParagraph');
      dispatchKeyboardEvent(field, 'keyup', '\n');
      await sleep(randomBetween(90, 220));
      previousMarks = getActiveMarks(new Set());
      continue;
    }

    const nextMarks = getActiveMarks(operation.marks);
    setFormattingState(field, previousMarks, nextMarks);
    previousMarks = nextMarks;

    let previousChar = '';

    for (const char of operation.value) {
      if (typingState.stopRequested) {
        break;
      }

      dispatchKeyboardEvent(field, 'keydown', char);
      dispatchInputEvent(field, 'beforeinput', char, 'insertText');
      insertRichCharacter(field, char);
      dispatchInputEvent(field, 'input', char, 'insertText');
      dispatchKeyboardEvent(field, 'keypress', char);
      dispatchKeyboardEvent(field, 'keyup', char);

      const delay = getTypingDelay(char, previousChar);
      previousChar = char;
      await sleep(delay);
    }

    if (operation.value.endsWith(' ')) {
      await sleep(randomBetween(0, 110));
    }
  }

  setFormattingState(field, previousMarks, getActiveMarks(new Set()));
  typingState.running = false;
  typingState.target = null;
}

function findComposerField() {
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label]',
    'textarea[aria-label]',
    'textarea'
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    const match = elements.find((element) => {
      const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
      const role = (element.getAttribute('role') || '').toLowerCase();
      const contentEditable = element.getAttribute('contenteditable');

      if (contentEditable === 'true' && role === 'textbox') {
        return true;
      }

      return ariaLabel.includes('post') ||
        ariaLabel.includes('publication') ||
        ariaLabel.includes('publicação') ||
        placeholder.includes('post') ||
        placeholder.includes('publication') ||
        placeholder.includes('publicação');
    });

    if (match) {
      return match;
    }
  }

  return null;
}

function findAndOpenComposer() {
  const buttonCandidates = Array.from(document.querySelectorAll('button, [role="button"], a'));
  const match = buttonCandidates.find((element) => {
    const text = `${element.textContent || ''} ${(element.getAttribute('aria-label') || '')}`.toLowerCase();
    return text.includes('start a post') ||
      text.includes('create a post') ||
      text.includes('write a post') ||
      text.includes('criar publicação') ||
      text.includes('nova publicação') ||
      text.includes('escrever publicação') ||
      text.includes('publicar');
  });

  if (match) {
    match.click();
    return true;
  }

  return false;
}

async function waitForComposer(timeoutMs = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const field = findComposerField();
    if (field) {
      return field;
    }

    await sleep(250);
  }

  return null;
}

async function typeHumanLike(text, field) {
  typingState.running = true;
  typingState.stopRequested = false;
  typingState.target = field;

  field.focus();

  let previousChar = '';

  for (const char of text) {
    if (typingState.stopRequested) {
      break;
    }

    dispatchKeyboardEvent(field, 'keydown', char);

    if (char === '\n') {
      insertTextIntoField(field, '\n');
    } else {
      insertTextIntoField(field, char);
    }

    dispatchKeyboardEvent(field, 'keypress', char);
    dispatchKeyboardEvent(field, 'keyup', char);

    const delay = getTypingDelay(char, previousChar);
    previousChar = char;
    await sleep(delay);

    if (char === ' ') {
      await sleep(randomBetween(0, 110));
    }

    if (isPauseChar(char) || isSentenceEnd(char)) {
      await sleep(randomBetween(60, 240));
    }
  }

  typingState.running = false;
  typingState.target = null;
}

async function startTyping(payload) {
  if (typingState.running) {
    typingState.stopRequested = true;
    await sleep(50);
  }

  const currentField = findComposerField() || (findAndOpenComposer() ? await waitForComposer() : null);

  if (!currentField) {
    return { ok: false, message: 'Não encontrei o campo de publicação do LinkedIn.' };
  }

  const html = payload?.html || '';
  const text = payload?.text || '';

  if (html && html.trim()) {
    await typeRichContent(html, currentField);
  } else {
    await typeHumanLike(text, currentField);
  }

  if (typingState.stopRequested) {
    return { ok: true, message: 'Digitação interrompida.' };
  }

  return { ok: true, message: 'Texto digitado com sucesso.' };
}

if (!window.__linkedinTypingAssistantListenerAttached) {
  window.__linkedinTypingAssistantListenerAttached = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'START_TYPING') {
      startTyping(message).then(sendResponse);
      return true;
    }

    if (message?.type === 'STOP_TYPING') {
      typingState.stopRequested = true;
      typingState.running = false;
      sendResponse({ ok: true, message: 'Parada solicitada.' });
      return false;
    }

    return false;
  });
}