const objectsNav = document.getElementById("objects-nav");
const objectsList = document.getElementById("objects-list");
const objectSettingsModalElement = document.getElementById("object-settings-modal");
const objectSettingsModal = new bootstrap.Modal(objectSettingsModalElement);
const objectSettingsModalTitle = document.getElementById("object-settings-modal-title");
const objectSettingsModalBody = document.getElementById("object-settings-modal-body");
const saveObjectSettingsButton = document.getElementById("save-object-settings");
const saveCloseObjectSettingsButton = document.getElementById("save-close-object-settings");
const objectSettingsBaseUrl = objectsList.dataset.settingsUrlTemplate;
const objectDeleteBaseUrl = objectsList.dataset.deleteUrlTemplate;
const trashIconUrl = objectsList.dataset.trashIconUrl;
let currentObjType = null;
let currentObjectId = null;

function findObjectsList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return null;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && typeof response.data === "object") {
    for (const value of Object.values(response.data)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderObjects(response) {
  const items = findObjectsList(response);

  if (!items) {
    objectsList.innerHTML = `<pre class="border rounded p-3 bg-light">${escapeHtml(JSON.stringify(response, null, 2))}</pre>`;
    return;
  }

  if (items.length === 0) {
    objectsList.innerHTML = `<div class="text-body-secondary">Список пуст</div>`;
    return;
  }

  objectsList.innerHTML = items.map((item) => {
    const title = item.label || item.name || item.title || item.id || "Объект";
    const objectId = item.id;
    const details = Object.entries(item)
      .slice(0, 6)
      .map(([key, value]) => `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(JSON.stringify(value))}</div>`)
      .join("");

    return `
      <div class="card mb-2 object-card" data-object-id="${escapeHtml(objectId)}" role="button" tabindex="0">
        <div class="card-body d-flex gap-3 align-items-start">
          <div class="flex-grow-1">
            <h5 class="card-title">${escapeHtml(title)}</h5>
            ${details}
          </div>
          <button class="btn object-delete-button" type="button" title="Удалить" aria-label="Удалить объект">
            <img src="${escapeHtml(trashIconUrl)}" alt="" width="18" height="18">
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function getObjectSettingsUrl(objType, objectId) {
  return objectSettingsBaseUrl
    .replace("__obj_type__", encodeURIComponent(objType))
    .replace(/\/0$/, `/${encodeURIComponent(objectId)}`);
}

function getObjectDeleteUrl(objType, objectId) {
  return objectDeleteBaseUrl
    .replace("__obj_type__", encodeURIComponent(objType))
    .replace(/\/0\/delete$/, `/${encodeURIComponent(objectId)}/delete`);
}

function getParamValue(params, settingId, fallback) {
  const param = params.find((item) => String(item.id) === String(settingId));
  return param && param.val !== null ? param.val : fallback || "";
}

function renderSetting(setting, params) {
  const inputName = `param-${setting.id}`;
  const value = getParamValue(params, setting.id, setting.vDefault);
  const editType = setting.editType || {};
  const hint = setting.hint ? `<div class="form-text">${escapeHtml(setting.hint)}</div>` : "";

  if (editType.type === "enum" && Array.isArray(editType.values)) {
    const options = editType.values.map((option) => {
      const selected = String(option.value) === String(value) ? "selected" : "";
      return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
    }).join("");

    return `
      <div class="mb-3">
        <label class="form-label" for="${inputName}">${escapeHtml(setting.label || setting.name)}</label>
        <select class="form-select" id="${inputName}" name="${inputName}">
          ${options}
        </select>
        ${hint}
      </div>
    `;
  }

  return `
    <div class="mb-3">
      <label class="form-label" for="${inputName}">${escapeHtml(setting.label || setting.name)}</label>
      <input class="form-control" id="${inputName}" name="${inputName}" value="${escapeHtml(value)}">
      ${hint}
    </div>
  `;
}

function renderSettingsForm(response) {
  const obj = response && response.data && response.data.obj ? response.data.obj : null;
  const objTypes = response && response.data && Array.isArray(response.data.objTypes) ? response.data.objTypes : [];

  if (!obj || !Array.isArray(obj.params)) {
    objectSettingsModalTitle.textContent = "Настройки объекта";
    objectSettingsModalBody.innerHTML = `<pre class="border rounded p-3 bg-light">${escapeHtml(JSON.stringify(response, null, 2))}</pre>`;
    return;
  }

  const objType = objTypes.find((item) => String(item.id) === String(obj.type)) || objTypes[0];
  const settingGroups = objType && Array.isArray(objType.settingGroups) ? objType.settingGroups : [];

  const groupsHtml = settingGroups.map((group) => {
    const settings = Array.isArray(group.settings) ? group.settings : [];
    const settingsHtml = settings.map((setting) => renderSetting(setting, obj.params)).join("");

    return `
      <fieldset class="border rounded p-3 mb-3">
        <legend class="float-none w-auto px-2 fs-6">${escapeHtml(group.label || group.name)}</legend>
        ${settingsHtml}
      </fieldset>
    `;
  }).join("");

  objectSettingsModalTitle.textContent = obj.name || `Объект #${obj.id}`;
  objectSettingsModalBody.innerHTML = `
    <form id="object-settings-form">
      ${groupsHtml || `<pre class="border rounded p-3 bg-light">${escapeHtml(JSON.stringify(obj.params, null, 2))}</pre>`}
    </form>
  `;
}

function loadObjectSettings(objectId) {
  if (!currentObjType || !objectId) {
    return;
  }

  currentObjectId = objectId;
  objectSettingsModalTitle.textContent = "Настройки объекта";
  objectSettingsModalBody.innerHTML = `<div class="text-body-secondary">Загрузка настроек...</div>`;
  objectSettingsModal.show();

  fetch(getObjectSettingsUrl(currentObjType, objectId))
    .then((response) => response.json())
    .then(renderSettingsForm)
    .catch((error) => {
      objectSettingsModalBody.innerHTML = `<div class="alert alert-danger">Ошибка загрузки настроек: ${escapeHtml(error)}</div>`;
    });
}

function collectSettingsFormData() {
  const form = document.getElementById("object-settings-form");
  if (!form) {
    return [];
  }

  return Array.from(form.elements)
    .filter((element) => element.name && element.name.startsWith("param-"))
    .map((element) => ({
      id: Number(element.name.replace("param-", "")),
      val: element.value,
    }));
}

function saveObjectSettings({ closeAfterSave = false } = {}) {
  const params = collectSettingsFormData();

  console.log("save settings draft", {
    objType: currentObjType,
    objectId: currentObjectId,
    params: params,
  });

  if (closeAfterSave) {
    objectSettingsModal.hide();
  }
}

function deleteObject(card) {
  if (!currentObjType || !card) {
    return;
  }

  const objectId = card.dataset.objectId;
  if (!objectId || !confirm("Удалить объект?")) {
    return;
  }

  const deleteButton = card.querySelector(".object-delete-button");
  if (deleteButton) {
    deleteButton.disabled = true;
  }

  fetch(getObjectDeleteUrl(currentObjType, objectId), {
    method: "POST",
  })
    .then((response) => response.json())
    .then((response) => {
      if (response && response.err && Number(response.err) !== 0) {
        throw new Error(response.msg || `Ошибка удаления: ${response.err}`);
      }

      if (String(currentObjectId) === String(objectId)) {
        currentObjectId = null;
        objectSettingsModal.hide();
      }

      card.remove();

      if (!objectsList.querySelector(".object-card")) {
        objectsList.innerHTML = `<div class="text-body-secondary">Список пуст</div>`;
      }
    })
    .catch((error) => {
      if (deleteButton) {
        deleteButton.disabled = false;
      }
      alert(`Не удалось удалить объект: ${error}`);
    });
}

objectsNav.addEventListener("click", function (event) {
  const link = event.target.closest("a[data-obj-type]");
  if (!link) {
    return;
  }

  event.preventDefault();

  objectsNav.querySelectorAll(".nav-link").forEach((navLink) => {
    navLink.classList.remove("active");
  });
  link.classList.add("active");
  currentObjType = link.dataset.objType;
  currentObjectId = null;
  objectsList.innerHTML = `<div class="text-body-secondary">Загрузка...</div>`;
  objectSettingsModalTitle.textContent = "Настройки объекта";
  objectSettingsModalBody.innerHTML = "";

  fetch(link.href)
    .then((response) => response.json())
    .then(renderObjects)
    .catch((error) => {
      objectsList.innerHTML = `<div class="alert alert-danger">Ошибка загрузки: ${error}</div>`;
    });
});

objectsList.addEventListener("click", function (event) {
  const deleteButton = event.target.closest(".object-delete-button");
  if (deleteButton) {
    event.stopPropagation();
    deleteObject(deleteButton.closest(".object-card"));
    return;
  }

  const card = event.target.closest(".object-card");
  if (!card) {
    return;
  }

  loadObjectSettings(card.dataset.objectId);
});

objectsList.addEventListener("keydown", function (event) {
  if (event.target.closest(".object-delete-button")) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".object-card");
  if (!card) {
    return;
  }

  event.preventDefault();
  loadObjectSettings(card.dataset.objectId);
});

saveObjectSettingsButton.addEventListener("click", function () {
  saveObjectSettings();
});

saveCloseObjectSettingsButton.addEventListener("click", function () {
  saveObjectSettings({ closeAfterSave: true });
});
