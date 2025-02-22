// ==UserScript==
// @name         Gemini AI Inline Translator (Popup)
// @namespace    Violentmonkey Scripts
// @version      3.1
// @description  Dịch văn bản bôi đen bằng Google Gemini API. Hỗ trợ popup phân tích từ vựng, popup dịch và dịch nhanh
// @author       King1x32, Voodanh
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    API: {
      providers: {
        gemini: {
          url: (apiKey) =>
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`,
          headers: { "Content-Type": "application/json" },
          body: (prompt) => ({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: { temperature: 0.7 },
          }),
          responseParser: (response) => {
            return response?.candidates?.[0]?.content?.parts?.[0]?.text;
          },
        },
        openai: {
          url: () => "https://api.groq.com/openai/v1/chat/completions",
          headers: (apiKey) => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          }),
          body: (prompt) => ({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
          responseParser: (response) => response.choices?.[0]?.message?.content,
        },
      },
      currentProvider: "gemini",
      apiKey: "tu_lay_them_vao",
      maxRetries: 3,
      retryDelay: 1000,
    },
    CACHE: {
      maxSize: 100,
      expirationTime: 300000,
    },
    RATE_LIMIT: {
      maxRequests: 5,
      perMilliseconds: 10000,
    },
    THEME: {
      mode: "dark",
      light: {
        background: "#fff",
        text: "#333",
        border: "#ccc",
        title: "#333",
        content: "#555",
        button: {
          close: { background: "#ff4444", text: "#fff" },
          translate: { background: "#007BFF", text: "#fff" },
        },
      },
      dark: {
        background: "#222",
        text: "#fff",
        border: "#444",
        title: "#fff",
        content: "#ccc",
        button: {
          close: { background: "#aa2222", text: "#fff" },
          translate: { background: "#004a99", text: "#fff" },
        },
      },
    },
    STYLES: {
      translation: {
        marginTop: "10px",
        padding: "10px",
        backgroundColor: "#f0f0f0",
        borderLeft: "3px solid #4CAF50",
        color: "#333",
        position: "relative",
        fontFamily: "SF Pro Rounded, sans-serif",
        fontSize: "16px",
      },
      popup: {
        position: "fixed",
        border: "1px solid",
        padding: "20px",
        zIndex: "2147483647",
        maxWidth: "90vw",
        minWidth: "320px",
        maxHeight: "80vh",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        borderRadius: "15px",
        fontFamily: "SF Pro Rounded, Arial, sans-serif",
        fontSize: "16px",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      },
      button: {
        position: "fixed",
        border: "none",
        borderRadius: "3px",
        padding: "5px 10px",
        cursor: "pointer",
        zIndex: "2147483647",
        fontSize: "14px",
      },
    },
  };

  class UserSettings {
    constructor() {
      this.defaultSettings = {
        theme: "dark",
        apiProvider: "gemini",
        apiKey: {
          gemini: "tu_lay_them_vao",
          openai: "tu_lay_them_vao",
        },
        shortcuts: {
          quickTranslate: { key: "t", altKey: true },
          popupTranslate: { key: "q", altKey: true },
          advancedTranslate: { key: "a", altKey: true },
        },
        clickOptions: {
          singleClick: { translateType: "popup" },
          doubleClick: { translateType: "quick" },
          hold: { translateType: "advanced" },
        },
        touchOptions: {
          enabled: true,
          sensitivity: 100,
          twoFingers: { translateType: "popup" },
          threeFingers: { translateType: "advanced" },
          fourFingers: { translateType: "quick" },
        },
        displayOptions: {
          showOriginalText: true,
          fontSize: "16px",
          minPopupWidth: "320px",
          maxPopupWidth: "90vw",
        },
        cacheOptions: {
          enabled: true,
          maxSize: CONFIG.CACHE.maxSize,
          expirationTime: CONFIG.CACHE.expirationTime,
        },
        rateLimit: {
          maxRequests: CONFIG.RATE_LIMIT.maxRequests,
          perMilliseconds: CONFIG.RATE_LIMIT.perMilliseconds,
        },
      };
      this.settings = this.loadSettings();
    }

    loadSettings() {
      const savedSettings = GM_getValue("translatorSettings");
      return savedSettings
        ? this.mergeWithDefaults(JSON.parse(savedSettings))
        : this.defaultSettings;
    }

    mergeWithDefaults(savedSettings) {
      return {
        ...this.defaultSettings,
        ...savedSettings,
        apiKey: {
          ...this.defaultSettings.apiKey,
          ...(savedSettings?.apiKey || {}),
        },
        shortcuts: {
          ...this.defaultSettings.shortcuts,
          ...(savedSettings?.shortcuts || {}),
        },
        clickOptions: {
          ...this.defaultSettings.clickOptions,
          ...(savedSettings?.clickOptions || {}),
        },
        displayOptions: {
          ...this.defaultSettings.displayOptions,
          ...(savedSettings?.displayOptions || {}),
        },
        cacheOptions: {
          ...this.defaultSettings.cacheOptions,
          ...(savedSettings?.cacheOptions || {}),
        },
        rateLimit: {
          ...this.defaultSettings.rateLimit,
          ...(savedSettings?.rateLimit || {}),
        },
      };
    }

    createSettingsUI() {
      const container = document.createElement("div");
      const isDark = this.settings.theme === "dark";

      container.style.cssText = `
        all: initial;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${isDark ? "#222" : "#f5f5f5"};
        color: ${isDark ? "#fff" : "#333"};
        padding: 20px;
        border-radius: 10px;
        z-index: 2147483647;
        width: auto;
        max-width: 90vw;
        min-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        box-sizing: border-box !important;
    `;

      const resetStyle = `
        * {
            all: revert;
            box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
            margin: 0;
            padding: 0;
        }
        .settings-grid {
            display: grid !important;
            grid-template-columns: 160px auto !important;
            align-items: center !important;
            gap: 10px !important;
            margin-bottom: 8px !important;
        }

        .settings-label {
            min-width: 100px !important;
            text-align: left !important;
            padding-right: 10px !important;
        }

        .settings-input {
            min-width: 100px !important;
            margin-left: 5px !important;
        }
        h2 {
            flex: 1 !important;
            display: flex !important;
            font-family: Arial, sans-serif !important;
            align-items: center !important;
            justify-content: center !important;
            margin-bottom: 15px;
            font-weight: bold;
            color: ${isDark ? "#678" : "#333"};
            grid-column: 1 / -1 !important;
        }
        h3 {
            font-family: Arial, sans-serif !important;
            margin-bottom: 15px;
            font-weight: bold;
            color: ${isDark ? "#678" : "#333"};
            grid-column: 1 / -1 !important;
        }
        input[type="text"],
        input[type="number"],
        select {
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            padding: 5px !important;
            margin: 5px 5px 5px 5px;
            border-radius: 4px !important;
            border: 1px solid ${isDark ? "#666" : "#ccc"} !important;
            background: ${isDark ? "#444" : "#fff"} !important;
            color: ${isDark ? "#fff" : "#000"} !important;
            width: auto;
            min-width: 100px;
            max-width: auto;
            height: auto !important;
        }
        input[type="radio"],
        input[type="checkbox"] {
            align-items: center !important;
            justify-content: center !important;
        }
        #apiKey.settings-input,
        #apiKey,
        input#apiKey[type="text"] {
            width: calc(100% - 13px) !important;
            min-width: calc(100% - 13px) !important;
            max-width: calc(100% - 13px) !important;
            margin-left: 5px !important;
            box-sizing: border-box !important;
        }
        button {
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            background: ${isDark ? "#444" : "#ddd"};
            color: ${isDark ? "#fff" : "#000"} !important;
            padding: 5px 15px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            border: none !important;
            margin: 5px !important;
        }
        #cancelSettings {
            background: ${isDark ? "#666" : "#ddd"} !important;
            color: ${isDark ? "#fff" : "#000"} !important;
            padding: 5px 15px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            border: none !important;
            margin: 5px !important;
        }
        #cancelSettings:hover {
            background: ${isDark ? "#888" : "#bbb"} !important;
        }
        #saveSettings {
            background: #007BFF !important;
            padding: 5px 15px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            border: none !important;
            margin: 5px !important;
        }
        #saveSettings:hover {
            background: #009FFF !important;
        }
        .radio-group {
            display: flex !important;
            gap: 15px !important;
        }
        .radio-group label {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 5px !important;
        }
        .radio-group input[type="radio"] {
            margin-right: 5px !important;
        }
    `;

      const styleElement = document.createElement("style");
      styleElement.textContent = resetStyle;
      container.appendChild(styleElement);

      container.innerHTML += `
          <h2>Cài đặt Translator AI</h2>

          <div style="margin-bottom: 15px;">
              <h3>Giao diện</h3>
              <div class="radio-group">
                  <label>
                      <input type="radio" name="theme" value="light" ${!isDark ? "checked" : ""}>
                      <span>Sáng</span>
                  </label>
                  <label>
                      <input type="radio" name="theme" value="dark" ${isDark ? "checked" : ""}>
                      <span>Tối</span>
                  </label>
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>HIỂN THỊ</h3>
              <div class="settings-grid">
                  <span class="settings-label">Hiện văn bản gốc:</span>
                  <input type="checkbox" id="showOriginalText" ${this.settings.displayOptions?.showOriginalText ? "checked" : ""}>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Cỡ chữ:</span>
                  <select id="fontSize" class="settings-input">
                      <option value="12px" ${this.settings.displayOptions?.fontSize === "12px" ? "selected" : ""}>Nhỏ (12px)</option>
                      <option value="14px" ${this.settings.displayOptions?.fontSize === "14px" ? "selected" : ""}>Vừa (14px)</option>
                      <option value="16px" ${this.settings.displayOptions?.fontSize === "16px" ? "selected" : ""}>Hơi lớn (16px)</option>
                      <option value="18px" ${this.settings.displayOptions?.fontSize === "18px" ? "selected" : ""}>Lớn (18px)</option>
                      <option value="20px" ${this.settings.displayOptions?.fontSize === "20px" ? "selected" : ""}>Cực lớn (20px)</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Độ rộng tối thiểu:</span>
                  <select id="minPopupWidth" class="settings-input">
                      <option value="200px" ${this.settings.displayOptions?.minPopupWidth === "200px" ? "selected" : ""}>Rất nhỏ (200px)</option>
                      <option value="300px" ${this.settings.displayOptions?.minPopupWidth === "300px" ? "selected" : ""}>Nhỏ (300px)</option>
                      <option value="400px" ${this.settings.displayOptions?.minPopupWidth === "400px" ? "selected" : ""}>Vừa (400px)</option>
                      <option value="500px" ${this.settings.displayOptions?.minPopupWidth === "500px" ? "selected" : ""}>Hơi lớn (500px)</option>
                      <option value="600px" ${this.settings.displayOptions?.minPopupWidth === "600px" ? "selected" : ""}>Lớn (600px)</option>
                      <option value="700px" ${this.settings.displayOptions?.minPopupWidth === "700px" ? "selected" : ""}>Cực lớn (700px)</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Độ rộng tối đa:</span>
                  <select id="maxPopupWidth" class="settings-input">
                      <option value="60vw" ${this.settings.displayOptions?.maxPopupWidth === "60vw" ? "selected" : ""}>60% màn hình</option>
                      <option value="70vw" ${this.settings.displayOptions?.maxPopupWidth === "70vw" ? "selected" : ""}>70% màn hình</option>
                      <option value="80vw" ${this.settings.displayOptions?.maxPopupWidth === "80vw" ? "selected" : ""}>80% màn hình</option>
                      <option value="90vw" ${this.settings.displayOptions?.maxPopupWidth === "90vw" ? "selected" : ""}>90% màn hình</option>
                  </select>
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>API Provider</h3>
              <div class="radio-group">
                  <label>
                      <input type="radio" name="apiProvider" value="gemini" ${this.settings.apiProvider === "gemini" ? "checked" : ""}>
                      <span>Gemini</span>
                  </label>
                  <label>
                      <input type="radio" name="apiProvider" value="openai" ${this.settings.apiProvider === "openai" ? "checked" : ""}>
                      <span>OpenAI</span>
                  </label>
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>API Key</h3>
              <input type="text" id="apiKey" value="${this.settings.apiKey[this.settings.apiProvider]}">
          </div>

          <div style="margin-bottom: 15px;">
              <h3>PHÍM TẮT</h3>
              <div class="settings-grid">
                  <span class="settings-label">Dịch nhanh:</span>
                  <input type="text" id="quickKey" class="settings-input" value="${this.settings.shortcuts.quickTranslate.key}">
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Dịch popup:</span>
                  <input type="text" id="popupKey" class="settings-input" value="${this.settings.shortcuts.popupTranslate.key}">
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Dịch nâng cao:</span>
                  <input type="text" id="advancedKey" class="settings-input" value="${this.settings.shortcuts.advancedTranslate.key}">
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>NÚT DỊCH</h3>
              <div class="settings-grid">
                  <span class="settings-label">Nhấp đơn:</span>
                  <select id="singleClickSelect" class="settings-input">
                      <option value="quick" ${this.settings.clickOptions.singleClick.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.clickOptions.singleClick.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.clickOptions.singleClick.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Nhấp đúp:</span>
                  <select id="doubleClickSelect" class="settings-input">
                      <option value="quick" ${this.settings.clickOptions.doubleClick.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.clickOptions.doubleClick.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.clickOptions.doubleClick.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Giữ nút:</span>
                  <select id="holdSelect" class="settings-input">
                      <option value="quick" ${this.settings.clickOptions.hold.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.clickOptions.hold.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.clickOptions.hold.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>CẢM ỨNG ĐA ĐIỂM</h3>
              <div class="settings-grid">
                  <span class="settings-label">Bật cảm ứng:</span>
                  <input type="checkbox" id="touchEnabled" ${this.settings.touchOptions?.enabled ? "checked" : ""}>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Hai ngón tay:</span>
                  <select id="twoFingersSelect" class="settings-input">
                      <option value="quick" ${this.settings.touchOptions?.twoFingers?.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.touchOptions?.twoFingers?.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.touchOptions?.twoFingers?.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Ba ngón tay:</span>
                  <select id="threeFingersSelect" class="settings-input">
                      <option value="quick" ${this.settings.touchOptions?.threeFingers?.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.touchOptions?.threeFingers?.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.touchOptions?.threeFingers?.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Bốn ngón tay:</span>
                  <select id="fourFingersSelect" class="settings-input">
                      <option value="quick" ${this.settings.touchOptions?.fourFingers?.translateType === "quick" ? "selected" : ""}>Dịch nhanh</option>
                      <option value="popup" ${this.settings.touchOptions?.fourFingers?.translateType === "popup" ? "selected" : ""}>Dịch popup</option>
                      <option value="advanced" ${this.settings.touchOptions?.fourFingers?.translateType === "advanced" ? "selected" : ""}>Dịch nâng cao</option>
                  </select>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Độ nhạy (ms):</span>
                  <input type="number" id="touchSensitivity" class="settings-input"
                      value="${this.settings.touchOptions?.sensitivity || 100}"
                      min="50" max="500" step="50">
                </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>RATE LIMIT</h3>
              <div class="settings-grid">
                  <span class="settings-label">Số yêu cầu tối đa:</span>
                  <input type="number" id="maxRequests" class="settings-input" value="${this.settings.rateLimit?.maxRequests || CONFIG.RATE_LIMIT.maxRequests}" min="1" max="10">
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Thời gian chờ (ms):</span>
                  <input type="number" id="perMilliseconds" class="settings-input" value="${this.settings.rateLimit?.perMilliseconds || CONFIG.RATE_LIMIT.perMilliseconds}" min="1000" step="1000">
              </div>
          </div>

          <div style="margin-bottom: 15px;">
              <h3>CACHE</h3>
              <div class="settings-grid">
                  <span class="settings-label">Bật cache:</span>
                  <input type="checkbox" id="cacheEnabled" ${this.settings.cacheOptions?.enabled ? "checked" : ""}>
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Kích thước tối đa:</span>
                  <input type="number" id="cacheMaxSize" class="settings-input" value="${this.settings.cacheOptions?.maxSize || CONFIG.CACHE.maxSize}" min="10" max="1000">
              </div>
              <div class="settings-grid">
                  <span class="settings-label">Thời gian hết hạn (ms):</span>
                  <input type="number" id="cacheExpiration" class="settings-input" value="${this.settings.cacheOptions?.expirationTime || CONFIG.CACHE.expirationTime}" min="60000" step="60000">
              </div>
          </div>
          <div style="text-align:right;">
              <button id="cancelSettings">
                  Hủy
              </button>
              <button id="saveSettings"
                  style="">
                  Lưu
              </button>
          </div>
        `;

      container.className = "translator-settings-container";
      const saveButton = container.querySelector("#saveSettings");

      const cancelButton = container.querySelector("#cancelSettings");
      cancelButton.addEventListener("click", () => {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });

      saveButton.addEventListener("click", () => {
        const newSettings = {
          theme: container.querySelector('input[name="theme"]:checked').value,
          displayOptions: {
            showOriginalText:
              container.querySelector("#showOriginalText").checked,
            fontSize: container.querySelector("#fontSize").value,
            minPopupWidth: container.querySelector("#minPopupWidth").value,
            maxPopupWidth: container.querySelector("#maxPopupWidth").value,
          },
          apiProvider: container.querySelector(
            'input[name="apiProvider"]:checked',
          ).value,
          apiKey: {
            ...this.settings.apiKey,
            [container.querySelector('input[name="apiProvider"]:checked')
              .value]: container.querySelector("#apiKey").value,
          },
          shortcuts: {
            quickTranslate: {
              key: container.querySelector("#quickKey").value,
              altKey: true,
            },
            popupTranslate: {
              key: container.querySelector("#popupKey").value,
              altKey: true,
            },
            advancedTranslate: {
              key: container.querySelector("#advancedKey").value,
              altKey: true,
            },
          },
          clickOptions: {
            singleClick: {
              translateType:
                container.querySelector("#singleClickSelect").value,
            },
            doubleClick: {
              translateType:
                container.querySelector("#doubleClickSelect").value,
            },
            hold: {
              translateType: container.querySelector("#holdSelect").value,
            },
          },
          touchOptions: {
            enabled: container.querySelector("#touchEnabled").checked,
            twoFingers: {
              translateType: container.querySelector("#twoFingersSelect").value,
            },
            threeFingers: {
              translateType: container.querySelector("#threeFingersSelect")
                .value,
            },
            fourFingers: {
              translateType:
                container.querySelector("#fourFingersSelect").value,
            },
            sensitivity: parseInt(
              container.querySelector("#touchSensitivity").value,
            ),
          },
          rateLimit: {
            maxRequests: parseInt(
              container.querySelector("#maxRequests").value,
            ),
            perMilliseconds: parseInt(
              container.querySelector("#perMilliseconds").value,
            ),
          },
          cacheOptions: {
            enabled: container.querySelector("#cacheEnabled").checked,
            maxSize: parseInt(container.querySelector("#cacheMaxSize").value),
            expirationTime: parseInt(
              container.querySelector("#cacheExpiration").value,
            ),
          },
        };

        this.saveSettings(newSettings);
        container.remove();
        location.reload();
      });

      return container;
    }

    saveSettings(settings) {
      GM_setValue("translatorSettings", JSON.stringify(settings));
      this.settings = settings;
    }

    getSetting(path) {
      return this.settings[path];
    }

    updateSetting(path, value) {
      this.settings[path] = value;
      this.saveSettings(this.settings);
    }
  }

  class TranslationCache {
    constructor(maxSize, expirationTime) {
      this.maxSize = maxSize;
      this.expirationTime = expirationTime;
      this.cache = new Map();
      this.accessOrder = [];
    }

    generateKey(text, isAdvanced) {
      return `${text}_${isAdvanced}`;
    }

    set(text, translation, isAdvanced) {
      const key = this.generateKey(text, isAdvanced);

      if (this.cache.has(key)) {
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      } else {
        if (this.cache.size >= this.maxSize) {
          const oldestKey = this.accessOrder.shift();
          this.cache.delete(oldestKey);
        }
        this.accessOrder.push(key);
      }

      this.cache.set(key, {
        translation,
        timestamp: Date.now(),
      });
    }

    get(text, isAdvanced) {
      const key = this.generateKey(text, isAdvanced);
      const data = this.cache.get(key);

      if (!data) return null;

      if (Date.now() - data.timestamp > this.expirationTime) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        return null;
      }

      const index = this.accessOrder.indexOf(key);
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);

      return data.translation;
    }

    clear() {
      this.cache.clear();
      this.accessOrder = [];
    }
  }

  class APIManager {
    constructor(config) {
      this.config = config;
      this.requestCount = 0;
      this.lastRequestTime = 0;
      this.currentProvider = config.currentProvider;
    }

    async request(prompt) {
      const provider = this.config.providers[this.currentProvider];
      if (!provider) {
        throw new Error(`Provider ${this.currentProvider} not found`);
      }

      let attempts = 0;
      let lastError;

      while (attempts < this.config.maxRetries) {
        try {
          await this.checkRateLimit();

          const response = await this.makeRequest(provider, prompt);

          this.requestCount++;
          const parsedResponse = provider.responseParser(response);

          if (!parsedResponse) {
            throw new Error("Empty response from API");
          }

          return parsedResponse;
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          lastError = error;
          attempts++;

          if (attempts < this.config.maxRetries) {
            const delay = this.config.retryDelay * Math.pow(2, attempts);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw (
        lastError || new Error("Failed to get translation after all retries")
      );
    }

    async checkRateLimit() {
      const now = Date.now();
      if (now - this.lastRequestTime < CONFIG.RATE_LIMIT.perMilliseconds) {
        if (this.requestCount >= CONFIG.RATE_LIMIT.maxRequests) {
          const delay =
            CONFIG.RATE_LIMIT.perMilliseconds - (now - this.lastRequestTime);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.requestCount = 0;
        }
      } else {
        this.requestCount = 0;
        this.lastRequestTime = now;
      }
    }

    async makeRequest(provider, prompt) {
      return new Promise((resolve, reject) => {
        const apiKey = this.config.apiKey[this.currentProvider];
        const url = provider.url(apiKey);
        const headers =
          typeof provider.headers === "function"
            ? provider.headers(apiKey)
            : provider.headers;

        GM_xmlhttpRequest({
          method: "POST",
          url: url,
          headers: headers,
          data: JSON.stringify(provider.body(prompt)),
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              try {
                const parsedResponse = JSON.parse(response.responseText);
                resolve(parsedResponse);
              } catch (error) {
                console.error("Parse error:", error);
                reject(new Error("Failed to parse API response"));
              }
            } else if (response.status === 429) {
              reject(new Error("Rate limit exceeded"));
            } else {
              reject(new Error(`API Error: ${response.status}`));
            }
          },
          onerror: (error) => {
            console.error("API request failed:", error);
            reject(new Error(`Connection error: ${error}`));
          },
        });
      });
    }
  }

  class UIManager {
    constructor(translator) {
      if (!translator) {
        throw new Error("Translator instance is required");
      }
      this.translator = translator;
      this.currentTranslateButton = null;
      this.isTranslating = false;
      this.translatingStatus = null;
      this.ignoreNextSelectionChange = false;
      this.touchCount = 0;

      this.handleTranslateButtonClick =
        this.handleTranslateButtonClick.bind(this);
      this.setupClickHandlers = this.setupClickHandlers.bind(this);
      this.handleTextSelection = this.handleTextSelection.bind(this);
      this.showTranslatingStatus = this.showTranslatingStatus.bind(this);
      this.removeTranslatingStatus = this.removeTranslatingStatus.bind(this);
      this.resetState = this.resetState.bind(this);
    }

    createTranslationDiv(translatedText, originalText) {
      const div = document.createElement("div");
      div.classList.add("translation-div");

      const displayOptions =
        this.translator.userSettings.settings.displayOptions;

      Object.assign(div.style, {
        ...CONFIG.STYLES.translation,
        fontSize: displayOptions.fontSize,
      });

      if (displayOptions.showOriginalText && originalText) {
        div.innerHTML = `
        <div style="margin-bottom: 8px; color: #666;">Gốc: ${originalText}</div>
        <div>Dịch: ${translatedText}</div>
      `;
      } else {
        div.textContent = `Dịch: ${translatedText}`;
      }

      return div;
    }

    createCloseButton() {
      const button = document.createElement("span");
      button.textContent = "x";
      Object.assign(button.style, {
        position: "absolute",
        top: "5px",
        right: "5px",
        cursor: "pointer",
        color: "#999",
        fontSize: "14px",
        fontWeight: "bold",
      });
      button.onclick = () => button.parentElement.remove();
      return button;
    }

    showTranslationBelow(targetElement, translatedText) {
      const selection = window.getSelection();
      const lastSelectedNode = selection.focusNode;
      let lastSelectedParagraph = lastSelectedNode.parentElement;

      while (lastSelectedParagraph && lastSelectedParagraph.tagName !== "P") {
        lastSelectedParagraph = lastSelectedParagraph.parentElement;
      }

      if (!lastSelectedParagraph) {
        lastSelectedParagraph = targetElement;
      }

      if (
        lastSelectedParagraph.nextElementSibling?.classList.contains(
          "translation-div",
        )
      ) {
        return;
      }

      const translationDiv = this.createTranslationDiv(translatedText);
      translationDiv.appendChild(this.createCloseButton());
      lastSelectedParagraph.parentNode.insertBefore(
        translationDiv,
        lastSelectedParagraph.nextSibling,
      );
    }

    displayPopup(translatedText, originalText) {
      this.removeTranslateButton();

      const theme = CONFIG.THEME[CONFIG.THEME.mode];
      const displayOptions =
        this.translator.userSettings.settings.displayOptions;
      const popup = document.createElement("div");
      popup.classList.add("draggable");

      const popupStyle = {
        ...CONFIG.STYLES.popup,
        backgroundColor: theme.background,
        borderColor: theme.border,
        color: theme.text,
        minWidth: displayOptions.minPopupWidth,
        maxWidth: displayOptions.maxPopupWidth,
        fontSize: displayOptions.fontSize,
      };
      Object.assign(popup.style, popupStyle);

      const cleanedText = translatedText.replace(/(\*\*)(.*?)\1/g, "<b>$2</b>");

      let content = "";
      if (displayOptions.showOriginalText) {
        content += `
        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid ${theme.border}; color: ${theme.content};">
          <h4 style="margin-bottom: 5px; color: ${theme.title};">Văn bản gốc:</h4>
          <div>${originalText}</div>
        </div>
      `;
      }
      content += `
      <div>
        <h3 style="color: ${theme.title};">Bản dịch</h3>
        <div style="overflow-y: auto; max-height: 400px; color: ${theme.content};">
          ${this.formatTranslation(cleanedText)}
        </div>
      </div>
    `;

      popup.innerHTML = content;

      const closeButton = document.createElement("button");
      closeButton.innerText = "Đóng";
      Object.assign(closeButton.style, {
        marginTop: "10px",
        padding: "8px 16px",
        backgroundColor: theme.button.close.background,
        color: theme.button.close.text,
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      });
      closeButton.onclick = () => popup.remove();
      popup.appendChild(closeButton);

      this.makeDraggable(popup);
      document.body.appendChild(popup);
    }

    formatTranslation(text) {
      return text
        .split("<br>")
        .map((line) => {
          if (line.startsWith("<b>KEYWORD</b>:")) {
            return `<h4 style="margin-bottom: 5px;">${line}</h4>`;
          }
          return `<p style="margin-left: 20px; margin-bottom: 10px; white-space: pre-wrap; word-wrap: break-word; text-align: justify;">${line}</p>`;
        })
        .join("");
    }

    makeDraggable(element) {
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
      element.onmousedown = (e) => {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = () => {
          document.onmouseup = null;
          document.onmousemove = null;
        };

        document.onmousemove = (e) => {
          e.preventDefault();
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          element.style.top = `${element.offsetTop - pos2}px`;
          element.style.left = `${element.offsetLeft - pos1}px`;
        };
      };
    }

    handleTextSelection = debounce(() => {
      if (this.isTranslating) return;
      if (this.ignoreNextSelectionChange || this.isTranslating) {
        this.ignoreNextSelectionChange = false;
        return;
      }

      const selection = window.getSelection();
      if (!selection) return;

      const selectedText = selection.toString().trim();
      if (!selectedText || !selection.rangeCount) {
        this.removeTranslateButton();
        return;
      }

      if (!this.currentTranslateButton) {
        this.createTranslateButton(selection);
      }
    }, 100);

    createTranslateButton(selection) {
      if (!selection || selection.rangeCount === 0) return;
      if (this.currentTranslateButton) {
        this.currentTranslateButton.remove();
      }

      const theme = CONFIG.THEME[CONFIG.THEME.mode];
      const button = document.createElement("button");
      button.textContent = "Dịch";
      Object.assign(button.style, {
        ...CONFIG.STYLES.button,
        backgroundColor: theme.button.translate.background,
        color: theme.button.translate.text,
      });

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      button.style.top = `${rect.bottom + window.scrollY + 20}px`;
      button.style.left = `${rect.left + window.scrollX}px`;

      document.body.appendChild(button);
      this.currentTranslateButton = button;
      this.setupClickHandlers(selection);
    }

    handleTranslateButtonClick = async (selection, translateType) => {
      try {
        const selectedText = selection.toString().trim();

        if (!selectedText) {
          return;
        }

        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) {
          return;
        }

        this.removeTranslateButton();

        this.showTranslatingStatus();

        if (!this.translator) {
          throw new Error("Translator instance not found");
        }

        switch (translateType) {
          case "quick":
            await this.translator.translate(selectedText, targetElement);
            break;
          case "popup":
            await this.translator.translate(
              selectedText,
              targetElement,
              false,
              true,
            );
            break;
          case "advanced":
            await this.translator.translate(selectedText, targetElement, true);
            break;
          default:
        }
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        if (this.isDouble) {
          const newSelection = window.getSelection();
          if (newSelection.toString().trim()) {
            this.resetState();
            this.handleTextSelection(newSelection);
          }
        } else {
          this.resetState();
          return;
        }
      }
    };

    showTranslatingStatus() {
      if (!document.getElementById("translator-animation-style")) {
        const style = document.createElement("style");
        style.id = "translator-animation-style";
        style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .center-translate-status {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 15px 25px;
          border-radius: 8px;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
      `;
        document.head.appendChild(style);
      }

      this.removeTranslatingStatus();

      const status = document.createElement("div");
      status.className = "center-translate-status";
      status.innerHTML = `
      <div class="spinner"></div>
      <span>Đang dịch...</span>
    `;
      document.body.appendChild(status);
      this.translatingStatus = status;
    }

    setupClickHandlers(selection) {
      this.pressTimer = null;
      this.isLongPress = false;
      this.isDown = false;
      this.isDouble = false;
      this.lastTime = 0;
      this.count = 0;
      this.timer = 0;

      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Thêm để ngăn bubble event
        this.ignoreNextSelectionChange = true;
        this.isDown = true;
        this.isLongPress = false;
        const currentTime = Date.now();

        if (currentTime - this.lastTime < 400) {
          this.count++;
          clearTimeout(this.pressTimer);
          clearTimeout(this.timer);
        } else {
          this.count = 1;
        }
        this.lastTime = currentTime;

        this.pressTimer = setTimeout(() => {
          if (!this.isDown) return;
          this.isLongPress = true;
          this.count = 0;
          const holdType =
            this.translator.userSettings.settings.clickOptions.hold
              .translateType;
          this.handleTranslateButtonClick(selection, holdType);
        }, 500);
      };

      const handleEnd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isDown) return;

        clearTimeout(this.pressTimer);
        if (this.isLongPress) return;
        if (this.count === 1) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            if (this.count !== 1) return;
            const singleClickType =
              this.translator.userSettings.settings.clickOptions.singleClick
                .translateType;
            this.handleTranslateButtonClick(selection, singleClickType);
          }, 400);
        } else if (this.count >= 2) {
          this.isDouble = true;
          const doubleClickType =
            this.translator.userSettings.settings.clickOptions.doubleClick
              .translateType;
          this.handleTranslateButtonClick(selection, doubleClickType);
        }
        this.isDown = false;
      };

      // PC Events
      this.currentTranslateButton.addEventListener("mousedown", handleStart);
      this.currentTranslateButton.addEventListener("mouseup", handleEnd);
      this.currentTranslateButton.addEventListener("mouseleave", () => {
        if (this.translateType) {
          this.resetState();
        }
      });

      // Mobile Events
      this.currentTranslateButton.addEventListener("touchstart", handleStart);
      this.currentTranslateButton.addEventListener("touchend", handleEnd);
      this.currentTranslateButton.addEventListener("touchcancel", () => {
        if (this.translateType) {
          this.resetState();
        }
      });
    }

    setupDocumentTapHandler() {
      let touchCount = 0;
      let touchTimer = null;

      const handleTouchStart = async (e) => {
        if (this.isTranslating) return;

        const touchOptions = this.translator.userSettings.settings.touchOptions;
        if (!touchOptions?.enabled) return;

        const target = e.target;
        if (
          target.closest(".translation-div") ||
          target.closest(".draggable")
        ) {
          return;
        }

        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (!selectedText) return;

        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) return;

        if (touchTimer) {
          clearTimeout(touchTimer);
        }

        touchCount = e.touches.length;

        touchTimer = setTimeout(async () => {
          let translateType;

          switch (touchCount) {
            case 2:
              translateType = touchOptions.twoFingers?.translateType;
              break;
            case 3:
              translateType = touchOptions.threeFingers?.translateType;
              break;
            case 4:
              translateType = touchOptions.fourFingers?.translateType;
              break;
            default:
              return;
          }

          if (!translateType) return;

          try {
            e.preventDefault();
            await this.handleTranslateButtonClick(selection, translateType);
          } catch (error) {
            console.error("Touch translation error:", error);
          } finally {
            touchCount = 0;
            touchTimer = null;
          }
        }, touchOptions.sensitivity || 100); // Sử dụng độ nhạy từ settings
      };

      const handleTouch = () => {
        if (touchTimer && translateType) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
        touchCount = 0;
      };

      document.addEventListener("touchstart", handleTouchStart.bind(this), {
        passive: false,
      });
      document.addEventListener("touchup", handleTouch.bind(this));
      document.addEventListener("touchcancel", handleTouch.bind(this));
    }

    resetState() {
      if (this.pressTimer) clearTimeout(this.pressTimer);
      if (this.timer) clearTimeout(this.timer);
      this.isLongPress = false;
      this.lastTime = 0;
      this.count = 0;
      this.isDown = false;
      this.isTranslating = false;
      this.ignoreNextSelectionChange = false;
      this.removeTranslateButton();
      this.removeTranslatingStatus();
    }

    removeTranslateButton() {
      if (this.currentTranslateButton) {
        this.currentTranslateButton.remove();
        this.currentTranslateButton = null;
      }
    }

    removeTranslatingStatus() {
      if (this.translatingStatus) {
        this.translatingStatus.remove();
        this.translatingStatus = null;
      }
    }
  }

  class Translator {
    constructor() {
      window.translator = this;
      this.userSettings = new UserSettings();
      this.cache = new TranslationCache(
        this.userSettings.getSetting("cacheOptions.maxSize"),
        this.userSettings.getSetting("cacheOptions.expirationTime"),
      );

      const apiConfig = {
        ...CONFIG.API,
        currentProvider: this.userSettings.getSetting("apiProvider"),
        apiKey: this.userSettings.getSetting("apiKey"),
      };

      this.api = new APIManager(apiConfig);
      this.ui = new UIManager(this);
      this.setupEventListeners();
      this.ui.setupDocumentTapHandler();
    }

    async translate(
      text,
      targetElement,
      isAdvanced = false,
      displaySimple = false,
    ) {
      if (!text) {
        return;
      }

      try {
        const prompt = this.createPrompt(text, isAdvanced);

        let translatedText = this.cache.get(text, isAdvanced);

        if (!translatedText) {
          translatedText = await this.api.request(prompt);

          if (translatedText) {
            this.cache.set(text, translatedText, isAdvanced);
          }
        }

        if (translatedText) {
          if (isAdvanced || displaySimple) {
            this.ui.displayPopup(translatedText, text);
          } else {
            this.ui.showTranslationBelow(targetElement, translatedText);
          }
        } else {
          throw new Error("No translation received");
        }
      } catch (error) {
        console.error("Translation error:", error);
        this.handleError(error, targetElement);
      }
    }
    createPrompt(text, isAdvanced) {
      return isAdvanced
        ? `Dịch và phân tích từ khóa: "${text}"`
        : `Cho bạn đoạn văn bản: "${text}".
                   Hãy dịch đoạn văn bản đó thành Tiếng Việt (Vietnamese) với các điều kiện sau:
                   - Tuân thủ chặt chẽ bối cảnh và sắc thái ban đầu.
                   - Sự lưu loát tự nhiên như người bản xứ.
                   - Không có thêm giải thích/diễn giải.
                   - Bảo toàn thuật ngữ 1:1 cho các thuật ngữ/danh từ riêng.
                   Chỉ in ra bản dịch mà không có dấu ngoặc kép.`;
    }

    handleError(error, targetElement) {
      console.error("Translation failed:", error);
      const message = error.message.includes("Rate limit")
        ? "Vui lòng chờ giữa các lần dịch"
        : error.message.includes("Gemini API")
          ? "Lỗi Gemini: " + error.message
          : error.message.includes("API Key")
            ? "Lỗi xác thực API"
            : "Lỗi dịch thuật: " + error.message;
      this.ui.showTranslationBelow(targetElement, message);
    }

    setupEventListeners() {
      const handleSettings = (e) => {
        if (e.altKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          const settingsUI = this.userSettings.createSettingsUI();
          document.body.appendChild(settingsUI);
        }
      };

      const handleShortcuts = async (e) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (!selectedText || this.ui.isTranslating) return;

        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) return;
        const shortcuts = this.userSettings.settings.shortcuts;

        if (e.altKey) {
          let translateType = null;

          if (e.key === shortcuts.quickTranslate.key) {
            e.preventDefault();
            translateType = "quick";
          } else if (e.key === shortcuts.popupTranslate.key) {
            e.preventDefault();
            translateType = "popup";
          } else if (e.key === shortcuts.advancedTranslate.key) {
            e.preventDefault();
            translateType = "advanced";
          }

          if (translateType) {
            try {
              this.ui.isTranslating = true;
              this.ui.showTranslatingStatus();

              switch (translateType) {
                case "quick":
                  await this.translate(selectedText, targetElement);
                  break;
                case "popup":
                  await this.translate(
                    selectedText,
                    targetElement,
                    false,
                    true,
                  );
                  break;
                case "advanced":
                  await this.translate(selectedText, targetElement, true);
                  break;
              }
            } catch (error) {
              console.error("Translation error:", error);
            } finally {
              this.ui.resetState();
            }
          }
        }
      };

      document.addEventListener("keydown", handleSettings.bind(this));
      document.addEventListener("keydown", handleShortcuts.bind(this));
      document.addEventListener("mouseup", this.ui.handleTextSelection);
      document.addEventListener("selectionchange", this.ui.handleTextSelection);
    }

    showSettingsUI() {
      const settingsUI = this.userSettings.createSettingsUI();
      document.body.appendChild(settingsUI);
      settingsUI.querySelector("button:last-child").onclick = () => {
        this.saveSettings(settingsUI);
        settingsUI.remove();
        location.reload();
      };
    }

    saveSettings(settingsUI) {
      this.userSettings.updateSetting(
        "theme",
        settingsUI.querySelector('input[name="theme"]:checked').value,
      );
      this.userSettings.updateSetting(
        "apiProvider",
        settingsUI.querySelector('input[name="apiProvider"]:checked').value,
      );
      this.userSettings.updateSetting("apiKey", {
        ...this.userSettings.getSetting("apiKey"),
        [this.userSettings.getSetting("apiProvider")]:
          settingsUI.querySelector("#apiKey").value,
      });
      this.userSettings.updateSetting("shortcuts", {
        quickTranslate: {
          key: settingsUI.querySelector("#quickKey").value,
          altKey: true,
        },
        popupTranslate: {
          key: settingsUI.querySelector("#popupKey").value,
          altKey: true,
        },
        advancedTranslate: {
          key: settingsUI.querySelector("#advancedKey").value,
          altKey: true,
        },
      });
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Register Violentmonkey menu
  GM_registerMenuCommand("Cài đặt Translator AI", () => {
    const translator = window.translator;
    if (translator) {
      const settingsUI = translator.userSettings.createSettingsUI();
      document.body.appendChild(settingsUI);
    }
  });

  // Initialize
  const translator = new Translator();
})();
