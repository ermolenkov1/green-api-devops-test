const DEFAULT_API_URL = "https://api.green-api.com";

const form = document.querySelector("#apiForm");
const responseOutput = document.querySelector("#responseOutput");
const buttons = document.querySelectorAll("[data-method]");
const connectionState = document.querySelector("#connectionState");
const lastMethod = document.querySelector("#lastMethod");
const lastStatus = document.querySelector("#lastStatus");
const lastTime = document.querySelector("#lastTime");
const copyResponse = document.querySelector("#copyResponse");
const clearResponse = document.querySelector("#clearResponse");
const tokenToggle = document.querySelector("#tokenToggle");

const fields = {
  apiUrl: document.querySelector("#apiUrl"),
  idInstance: document.querySelector("#idInstance"),
  apiTokenInstance: document.querySelector("#apiTokenInstance"),
  messageChatId: document.querySelector("#messageChatId"),
  messageText: document.querySelector("#messageText"),
  fileChatId: document.querySelector("#fileChatId"),
  fileUrl: document.querySelector("#fileUrl"),
  fileName: document.querySelector("#fileName"),
  fileCaption: document.querySelector("#fileCaption"),
};

const requests = {
  getSettings: () => ({
    path: "getSettings",
    options: { method: "GET" },
  }),
  getStateInstance: () => ({
    path: "getStateInstance",
    options: { method: "GET" },
  }),
  sendMessage: () => ({
    path: "sendMessage",
    options: postJson({
      chatId: getChatId(fields.messageChatId.value, "chatId"),
      message: requireValue(fields.messageText.value, "message"),
    }),
  }),
  sendFileByUrl: () => {
    const urlFile = requireValue(fields.fileUrl.value, "urlFile");
    const fileName = fields.fileName.value.trim() || getFileName(urlFile);
    const caption = fields.fileCaption.value.trim();
    const body = {
      chatId: getChatId(fields.fileChatId.value, "chatId"),
      urlFile,
      fileName,
    };

    if (caption) {
      body.caption = caption;
    }

    return {
      path: "sendFileByUrl",
      options: postJson(body),
    };
  },
};

buttons.forEach((button) => {
  button.addEventListener("click", () => runMethod(button.dataset.method, button));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

tokenToggle.addEventListener("click", () => {
  const isHidden = fields.apiTokenInstance.type === "password";
  fields.apiTokenInstance.type = isHidden ? "text" : "password";
  tokenToggle.textContent = isHidden ? "●" : "◌";
  tokenToggle.title = isHidden ? "Скрыть токен" : "Показать токен";
  tokenToggle.setAttribute("aria-label", tokenToggle.title);
});

copyResponse.addEventListener("click", async () => {
  await navigator.clipboard.writeText(responseOutput.value);
  copyResponse.textContent = "Copied";
  window.setTimeout(() => {
    copyResponse.textContent = "Copy JSON";
  }, 1000);
});

clearResponse.addEventListener("click", () => {
  writeResponse({ status: "waiting" });
  lastMethod.textContent = "No request";
  lastStatus.textContent = "Idle";
  lastTime.textContent = "-- ms";
  setState("Ready");
});

fields.fileUrl.addEventListener("blur", () => {
  if (!fields.fileName.value.trim() && fields.fileUrl.value.trim()) {
    fields.fileName.value = getFileName(fields.fileUrl.value.trim());
  }
});

writeResponse({ status: "waiting" });

async function runMethod(methodName, button) {
  const startedAt = performance.now();

  try {
    const idInstance = requireValue(fields.idInstance.value, "idInstance");
    const apiTokenInstance = requireValue(fields.apiTokenInstance.value, "ApiTokenInstance");
    const apiUrl = getApiUrl(fields.apiUrl.value);
    const request = requests[methodName]();
    const url = `${apiUrl}/waInstance${idInstance}/${request.path}/${apiTokenInstance}`;

    setLoading(button, true);
    setState("Loading", "loading");
    lastMethod.textContent = methodName;
    lastStatus.textContent = "Requesting";
    writeResponse({
      method: methodName,
      status: "loading",
    });

    const response = await fetch(url, request.options);
    const text = await response.text();
    const body = parseBody(text);
    const duration = Math.round(performance.now() - startedAt);

    lastStatus.textContent = `${response.status} ${response.ok ? "OK" : "Error"}`;
    lastTime.textContent = `${duration} ms`;
    setState(response.ok ? "Ready" : "Error", response.ok ? "" : "error");
    writeResponse({
      method: methodName,
      status: response.status,
      ok: response.ok,
      response: body,
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startedAt);

    lastStatus.textContent = "Client error";
    lastTime.textContent = `${duration} ms`;
    setState("Error", "error");
    writeResponse({
      error: error.message,
    });
  } finally {
    setLoading(button, false);
  }
}

function postJson(body) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function requireValue(value, fieldName) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Fill ${fieldName}`);
  }

  return normalized;
}

function getApiUrl(value) {
  const normalized = value.trim() || DEFAULT_API_URL;

  return normalized.replace(/\/+$/, "");
}

function getChatId(value, fieldName) {
  const chatId = requireValue(value, fieldName);

  if (chatId.includes("@")) {
    return chatId;
  }

  return `${chatId.replace(/\D/g, "")}@c.us`;
}

function getFileName(urlFile) {
  try {
    const url = new URL(urlFile);
    const fileName = url.pathname.split("/").filter(Boolean).pop();

    return fileName || "file";
  } catch {
    return "file";
  }
}

function parseBody(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function writeResponse(value) {
  responseOutput.value =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setLoading(activeButton, isLoading) {
  buttons.forEach((button) => {
    button.disabled = isLoading;
  });

  if (!activeButton) {
    return;
  }

  activeButton.textContent = isLoading ? "loading..." : activeButton.dataset.method;
}

function setState(text, modifier = "") {
  connectionState.textContent = text;
  connectionState.className = modifier ? `status-chip ${modifier}` : "status-chip";
}
