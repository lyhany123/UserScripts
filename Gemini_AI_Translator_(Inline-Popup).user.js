// ==UserScript==
// @name         Gemini AI Translator (Inline & Popup)
// @namespace    Violentmonkey Scripts
// @version      3.2
// @description  Dịch văn bản (bôi đen văn bản), hình ảnh, audio, video bằng Google Gemini API. Hỗ trợ popup phân tích từ vựng, popup dịch và dịch nhanh.
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
  "use strict";

  const CONFIG = {
    API: {
      providers: {
        gemini: {
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
          models: {
            fast: [
              "gemini-2.0-flash-lite",
              "gemini-2.0-flash",
              "gemini-2.0-flash-exp",
            ],
            pro: ["gemini-2.0-pro-exp-02-05", "gemini-2.0-pro-exp"],
            vision: [
              "gemini-2.0-flash-thinking-exp-01-21",
              "gemini-2.0-flash-thinking-exp",
            ],
          },
          headers: { "Content-Type": "application/json" },
          body: (prompt) => ({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: { temperature: 0.7 },
          }),
          responseParser: (response) => {
            console.log("Parsing response:", response);
            if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
              return response.candidates[0].content.parts[0].text;
            }
            if (response?.text) {
              return response.text;
            }
            throw new Error("Không thể đọc kết quả từ API");
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
      apiKey: "tu_tao_them_vao",
      maxRetries: 3,
      retryDelay: 1000,
    },
    OCR: {
      generation: {
        temperature: 0.2,
        topP: 0.9,
        topK: 50,
      },
      maxFileSize: 15 * 1024 * 1024, // 15MB
      supportedFormats: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ],
    },
    MEDIA: {
      generation: {
        temperature: 0.2,
        topP: 0.9,
        topK: 50,
      },
      audio: {
        maxSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: [
          "audio/wav",
          "audio/mp3",
          "audio/ogg",
          "audio/m4a",
          "audio/aac",
          "audio/flac",
          "audio/wma",
          "audio/opus",
          "audio/amr",
          "audio/midi",
          "audio/mpa",
        ],
      },
      video: {
        maxSize: 200 * 1024 * 1024, // 200MB
        supportedFormats: [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/x-msvideo",
          "video/quicktime",
          "video/x-ms-wmv",
          "video/x-flv",
          "video/3gpp",
          "video/3gpp2",
          "video/x-matroska",
        ],
      },
    },
    CACHE: {
      text: {
        maxSize: 100, // Tối đa 100 entries cho text
        expirationTime: 300000, // 5 phút
      },
      image: {
        maxSize: 50, // Tối đa 25 entries cho ảnh
        expirationTime: 1800000, // 30 phút
      },
      media: {
        maxSize: 50, // Số lượng media được cache tối đa
        expirationTime: 1800000, // 30 phút
      },
    },
    RATE_LIMIT: {
      maxRequests: 5,
      perMilliseconds: 10000,
    },
    THEME: {
      mode: "dark",
      light: {
        background: "#ddd",
        text: "#333",
        border: "#bbb",
        title: "#333",
        content: "#555",
        button: {
          close: { background: "#ff4444", text: "#ddd" },
          translate: { background: "#007BFF", text: "#ddd" },
        },
      },
      dark: {
        background: "#222",
        text: "#ddd",
        border: "#444",
        title: "#ddd",
        content: "#bbb",
        button: {
          close: { background: "#aa2222", text: "#ddd" },
          translate: { background: "#004a99", text: "#ddd" },
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
        minWidth: "300px",
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
      dragHandle: {
        padding: "10px",
        borderBottom: "1px solid",
        cursor: "move",
        userSelect: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopLeftRadius: "15px",
        borderTopRightRadius: "15px",
      },
    },
  };

  const DEFAULT_SETTINGS = {
    theme: CONFIG.THEME.mode,
    apiProvider: CONFIG.API.currentProvider,
    apiKey: {
      gemini: CONFIG.API.apiKey,
      openai:
        "tu_tao_them_vao",
    },
    geminiOptions: {
      modelType: "fast", // 'fast', 'pro', 'vision', 'custom'
      fastModel: "gemini-2.0-flash-lite",
      proModel: "gemini-2.0-pro-exp-02-05",
      visionModel: "gemini-2.0-flash-thinking-exp-01-21",
      customModel: "",
    },
    ocrOptions: {
      enabled: true,
      preferredProvider: CONFIG.API.currentProvider,
      displayType: "popup",
      maxFileSize: CONFIG.OCR.maxFileSize,
      temperature: CONFIG.OCR.generation.temperature,
      topP: CONFIG.OCR.generation.topP,
      topK: CONFIG.OCR.generation.topK,
    },
    mediaOptions: {
      enabled: true,
      temperature: CONFIG.MEDIA.generation.temperature,
      topP: CONFIG.MEDIA.generation.topP,
      topK: CONFIG.MEDIA.generation.topK,
    },
    displayOptions: {
      showOriginalText: true,
      fontSize: "16px",
      minPopupWidth: "300px",
      maxPopupWidth: "90vw",
    },
    shortcuts: {
      settingsEnabled: true,
      enabled: true,
      quickTranslate: { key: "t", altKey: true },
      popupTranslate: { key: "q", altKey: true },
      advancedTranslate: { key: "a", altKey: true },
    },
    clickOptions: {
      enabled: true,
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
    cacheOptions: {
      text: {
        enabled: true,
        maxSize: CONFIG.CACHE.text.maxSize,
        expirationTime: CONFIG.CACHE.text.expirationTime,
      },
      image: {
        enabled: true,
        maxSize: CONFIG.CACHE.image.maxSize,
        expirationTime: CONFIG.CACHE.image.expirationTime,
      },
      media: {
        enabled: true,
        maxSize: CONFIG.CACHE.media.maxSize,
        expirationTime: CONFIG.CACHE.media.expirationTime,
      },
    },
    rateLimit: {
      maxRequests: CONFIG.RATE_LIMIT.maxRequests,
      perMilliseconds: CONFIG.RATE_LIMIT.perMilliseconds,
    },
  };

  class UserSettings {
    constructor() {
      this.settings = this.loadSettings();
    }

    createSettingsUI() {
      const container = document.createElement("div");
      const isDark = this.settings.theme === "dark";
      const geminiModels = {
        fast: CONFIG.API.providers.gemini.models.fast || [],
        pro: CONFIG.API.providers.gemini.models.pro || [],
        vision: CONFIG.API.providers.gemini.models.vision || [],
      };

      container.style.cssText = `
        all: initial;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${isDark ? "#222" : "#f5f5f5"};
        color: ${isDark ? "#ddd" : "#333"};
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
            border: 1px solid ${isDark ? "#666" : "#bbb"} !important;
            background: ${isDark ? "#444" : "#ddd"} !important;
            color: ${isDark ? "#ddd" : "#000"} !important;
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
        #apiKey {
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
            color: ${isDark ? "#ddd" : "#000"} !important;
            padding: 5px 15px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            border: none !important;
            margin: 5px !important;
        }
        #cancelSettings {
            background: ${isDark ? "#666" : "#ddd"} !important;
            color: ${isDark ? "#ddd" : "#000"} !important;
            padding: 5px 15px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            border: none !important;
            margin: 5px !important;
        }
        #cancelSettings:hover {
            background: ${isDark ? "#888" : "#aaa"} !important;
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
            background: #009ddd !important;
        }
        button {
          font-family: Arial, sans-serif !important;
          font-size: 14px !important;
          border: none !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          font-weight: 500 !important;
          letter-spacing: 0.3px !important;
        }
        button:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        button:active {
          transform: translateY(0) !important;
        }
        #exportSettings:hover {
          background: #218838 !important;
        }
        #importSettings:hover {
          background: #138496 !important;
        }
        #cancelSettings:hover {
          background: ${isDark ? "#777" : "#dae0e5"} !important;
        }
        #saveSettings:hover {
          background: #0056b3 !important;
        }
        // Thêm animation cho nút
        @keyframes buttonPop {
          0% { transform: scale(1); }
          50% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        button:active {
          animation: buttonPop 0.2s ease;
        }
        .radio-group {
            display: flex !important;
            gap: 15px !important;
        }
        .radio-group label {
            flex: 1 !important;
            display: flex !important;
            color: ${isDark ? "#ddd" : "#000"} !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 5px !important;
        }
        .radio-group input[type="radio"] {
            margin-right: 5px !important;
        }
        .shortcut-container {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .shortcut-prefix {
            white-space: nowrap !important;
            color: ${isDark ? "#aaa" : "#555"} !important;
            font-size: 14px !important;
            min-width: 45px !important;
        }
        .shortcut-input {
            flex: 1 !important;
            min-width: 60px !important;
            max-width: 100px !important;
        }
    `;

      const styleElement = document.createElement("style");
      styleElement.textContent = resetStyle;
      container.appendChild(styleElement);

      container.innerHTML += `
<h2>Cài đặt Translator AI</h2>

<div style="margin-bottom: 15px;">
  <h3>GIAO DIỆN</h3>
  <div class="radio-group">
    <label>
      <input type="radio" name="theme" value="light" ${!isDark ? "checked" : ""
        }>
      <span>Sáng</span>
    </label>
    <label>
      <input type="radio" name="theme" value="dark" ${isDark ? "checked" : ""}>
      <span>Tối</span>
    </label>
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>API PROVIDER</h3>
  <div class="radio-group">
    <label>
      <input type="radio" name="apiProvider" value="gemini" ${this.settings.apiProvider === "gemini" ? "checked" : ""
        }>
      <span>Gemini</span>
    </label>
    <label>
      <input type="radio" name="apiProvider" value="openai" ${this.settings.apiProvider === "openai" ? "checked" : ""
        }>
      <span>OpenAI</span>
    </label>
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>API KEY</h3>
  <input type="text" id="apiKey" value="${this.settings.apiKey[this.settings.apiProvider]
        }">
</div>

<div style="margin-bottom: 15px;">
  <h3>MODEL GEMINI</h3>
  <div class="settings-grid">
    <span class="settings-label">Sử dụng loại model:</span>
    <select id="geminiModelType" class="settings-input">
      <option value="fast" ${this.settings.geminiOptions?.modelType === "fast" ? "selected" : ""
        }>Nhanh</option>
      <option value="pro" ${this.settings.geminiOptions?.modelType === "pro" ? "selected" : ""
        }>Pro</option>
      <option value="vision" ${this.settings.geminiOptions?.modelType === "vision" ? "selected" : ""
        }>Suy luận</option>
      <option value="custom" ${this.settings.geminiOptions?.modelType === "custom" ? "selected" : ""
        }>Tùy chỉnh</option>
    </select>
  </div>

  <div id="fastModelContainer" class="settings-grid" ${this.settings.geminiOptions?.modelType !== "fast"
          ? 'style="display: none;"'
          : ""
        }>
    <span class="settings-label">Model Nhanh:</span>
    <select id="fastModel" class="settings-input">
      ${geminiModels.fast
          .map(
            (model) => `
      <option value="${model}" ${this.settings.geminiOptions?.fastModel === model ? "selected" : ""
              }>${model}</option>
      `,
          )
          .join("")}
    </select>
  </div>

  <div id="proModelContainer" class="settings-grid" ${this.settings.geminiOptions?.modelType !== "pro"
          ? 'style="display: none;"'
          : ""
        }>
    <span class="settings-label">Model Chuyên nghiệp:</span>
    <select id="proModel" class="settings-input">
      ${geminiModels.pro
          .map(
            (model) => `
      <option value="${model}" ${this.settings.geminiOptions?.proModel === model ? "selected" : ""
              }>${model}</option>
      `,
          )
          .join("")}
    </select>
  </div>

  <div id="visionModelContainer" class="settings-grid" ${this.settings.geminiOptions?.modelType !== "vision"
          ? 'style="display: none;"'
          : ""
        }>
    <span class="settings-label">Model Suy luận:</span>
    <select id="visionModel" class="settings-input">
      ${geminiModels.vision
          .map(
            (model) => `
      <option value="${model}" ${this.settings.geminiOptions?.visionModel === model ? "selected" : ""
              }>${model}</option>
      `,
          )
          .join("")}
    </select>
  </div>

  <div id="customModelContainer" class="settings-grid" ${this.settings.geminiOptions?.modelType !== "custom"
          ? 'style="display: none;"'
          : ""
        }>
    <span class="settings-label">Model tùy chỉnh:</span>
    <input type="text" id="customModel" class="settings-input" value="${this.settings.geminiOptions?.customModel || ""
        }"
      placeholder="Nhập tên model">
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>DỊCH VĂN BẢN TRONG ẢNH</h3>
  <div class="settings-grid">
    <span class="settings-label">Bật OCR dịch:</span>
    <input type="checkbox" id="ocrEnabled" ${this.settings.ocrOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Temperature:</span>
    <input type="number" id="ocrTemperature" class="settings-input" value="${this.settings.ocrOptions.temperature
        }"
      min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">Top P:</span>
    <input type="number" id="ocrTopP" class="settings-input" value="${this.settings.ocrOptions.topP
        }" min="0" max="1"
      step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">Top K:</span>
    <input type="number" id="ocrTopK" class="settings-input" value="${this.settings.ocrOptions.topK
        }" min="1"
      max="100" step="1">
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>DỊCH MEDIA</h3>
  <div class="settings-grid">
    <span class="settings-label">Bật dịch Media:</span>
    <input type="checkbox" id="mediaEnabled" ${this.settings.mediaOptions.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Temperature:</span>
    <input type="number" id="mediaTemperature" class="settings-input"
      value="${this.settings.mediaOptions.temperature
        }" min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">Top P:</span>
    <input type="number" id="mediaTopP" class="settings-input" value="${this.settings.mediaOptions.topP
        }" min="0"
      max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">Top K:</span>
    <input type="number" id="mediaTopK" class="settings-input" value="${this.settings.mediaOptions.topK
        }" min="1"
      max="100" step="1">
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>HIỂN THỊ</h3>
  <div class="settings-grid">
    <span class="settings-label">Hiện văn bản gốc:</span>
    <input type="checkbox" id="showOriginalText" ${this.settings.displayOptions?.showOriginalText ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Cỡ chữ:</span>
    <select id="fontSize" class="settings-input">
      <option value="12px" ${this.settings.displayOptions?.fontSize === "12px" ? "selected" : ""
        }>Nhỏ (12px)</option>
      <option value="14px" ${this.settings.displayOptions?.fontSize === "14px" ? "selected" : ""
        }>Hơi nhỏ (14px)
      </option>
      <option value="16px" ${this.settings.displayOptions?.fontSize === "16px" ? "selected" : ""
        }>Vừa (16px)</option>
      <option value="18px" ${this.settings.displayOptions?.fontSize === "18px" ? "selected" : ""
        }>Hơi lớn (18px)
      </option>
      <option value="20px" ${this.settings.displayOptions?.fontSize === "20px" ? "selected" : ""
        }>Lớn (20px)</option>
      <option value="22px" ${this.settings.displayOptions?.fontSize === "22px" ? "selected" : ""
        }>Cực lớn (22px)
      </option>
      <option value="24px" ${this.settings.displayOptions?.fontSize === "24px" ? "selected" : ""
        }>Siêu lớn (24px)
      </option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Độ rộng tối thiểu:</span>
    <select id="minPopupWidth" class="settings-input">
      <option value="100px" ${this.settings.displayOptions?.minPopupWidth === "100px"
          ? "selected"
          : ""
        }>Rất nhỏ
        (100px)</option>
      <option value="200px" ${this.settings.displayOptions?.minPopupWidth === "200px"
          ? "selected"
          : ""
        }>Hơi nhỏ
        (200px)</option>
      <option value="300px" ${this.settings.displayOptions?.minPopupWidth === "300px"
          ? "selected"
          : ""
        }>Nhỏ (300px)
      </option>
      <option value="400px" ${this.settings.displayOptions?.minPopupWidth === "400px"
          ? "selected"
          : ""
        }>Vừa (400px)
      </option>
      <option value="500px" ${this.settings.displayOptions?.minPopupWidth === "500px"
          ? "selected"
          : ""
        }>Hơi lớn
        (500px)</option>
      <option value="600px" ${this.settings.displayOptions?.minPopupWidth === "600px"
          ? "selected"
          : ""
        }>Lớn (600px)
      </option>
      <option value="700px" ${this.settings.displayOptions?.minPopupWidth === "700px"
          ? "selected"
          : ""
        }>Cực lớn
        (700px)</option>
      <option value="800px" ${this.settings.displayOptions?.minPopupWidth === "800px"
          ? "selected"
          : ""
        }>Siêu lớn
        (800px)</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Độ rộng tối đa:</span>
    <select id="maxPopupWidth" class="settings-input">
      <option value="30vw" ${this.settings.displayOptions?.maxPopupWidth === "30vw" ? "selected" : ""
        }>30% màn hình
      </option>
      <option value="40vw" ${this.settings.displayOptions?.maxPopupWidth === "40vw" ? "selected" : ""
        }>40% màn hình
      </option>
      <option value="50vw" ${this.settings.displayOptions?.maxPopupWidth === "50vw" ? "selected" : ""
        }>50% màn hình
      </option>
      <option value="60vw" ${this.settings.displayOptions?.maxPopupWidth === "60vw" ? "selected" : ""
        }>60% màn hình
      </option>
      <option value="70vw" ${this.settings.displayOptions?.maxPopupWidth === "70vw" ? "selected" : ""
        }>70% màn hình
      </option>
      <option value="80vw" ${this.settings.displayOptions?.maxPopupWidth === "80vw" ? "selected" : ""
        }>80% màn hình
      </option>
      <option value="90vw" ${this.settings.displayOptions?.maxPopupWidth === "90vw" ? "selected" : ""
        }>90% màn hình
      </option>
    </select>
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>PHÍM TẮT</h3>
  <div class="settings-grid">
    <span class="settings-label">Bật phím tắt mở cài đặt:</span>
    <input type="checkbox" id="settingsShortcutEnabled" ${this.settings.shortcuts?.settingsEnabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Bật phím tắt dịch:</span>
    <input type="checkbox" id="shortcutsEnabled" ${this.settings.shortcuts?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Dịch nhanh:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Alt +</span>
      <input type="text" id="quickKey" class="shortcut-input settings-input"
        value="${this.settings.shortcuts.quickTranslate.key}" ${!this.settings.shortcuts?.enabled ? "disabled" : ""
        }>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Dịch popup:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Alt +</span>
      <input type="text" id="popupKey" class="shortcut-input settings-input"
        value="${this.settings.shortcuts.popupTranslate.key}" ${!this.settings.shortcuts?.enabled ? "disabled" : ""
        }>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Dịch nâng cao:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Alt +</span>
      <input type="text" id="advancedKey" class="shortcut-input settings-input" value="${this.settings.shortcuts.advancedTranslate.key
        }" ${!this.settings.shortcuts?.enabled ? "disabled" : ""}>
    </div>
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>NÚT DỊCH</h3>
  <div class="settings-grid">
    <span class="settings-label">Bật nút dịch:</span>
    <input type="checkbox" id="translationButtonEnabled" ${this.settings.clickOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Nhấp đơn:</span>
    <select id="singleClickSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.singleClick.translateType === "quick"
          ? "selected"
          : ""
        }>Dịch
        nhanh</option>
      <option value="popup" ${this.settings.clickOptions.singleClick.translateType === "popup"
          ? "selected"
          : ""
        }>Dịch
        popup</option>
      <option value="advanced" ${this.settings.clickOptions.singleClick.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch nâng cao</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Nhấp đúp:</span>
    <select id="doubleClickSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.doubleClick.translateType === "quick"
          ? "selected"
          : ""
        }>Dịch
        nhanh</option>
      <option value="popup" ${this.settings.clickOptions.doubleClick.translateType === "popup"
          ? "selected"
          : ""
        }>Dịch
        popup</option>
      <option value="advanced" ${this.settings.clickOptions.doubleClick.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch nâng cao</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Giữ nút:</span>
    <select id="holdSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.hold.translateType === "quick"
          ? "selected"
          : ""
        }>Dịch nhanh
      </option>
      <option value="popup" ${this.settings.clickOptions.hold.translateType === "popup"
          ? "selected"
          : ""
        }>Dịch popup
      </option>
      <option value="advanced" ${this.settings.clickOptions.hold.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch
        nâng cao</option>
    </select>
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>CẢM ỨNG ĐA ĐIỂM</h3>
  <div class="settings-grid">
    <span class="settings-label">Bật cảm ứng:</span>
    <input type="checkbox" id="touchEnabled" ${this.settings.touchOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Hai ngón tay:</span>
    <select id="twoFingersSelect" class="settings-input">
      <option value="quick" ${this.settings.touchOptions?.twoFingers?.translateType === "quick"
          ? "selected"
          : ""
        }>
        Dịch nhanh</option>
      <option value="popup" ${this.settings.touchOptions?.twoFingers?.translateType === "popup"
          ? "selected"
          : ""
        }>
        Dịch popup</option>
      <option value="advanced" ${this.settings.touchOptions?.twoFingers?.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch nâng cao</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Ba ngón tay:</span>
    <select id="threeFingersSelect" class="settings-input">
      <option value="quick" ${this.settings.touchOptions?.threeFingers?.translateType === "quick"
          ? "selected"
          : ""
        }>
        Dịch nhanh</option>
      <option value="popup" ${this.settings.touchOptions?.threeFingers?.translateType === "popup"
          ? "selected"
          : ""
        }>
        Dịch popup</option>
      <option value="advanced" ${this.settings.touchOptions?.threeFingers?.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch nâng cao</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Bốn ngón tay:</span>
    <select id="fourFingersSelect" class="settings-input">
      <option value="quick" ${this.settings.touchOptions?.fourFingers?.translateType === "quick"
          ? "selected"
          : ""
        }>
        Dịch nhanh</option>
      <option value="popup" ${this.settings.touchOptions?.fourFingers?.translateType === "popup"
          ? "selected"
          : ""
        }>
        Dịch popup</option>
      <option value="advanced" ${this.settings.touchOptions?.fourFingers?.translateType === "advanced"
          ? "selected"
          : ""
        }>Dịch nâng cao</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">Độ nhạy (ms):</span>
    <input type="number" id="touchSensitivity" class="settings-input"
      value="${this.settings.touchOptions?.sensitivity || 100
        }" min="50" max="500" step="50">
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>RATE LIMIT</h3>
  <div class="settings-grid">
    <span class="settings-label">Số yêu cầu tối đa:</span>
    <input type="number" id="maxRequests" class="settings-input" value="${this.settings.rateLimit?.maxRequests || CONFIG.RATE_LIMIT.maxRequests
        }" min="1" max="15" step="1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">Thời gian chờ (ms):</span>
    <input type="number" id="perMilliseconds" class="settings-input" value="${this.settings.rateLimit?.perMilliseconds ||
        CONFIG.RATE_LIMIT.perMilliseconds
        }" min="1000" step="1000">
  </div>
</div>

<div style="margin-bottom: 15px;">
  <h3>CACHE</h3>
  <div style="margin-bottom: 10px;">
    <h4 style="color: ${isDark ? " #678" : "#333"
        }; margin-bottom: 8px;">Text Cache</h4>
    <div class="settings-grid">
      <span class="settings-label">Bật cache text:</span>
      <input type="checkbox" id="textCacheEnabled" ${this.settings.cacheOptions?.text?.enabled ? "checked" : ""
        }>
    </div>
    <div class="settings-grid">
      <span class="settings-label">Kích thước cache text:</span>
      <input type="number" id="textCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions?.text?.maxSize || CONFIG.CACHE.text.maxSize
        }" min="10" max="1000">
    </div>
    <div class="settings-grid">
      <span class="settings-label">Thời gian cache text (ms):</span>
      <input type="number" id="textCacheExpiration" class="settings-input" value="${this.settings.cacheOptions?.text?.expirationTime ||
        CONFIG.CACHE.text.expirationTime
        }" min="60000" step="60000">
    </div>
    <div style="margin-bottom: 10px;">
      <h4 style="color: ${isDark ? " #678" : "#333"
        }; margin-bottom: 8px;">Image Cache</h4>
      <div class="settings-grid">
        <span class="settings-label">Bật cache ảnh:</span>
        <input type="checkbox" id="imageCacheEnabled" ${this.settings.cacheOptions?.image?.enabled ? "checked" : ""
        }>
      </div>
      <div class="settings-grid">
        <span class="settings-label">Kích thước cache ảnh:</span>
        <input type="number" id="imageCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions?.image?.maxSize ||
        CONFIG.CACHE.image.maxSize
        }" min="10" max="100">
      </div>
      <div class="settings-grid">
        <span class="settings-label">Thời gian cache ảnh (ms):</span>
        <input type="number" id="imageCacheExpiration" class="settings-input" value="${this.settings.cacheOptions?.image?.expirationTime ||
        CONFIG.CACHE.image.expirationTime
        }" min="60000" step="60000">
      </div>
    </div>
    <div style="margin-bottom: 10px;">
      <h4 style="color: ${isDark ? " #678" : "#333"
        }; margin-bottom: 8px;">Media Cache</h4>
      <div class="settings-grid">
        <span class="settings-label">Bật cache media:</span>
        <input type="checkbox" id="mediaCacheEnabled" ${this.settings.cacheOptions.media?.enabled ? "checked" : ""
        }>
      </div>
      <div class="settings-grid">
        <span class="settings-label">Media cache entries:</span>
        <input type="number" id="mediaCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions.media?.maxSize ||
        CONFIG.CACHE.media.maxSize
        }" min="5" max="100">
      </div>
      <div class="settings-grid">
        <span class="settings-label">Thời gian expire (giây):</span>
        <input type="number" id="mediaCacheExpirationTime" class="settings-input" value="${this.settings.cacheOptions.media?.expirationTime / 1000 ||
        CONFIG.CACHE.media.expirationTime / 1000
        }" min="60000" step="60000">
      </div>
    </div>
  </div>
</div>
<div style="border-top: 1px solid ${isDark ? "#444" : "#ddd"
        }; margin-top: 20px; padding-top: 20px;">
  <h3>SAO LƯU CÀI ĐẶT</h3>
  <div style="display: flex; gap: 10px; margin-bottom: 15px;">
    <button id="exportSettings" style="flex: 1; background: #28a745 !important; min-width: 140px; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Xuất cài đặt
    </button>
    <input type="file" id="importInput" accept=".json" style="display: none;">
    <button id="importSettings" style="flex: 1; background: #17a2b8 !important; min-width: 140px; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Nhập cài đặt
    </button>
  </div>
</div>
<div style="border-top: 1px solid ${isDark ? "#444" : "#ddd"
        }; margin-top: 20px; padding-top: 20px;">
  <div style="display: flex; gap: 10px; justify-content: flex-end;">
    <button id="cancelSettings" style="min-width: 100px; height: 36px; background: ${isDark ? "#666" : "#e9ecef"
        } !important; color: ${isDark ? "#fff" : "#333"} !important;">
      Hủy
    </button>
    <button id="saveSettings" style="min-width: 100px; height: 36px; background: #007bff !important; color: white !important;">
      Lưu
    </button>
  </div>
</div>
      `;

      container.className = "translator-settings-container";

      const modelTypeSelect = container.querySelector("#geminiModelType");
      const fastContainer = container.querySelector("#fastModelContainer");
      const proContainer = container.querySelector("#proModelContainer");
      const visionContainer = container.querySelector("#visionModelContainer");
      const customContainer = container.querySelector("#customModelContainer");

      modelTypeSelect.addEventListener("change", (e) => {
        const selectedType = e.target.value;
        fastContainer.style.display = selectedType === "fast" ? "" : "none";
        proContainer.style.display = selectedType === "pro" ? "" : "none";
        visionContainer.style.display = selectedType === "vision" ? "" : "none";
        customContainer.style.display = selectedType === "custom" ? "" : "none";
      });

      const handleEscape = (e) => {
        if (e.key === "Escape") {
          // Xóa event listener khi đóng UI
          document.removeEventListener("keydown", handleEscape);
          // Xóa container settings khỏi DOM
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        }
      };

      // Đăng ký event listener
      document.addEventListener("keydown", handleEscape);

      // Thêm cleanup khi container bị xóa
      container.addEventListener("remove", () => {
        document.removeEventListener("keydown", handleEscape);
      });

      const exportBtn = container.querySelector("#exportSettings");
      const importBtn = container.querySelector("#importSettings");
      const importInput = container.querySelector("#importInput");

      exportBtn.addEventListener("click", () => {
        try {
          this.exportSettings();
          this.showNotification("Export settings thành công");
        } catch (error) {
          this.showNotification("Lỗi export settings", "error");
        }
      });

      importBtn.addEventListener("click", () => {
        importInput.click();
      });

      importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          await this.importSettings(file);
          this.showNotification("Import settings thành công");
          // Reload trang để áp dụng settings mới
          setTimeout(() => location.reload(), 1500);
        } catch (error) {
          this.showNotification(error.message, "error");
        }
      });

      const cancelButton = container.querySelector("#cancelSettings");
      cancelButton.addEventListener("click", () => {
        // Xóa container settings khỏi DOM
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });

      const saveButton = container.querySelector("#saveSettings");
      saveButton.addEventListener("click", () => {
        this.saveSettings(container);
        container.remove();
        location.reload();
      });

      return container;
    }

    exportSettings() {
      // Lấy settings hiện tại
      const settings = this.settings;

      // Tạo tên file với timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `king1x32-translator-settings-${timestamp}.json`;

      // Tạo file JSON
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json",
      });

      // Tạo link download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    async importSettings(file) {
      try {
        // Đọc file
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Không thể đọc file"));
          reader.readAsText(file);
        });

        // Parse JSON
        const importedSettings = JSON.parse(content);

        // Validate settings
        if (!this.validateImportedSettings(importedSettings)) {
          throw new Error("File settings không hợp lệ");
        }

        // Merge với defaults để đảm bảo có đầy đủ fields
        const mergedSettings = this.mergeWithDefaults(importedSettings);

        // Lưu settings mới
        GM_setValue("translatorSettings", JSON.stringify(mergedSettings));

        return true;
      } catch (error) {
        console.error("Import error:", error);
        throw new Error(`Lỗi import: ${error.message}`);
      }
    }

    validateImportedSettings(settings) {
      // Kiểm tra các trường bắt buộc
      const requiredFields = [
        "theme",
        "apiProvider",
        "apiKey",
        "geminiOptions",
        "ocrOptions",
        "mediaOptions",
        "displayOptions",
        "shortcuts",
        "clickOptions",
        "touchOptions",
        "cacheOptions",
        "rateLimit",
      ];

      return requiredFields.every((field) => settings.hasOwnProperty(field));
    }

    showNotification(message, type = "success") {
      const notification = document.createElement("div");
      notification.className = "translator-notification";

      const backgroundColor = type === "success" ? "#28a745" : "#dc3545";

      Object.assign(notification.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor,
        color: "white",
        padding: "10px 20px",
        borderRadius: "5px",
        zIndex: "9999",
        animation: "fadeInOut 2s ease",
      });

      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 2000);
    }

    loadSettings() {
      const savedSettings = GM_getValue("translatorSettings");
      return savedSettings
        ? this.mergeWithDefaults(JSON.parse(savedSettings))
        : DEFAULT_SETTINGS;
    }

    mergeWithDefaults(savedSettings) {
      return {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        geminiOptions: {
          ...DEFAULT_SETTINGS.geminiOptions,
          ...(savedSettings?.geminiOptions || {}),
        },
        apiKey: {
          ...DEFAULT_SETTINGS.apiKey,
          ...(savedSettings?.apiKey || {}),
        },
        ocrOptions: {
          ...DEFAULT_SETTINGS.ocrOptions,
          ...(savedSettings?.ocrOptions || {}),
        },
        displayOptions: {
          ...DEFAULT_SETTINGS.displayOptions,
          ...(savedSettings?.displayOptions || {}),
        },
        shortcuts: {
          ...DEFAULT_SETTINGS.shortcuts,
          ...(savedSettings?.shortcuts || {}),
        },
        clickOptions: {
          ...DEFAULT_SETTINGS.clickOptions,
          ...(savedSettings?.clickOptions || {}),
        },
        touchOptions: {
          ...DEFAULT_SETTINGS.touchOptions,
          ...(savedSettings?.touchOptions || {}),
        },
        cacheOptions: {
          text: {
            ...DEFAULT_SETTINGS.cacheOptions.text,
            ...(savedSettings?.cacheOptions?.text || {}),
          },
          image: {
            ...DEFAULT_SETTINGS.cacheOptions.image,
            ...(savedSettings?.cacheOptions?.image || {}),
          },
          media: {
            ...DEFAULT_SETTINGS.cacheOptions.media,
            ...(savedSettings?.cacheOptions?.media || {}),
          },
        },
        rateLimit: {
          ...DEFAULT_SETTINGS.rateLimit,
          ...(savedSettings?.rateLimit || {}),
        },
      };
    }

    saveSettings(settingsUI) {
      const maxWidthVw = settingsUI.querySelector("#maxPopupWidth").value;
      const maxWidthPx = (window.innerWidth * parseInt(maxWidthVw)) / 100;
      const minWidthPx = parseInt(
        settingsUI.querySelector("#minPopupWidth").value,
      );
      const finalMinWidth =
        minWidthPx > maxWidthPx
          ? maxWidthVw // Nếu minWidth lớn hơn, sử dụng maxWidth
          : settingsUI.querySelector("#minPopupWidth").value; // Ngược lại giữ nguyên minWidth

      const newSettings = {
        theme: settingsUI.querySelector('input[name="theme"]:checked').value,
        apiProvider: settingsUI.querySelector(
          'input[name="apiProvider"]:checked',
        ).value,
        apiKey: {
          ...this.settings.apiKey,
          [settingsUI.querySelector('input[name="apiProvider"]:checked').value]:
            settingsUI.querySelector("#apiKey").value,
        },
        geminiOptions: {
          modelType: settingsUI.querySelector("#geminiModelType").value,
          fastModel: settingsUI.querySelector("#fastModel").value,
          proModel: settingsUI.querySelector("#proModel").value,
          visionModel: settingsUI.querySelector("#visionModel").value,
          customModel: settingsUI.querySelector("#customModel").value,
        },
        ocrOptions: {
          enabled: settingsUI.querySelector("#ocrEnabled").checked,
          preferredProvider: settingsUI.querySelector(
            'input[name="apiProvider"]:checked',
          ).value,
          displayType: "popup",
          maxFileSize: CONFIG.OCR.maxFileSize,
          temperature: parseFloat(
            settingsUI.querySelector("#ocrTemperature").value,
          ),
          topP: parseFloat(settingsUI.querySelector("#ocrTopP").value),
          topK: parseInt(settingsUI.querySelector("#ocrTopK").value),
        },
        mediaOptions: {
          enabled: settingsUI.querySelector("#mediaEnabled").checked,
          temperature: parseFloat(
            settingsUI.querySelector("#mediaTemperature").value,
          ),
          topP: parseFloat(settingsUI.querySelector("#mediaTopP").value),
          topK: parseInt(settingsUI.querySelector("#mediaTopK").value),
        },
        displayOptions: {
          showOriginalText:
            settingsUI.querySelector("#showOriginalText").checked,
          fontSize: settingsUI.querySelector("#fontSize").value,
          minPopupWidth: finalMinWidth,
          maxPopupWidth: maxWidthVw,
        },
        shortcuts: {
          settingsEnabled: settingsUI.querySelector("#settingsShortcutEnabled")
            .checked,
          enabled: settingsUI.querySelector("#shortcutsEnabled").checked,
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
        },
        clickOptions: {
          enabled: settingsUI.querySelector("#translationButtonEnabled")
            .checked,
          singleClick: {
            translateType: settingsUI.querySelector("#singleClickSelect").value,
          },
          doubleClick: {
            translateType: settingsUI.querySelector("#doubleClickSelect").value,
          },
          hold: {
            translateType: settingsUI.querySelector("#holdSelect").value,
          },
        },
        touchOptions: {
          enabled: settingsUI.querySelector("#touchEnabled").checked,
          sensitivity: parseInt(
            settingsUI.querySelector("#touchSensitivity").value,
          ),
          twoFingers: {
            translateType: settingsUI.querySelector("#twoFingersSelect").value,
          },
          threeFingers: {
            translateType: settingsUI.querySelector("#threeFingersSelect")
              .value,
          },
          fourFingers: {
            translateType: settingsUI.querySelector("#fourFingersSelect").value,
          },
        },
        cacheOptions: {
          text: {
            enabled: settingsUI.querySelector("#textCacheEnabled").checked,
            maxSize: parseInt(
              settingsUI.querySelector("#textCacheMaxSize").value,
            ),
            expirationTime: parseInt(
              settingsUI.querySelector("#textCacheExpiration").value,
            ),
          },
          image: {
            enabled: settingsUI.querySelector("#imageCacheEnabled").checked,
            maxSize: parseInt(
              settingsUI.querySelector("#imageCacheMaxSize").value,
            ),
            expirationTime: parseInt(
              settingsUI.querySelector("#imageCacheExpiration").value,
            ),
          },
          media: {
            enabled: document.getElementById("mediaCacheEnabled").checked,
            maxSize: parseInt(
              document.getElementById("mediaCacheMaxSize").value,
            ),
            expirationTime:
              parseInt(
                document.getElementById("mediaCacheExpirationTime").value,
              ) * 1000,
          },
        },
        rateLimit: {
          maxRequests: parseInt(settingsUI.querySelector("#maxRequests").value),
          perMilliseconds: parseInt(
            settingsUI.querySelector("#perMilliseconds").value,
          ),
        },
      };

      const mergedSettings = this.mergeWithDefaults(newSettings);
      GM_setValue("translatorSettings", JSON.stringify(mergedSettings));
      this.settings = mergedSettings;

      // Emit event for settings change
      const event = new CustomEvent("settingsChanged", {
        detail: mergedSettings,
      });
      document.dispatchEvent(event);

      return mergedSettings;
    }

    getSetting(path) {
      return path.split(".").reduce((obj, key) => obj?.[key], this.settings);
    }
  }

  class OCRManager {
    constructor(translator) {
      this.translator = translator;
      this.isProcessing = false;
      this.imageCache = new ImageCache();
    }

    async processImage(file) {
      if (this.isProcessing) {
        throw new Error("Đang xử lý ảnh khác, vui lòng đợi");
      }

      try {
        this.isProcessing = true;
        if (!CONFIG.OCR.supportedFormats.includes(file.type)) {
          throw new Error("Định dạng file không được hỗ trợ");
        }

        if (file.size > CONFIG.OCR.maxFileSize) {
          throw new Error(
            `File quá lớn. Kích thước tối đa: ${CONFIG.OCR.maxFileSize / (1024 * 1024)
            }MB`,
          );
        }

        const base64Image = await this.fileToBase64(file);
        let result;

        // Kiểm tra cache nếu được bật
        if (
          this.imageCache &&
          this.translator.userSettings.settings.cacheOptions.image.enabled
        ) {
          result = await this.imageCache.get(base64Image);
          if (result) return result;
        }

        console.log("Processing with Gemini Vision...");
        result = await this.translator.api.processImage(base64Image, file);

        // Kiểm tra kết quả
        if (!result || typeof result !== "string") {
          throw new Error("Không thể trích xuất text từ ảnh");
        }

        // Lưu cache nếu được bật
        if (
          this.imageCache &&
          this.translator.userSettings.settings.cacheOptions.image.enabled
        ) {
          await this.imageCache.set(base64Image, result);
        }

        return result;
      } catch (error) {
        console.error("OCR processing error:", error);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    }

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.readAsDataURL(file);
      });
    }
  }

  class ImageCache {
    constructor() {
      this.maxSize = CONFIG.CACHE.image.maxSize;
      this.expirationTime = CONFIG.CACHE.image.expirationTime;
      this.cache = new Map();
      this.accessOrder = [];
    }

    async generateKey(imageData) {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(imageData),
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    async set(imageData, ocrResult) {
      const key = await this.generateKey(imageData);

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
        result: ocrResult,
        timestamp: Date.now(),
      });
    }

    async get(imageData) {
      const key = await this.generateKey(imageData);
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

      return data.result;
    }

    clear() {
      this.cache.clear();
      this.accessOrder = [];
    }
  }

  class MediaCache {
    constructor() {
      this.maxSize = CONFIG.CACHE.media.maxSize;
      this.expirationTime = CONFIG.CACHE.media.expirationTime;
      this.cache = new Map();
      this.accessOrder = [];
    }

    async generateKey(fileData) {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(fileData),
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    async set(fileData, translation) {
      const key = await this.generateKey(fileData);

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

    async get(fileData) {
      const key = await this.generateKey(fileData);
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
    constructor(config, getSettings) {
      this.config = config;
      this.getSettings = getSettings;
      this.requestCount = 0;
      this.lastRequestTime = 0;
      this.currentProvider = config.currentProvider;
    }

    async request(prompt) {
      console.log("APIManager.request called with prompt");

      const provider = this.config.providers[this.currentProvider];
      if (!provider) {
        throw new Error(`Provider ${this.currentProvider} not found`);
      }

      let attempts = 0;
      let lastError;

      while (attempts < this.config.maxRetries) {
        try {
          console.log(`Attempt ${attempts + 1} of ${this.config.maxRetries}`);

          await this.checkRateLimit();
          console.log("Rate limit checked");

          const response = await this.makeRequest(provider, prompt);
          console.log("API response received");

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
            console.log(`Waiting ${delay}ms before retry`);
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

      // Lấy settings thông qua hàm callback
      const settings = this.getSettings();
      const { maxRequests, perMilliseconds } =
        settings?.rateLimit || CONFIG.RATE_LIMIT;

      if (now - this.lastRequestTime < perMilliseconds) {
        if (this.requestCount >= maxRequests) {
          const delay = perMilliseconds - (now - this.lastRequestTime);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.requestCount = 0;
        }
      } else {
        this.requestCount = 0;
        this.lastRequestTime = now;
      }
    }

    getGeminiModel() {
      const settings = this.getSettings();
      const geminiOptions = settings.geminiOptions;

      switch (geminiOptions.modelType) {
        case "fast":
          return geminiOptions.fastModel;
        case "pro":
          return geminiOptions.proModel;
        case "vision":
          return geminiOptions.visionModel;
        case "custom":
          return geminiOptions.customModel || "gemini-2.0-pro-exp-02-05"; // fallback to default if empty
        default:
          return "gemini-2.0-pro-exp-02-05"; // default model
      }
    }

    async makeRequest(provider, prompt) {
      return new Promise((resolve, reject) => {
        const apiKey = this.config.apiKey[this.currentProvider];
        // Modify URL to use selected model
        const selectedModel = this.getGeminiModel();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const headers =
          typeof provider.headers === "function"
            ? provider.headers(apiKey)
            : provider.headers;

        console.log("API URL:", url);

        // Lấy các tham số từ settings
        const ocrOptions = this.getSettings().ocrOptions;
        const temperature = ocrOptions.temperature;
        const topP = ocrOptions.topP;
        const topK = ocrOptions.topK;

        // Thêm các tham số vào body của yêu cầu
        const requestBody = provider.body(prompt);
        if (requestBody.generationConfig) {
          requestBody.generationConfig = {
            ...requestBody.generationConfig,
            temperature,
            topP,
            topK,
          };
        } else {
          requestBody.generationConfig = {
            temperature,
            topP,
            topK,
          };
        }

        GM_xmlhttpRequest({
          method: "POST",
          url: url,
          headers: headers,
          data: JSON.stringify(requestBody),
          onload: (response) => {
            console.log("API response status:", response.status);
            console.log("API response:", response.responseText);

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

    async processImage(base64Image, file) {
      const provider = this.config.providers[this.currentProvider];
      const selectedModel = this.getGeminiModel();
      const apiKey = this.config.apiKey[this.currentProvider];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

      console.log("Processing image with type:", file.type);

      const requestBody = provider.body(
        "Đọc hiểu thật kĩ và dịch toàn bộ văn bản trong hình ảnh sang tiếng Việt thật tự nhiên, đảm bảo truyền tải đúng ý nghĩa và ngữ cảnh của đoạn văn bản thật chuẩn. Chỉ trả về bản dịch, không cần giải thích.",
      );

      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: file.type,
          data: base64Image,
        },
      });

      try {
        const response = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: provider.headers,
            data: JSON.stringify(requestBody),
            onload: (response) => {
              console.log("API Response:", response);
              if (response.status === 200) {
                try {
                  const result = JSON.parse(response.responseText);
                  resolve(result);
                } catch (error) {
                  reject(new Error("Failed to parse API response"));
                }
              } else {
                reject(new Error(`API Error: ${response.status}`));
              }
            },
            onerror: (error) => {
              console.error("API Error:", error);
              reject(new Error(`Connection error: ${error}`));
            },
          });
        });

        const parsedResponse = provider.responseParser(response);
        console.log("Parsed response:", parsedResponse);
        return parsedResponse;
      } catch (error) {
        console.error("Image processing error:", error);
        throw new Error(`Xử lý ảnh thất bại: ${error.message}`);
      }
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
      this.ocr = new OCRManager(translator);
      this.media = new MediaManager(translator);
      this.settingsShortcutListener = null;
      this.translationShortcutListener = null;
      this.mouseupButtonListener = null;
      this.selectionButtonListener = null;
      this.translationButtonEnabled = true;
      this.translationTapEnabled = true;

      // Bind các methods
      this.handleSettingsShortcut = this.handleSettingsShortcut.bind(this);
      this.handleTranslationShortcuts =
        this.handleTranslationShortcuts.bind(this);
      this.handleTranslateButtonClick =
        this.handleTranslateButtonClick.bind(this);
      this.setupClickHandlers = this.setupClickHandlers.bind(this);
      this.handleTextSelection = this.handleTextSelection.bind(this);
      this.showTranslatingStatus = this.showTranslatingStatus.bind(this);
      this.removeTranslatingStatus = this.removeTranslatingStatus.bind(this);
      this.resetState = this.resetState.bind(this);
      this.handleSettingsShortcut = this.handleSettingsShortcut.bind(this);
      this.handleTranslationShortcuts =
        this.handleTranslationShortcuts.bind(this);
      this.handleTouch = this.setupDocumentTapHandler.bind(this);

      // Khởi tạo listeners
      this.settingsShortcutListener = this.handleSettingsShortcut;
      this.translationShortcutListener = this.handleTranslationShortcuts;
      this.mouseupButtonListener = this.handleTextSelection;
      this.selectionButtonListener = this.handleTextSelection;
      this.touchTapListener = this.setupDocumentTapHandler;
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
        top: "0px" /* Đẩy lên trên một chút */,
        right: "0px" /* Đẩy sang phải một chút */,
        cursor: "pointer",
        color: "black",
        fontSize: "14px",
        fontWeight: "bold",
        padding: "4px 8px" /* Tăng kích thước */,
        lineHeight: "14px",
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
      lastSelectedParagraph.parentNode.appendChild(translationDiv);

      translationDiv.style.cssText = `
        display: block; /* Giữ cho phần dịch không bị kéo dài hết chiều ngang */
        max-width: fit-content;; /* Giới hạn chiều rộng */
        width: auto; /* Để nó co giãn theo nội dung */
        min-width: 150px;
        background: rgba(242, 240, 235, 0.6);
        color: black;
        padding: 8px 20px 8px 8px; /* Tăng padding bên phải để tránh nút x đè lên chữ */
        border-radius: 6px;
        font-size: 16px;
        margin-top: 5px;
        position: relative;
        z-index: 1000;
        border: 1px solid rgba(242, 240, 235, 0.2);
        white-space: normal; /* Cho phép xuống dòng nếu quá dài */
        overflow-wrap: break-word; /* Ngắt từ nếu quá dài */
      `;
    }

    displayPopup(translatedText, originalText, title = "Bản dịch") {
      this.removeTranslateButton();

      const theme = CONFIG.THEME[CONFIG.THEME.mode];
      const displayOptions =
        this.translator.userSettings.settings.displayOptions;
      const popup = document.createElement("div");
      popup.classList.add("draggable");

      // Xác định màu nền cho drag handle dựa trên theme
      const dragHandleBackground =
        theme.mode === "dark"
          ? "#1a1a1a" // Màu tối hơn cho dark mode
          : "#2c3e50"; // Màu xanh đậm cho light mode

      const popupStyle = {
        ...CONFIG.STYLES.popup,
        backgroundColor: theme.background,
        borderColor: theme.border,
        color: theme.text,
        minWidth: displayOptions.minPopupWidth,
        maxWidth: displayOptions.maxPopupWidth,
        fontSize: displayOptions.fontSize,
        padding: "0",
        overflow: "hidden", // Đảm bảo border radius cho drag handle
        display: "flex",
        flexDirection: "column",
      };
      Object.assign(popup.style, popupStyle);

      // Tạo drag handle với màu mới
      const dragHandle = document.createElement("div");
      Object.assign(dragHandle.style, {
        ...CONFIG.STYLES.dragHandle,
        backgroundColor: dragHandleBackground,
        borderColor: "transparent",
        color: "#ffffff", // Màu chữ trắng để tương phản
        padding: "12px 15px", // Tăng padding một chút
        borderTopLeftRadius: "15px",
        borderTopRightRadius: "15px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)", // Thêm shadow nhẹ
      });

      // Thêm title vào drag handle với màu chữ mới
      const titleSpan = document.createElement("span");
      titleSpan.textContent = title;
      Object.assign(titleSpan.style, {
        fontWeight: "bold",
        color: "#ffffff", // Màu chữ trắng cho title
        fontSize: "15px", // Tăng kích thước chữ một chút
      });

      // Tạo nút đóng với màu mới
      const closeButton = document.createElement("span");
      closeButton.innerHTML = "×";
      Object.assign(closeButton.style, {
        cursor: "pointer",
        fontSize: "22px",
        color: "#ffffff",
        padding: "0 10px",
        opacity: "0.8",
        transition: "all 0.2s ease", // Thêm transition cho cả color và opacity
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        borderRadius: "50%", // Bo tròn nút
      });

      // Thêm hover effect cho nút đóng
      closeButton.onmouseover = () => {
        Object.assign(closeButton.style, {
          opacity: "1",
          backgroundColor: "#ff4444",
        });
      };

      closeButton.onmouseout = () => {
        Object.assign(closeButton.style, {
          opacity: "0.8",
          backgroundColor: "transparent",
        });
      };

      closeButton.onclick = () => popup.remove();

      // Thêm title và nút đóng vào drag handle
      dragHandle.appendChild(titleSpan);
      dragHandle.appendChild(closeButton);

      // Phần còn lại của code giữ nguyên...
      // Container cho nội dung
      const contentContainer = document.createElement("div");
      Object.assign(contentContainer.style, {
        padding: "15px 20px",
        maxHeight: "70vh", // Giới hạn chiều cao tối đa
        overflowY: "auto", // Thêm thanh cuộn dọc
        overflowX: "hidden", // Ẩn thanh cuộn ngang
      });

      // Thêm CSS cho thanh cuộn
      const scrollbarStyle = document.createElement("style");
      scrollbarStyle.textContent = `
    .translator-content::-webkit-scrollbar {
      width: 8px;
    }
    .translator-content::-webkit-scrollbar-track {
      background: ${theme.background === "#222" ? "#333" : "#f1f1f1"};
      border-radius: 4px;
    }
    .translator-content::-webkit-scrollbar-thumb {
      background: ${theme.background === "#222" ? "#666" : "#888"};
      border-radius: 4px;
    }
    .translator-content::-webkit-scrollbar-thumb:hover {
      background: ${theme.background === "#222" ? "#888" : "#555"};
    }
  `;
      document.head.appendChild(scrollbarStyle);
      contentContainer.classList.add("translator-content");

      const cleanedText = translatedText.replace(/(\*\*)(.*?)\1/g, "<b>$2</b>");

      // Tạo container cho văn bản gốc và bản dịch
      const textContainer = document.createElement("div");
      Object.assign(textContainer.style, {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      });

      // Nếu có văn bản gốc và option hiển thị được bật
      if (displayOptions.showOriginalText && originalText) {
        const originalContainer = document.createElement("div");
        Object.assign(originalContainer.style, {
          color: theme.content,
          padding: "10px 15px",
          backgroundColor: `${theme.background === "#222" ? "#333" : "#f5f5f5"
            }`,
          borderRadius: "8px",
          border: `1px solid ${theme.border}`,
          wordBreak: "break-word", // Ngắt từ khi quá dài
        });

        originalContainer.innerHTML = `
      <div style="font-weight: 500; margin-bottom: 5px; color: ${theme.title};">Văn bản gốc:</div>
      <div style="line-height: 1.5;">${originalText}</div>
    `;
        textContainer.appendChild(originalContainer);
      }

      // Container cho bản dịch
      const translationContainer = document.createElement("div");
      Object.assign(translationContainer.style, {
        color: theme.content,
        padding: "10px 15px",
        backgroundColor: `${theme.background === "#222" ? "#333" : "#f5f5f5"}`,
        borderRadius: "8px",
        border: `1px solid ${theme.border}`,
        wordBreak: "break-word", // Ngắt từ khi quá dài
      });

      translationContainer.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 5px; color: ${theme.title
        };">Bản dịch:</div>
    <div style="line-height: 1.5;">${this.formatTranslation(cleanedText)}</div>
  `;
      textContainer.appendChild(translationContainer);

      contentContainer.appendChild(textContainer);
      popup.appendChild(dragHandle);
      popup.appendChild(contentContainer);

      // Cập nhật style cho popup
      Object.assign(popup.style, {
        ...popupStyle,
        maxHeight: "85vh", // Giới hạn chiều cao tối đa của toàn bộ popup
        display: "flex",
        flexDirection: "column",
      });

      this.makeDraggable(popup, dragHandle);
      document.body.appendChild(popup);
    }

    // Cập nhật phương thức makeDraggable
    makeDraggable(element, handle) {
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

      handle.onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        e.preventDefault();
        // Lấy vị trí con trỏ chuột khi bắt đầu
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Gọi hàm khi di chuyển con trỏ chuột
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e.preventDefault();
        // Tính toán vị trí mới của con trỏ chuột
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Thiết lập vị trí mới của phần tử
        element.style.top = element.offsetTop - pos2 + "px";
        element.style.left = element.offsetLeft - pos1 + "px";
      }

      function closeDragElement() {
        // Dừng di chuyển khi nhả chuột
        document.onmouseup = null;
        document.onmousemove = null;
      }
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

    handleTextSelection = debounce(() => {
      if (this.isTranslating) return;
      if (this.ignoreNextSelectionChange || this.isTranslating) {
        this.ignoreNextSelectionChange = false;
        return;
      }

      // Chỉ tạo nút dịch nếu tính năng được bật
      if (!this.translationButtonEnabled) return;

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
      button.style.top = `${rect.bottom + 20}px`;
      button.style.left = `${rect.left}px`;

      document.body.appendChild(button);
      this.currentTranslateButton = button;
      this.setupClickHandlers(selection);
    }

    handleTranslateButtonClick = async (selection, translateType) => {
      console.log("Starting translation process...");

      try {
        const selectedText = selection.toString().trim();
        console.log("Selected text:", selectedText);

        if (!selectedText) {
          console.log("No text selected");
          return;
        }

        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) {
          console.log("No target element found");
          return;
        }

        // Remove translate button first
        this.removeTranslateButton();

        // Show loading animation
        console.log("Showing loading animation...");
        this.showTranslatingStatus();

        console.log("Starting translation with type:", translateType);
        // Ensure we're using the correct context for this.translator
        if (!this.translator) {
          throw new Error("Translator instance not found");
        }

        // Call translate with appropriate parameters
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
            console.log("Unknown translation type:", translateType);
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

    debug(message) {
      console.log(`[UIManager] ${message}`);
    }

    showTranslatingStatus() {
      this.debug("Showing translating status");
      // Thêm CSS cho animation nếu chưa có
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
            border-top-color: #ddd;
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
      this.debug("Translation status shown");
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

    setupOCRButton() {
      // Kiểm tra xem đã có container OCR chưa
      if (document.querySelector(".translator-ocr-container")) {
        return;
      }

      const container = document.createElement("div");
      container.className = "translator-ocr-container";

      const button = document.createElement("button");
      button.className = "translator-ocr-button";
      button.innerHTML = `
      <span class="ocr-icon">📷</span>
      <span class="ocr-text">OCR</span>
    `;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      // Gán hàm xử lý cho file input
      this.handleOCRChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > CONFIG.OCR.maxFileSize) {
          this.showError("File quá lớn (tối đa 20MB)");
          return;
        }

        try {
          button.disabled = true;
          const processingIndicator = document.createElement("div");
          processingIndicator.className = "translator-processing-indicator";
          processingIndicator.textContent = `Đang xử lý: ${file.name}`;
          document.body.appendChild(processingIndicator);
          this.showTranslatingStatus();

          const result = await this.ocr.processImage(file);
          this.displayPopup(result, null, "Kết quả OCR");
        } catch (error) {
          this.showError(error.message);
        } finally {
          button.disabled = false;
          fileInput.value = "";
          this.removeTranslatingStatus();
          this.removeAllProcessingIndicators();
        }
      };

      fileInput.addEventListener("change", this.handleOCRChange);
      button.addEventListener("click", () => fileInput.click());

      container.appendChild(button);
      container.appendChild(fileInput);
      document.body.appendChild(container);

      GM_addStyle(`
      .translator-ocr-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: Arial, sans-serif;
      }

      .translator-ocr-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 15px;
        border: none;
        border-radius: 8px;
        background: #4a90e2;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      .translator-ocr-button:hover {
        transform: scale(1.05);
        background: #357abd;
      }

      .translator-processing-indicator {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 9999;
      }
    `);
    }

    setupMediaButton() {
      // Kiểm tra xem đã có container Media chưa
      if (document.querySelector(".translator-media-container")) {
        return;
      }

      const container = document.createElement("div");
      container.className = "translator-media-container";

      const button = document.createElement("button");
      button.className = "translator-media-button";
      button.innerHTML = `
      <span class="media-icon">🎵</span>
      <span class="media-text">Media</span>
    `;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*, audio/*, video/*";
      fileInput.style.display = "none";

      // Gán hàm xử lý cho file input
      this.handleMediaChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          button.disabled = true;
          const processingIndicator = document.createElement("div");
          processingIndicator.className = "translator-processing-indicator";
          processingIndicator.textContent = `Đang xử lý: ${file.name}`;
          document.body.appendChild(processingIndicator);
          this.translator.ui.showTranslatingStatus();

          await this.media.processMediaFile(file);
        } catch (error) {
          this.translator.ui.showError(error.message);
        } finally {
          button.disabled = false;
          fileInput.value = "";
          this.translator.ui.removeTranslatingStatus();
          this.removeAllProcessingIndicators();
        }
      };

      fileInput.addEventListener("change", this.handleMediaChange);
      button.addEventListener("click", () => fileInput.click());

      container.appendChild(button);
      container.appendChild(fileInput);
      document.body.appendChild(container);

      GM_addStyle(`
      .translator-media-container {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
      }

      .translator-media-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 15px;
        border: none;
        border-radius: 8px;
        background: #4a90e2;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      .translator-media-button:hover {
        transform: scale(1.05);
        background: #357abd;
      }

      .translator-processing-indicator {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 9999;
      }
    `);
    }

    handleOCRStateChange(enabled) {
      if (enabled) {
        if (!this.translator.userSettings.settings.ocrOptions.enabled) return;
        this.setupOCRButton();
      } else {
        const containers = document.querySelectorAll(
          ".translator-ocr-container",
        );
        containers.forEach((container) => container.remove());

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.removeEventListener("change", this.handleOCRChange);
        }
      }
    }

    handleMediaStateChange(enabled) {
      if (enabled) {
        if (!this.translator.userSettings.settings.mediaOptions.enabled) return;
        this.setupMediaButton();
      } else {
        const containers = document.querySelectorAll(
          ".translator-media-container",
        );
        containers.forEach((container) => container.remove());

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.removeEventListener("change", this.handleMediaChange);
        }
      }
    }

    handleSettingsShortcut(e) {
      if (!this.translator.userSettings.settings.shortcuts?.settingsEnabled)
        return;

      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const settingsUI = this.translator.userSettings.createSettingsUI();
        document.body.appendChild(settingsUI);
      }
    }

    async handleTranslationShortcuts(e) {
      if (!this.translator.userSettings.settings.shortcuts?.enabled) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selectedText || this.isTranslating) return;

      const targetElement = selection.anchorNode?.parentElement;
      if (!targetElement) return;
      const shortcuts = this.translator.userSettings.settings.shortcuts;

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
          await this.handleTranslateButtonClick(selection, translateType);
        }
      }
    }

    updateSettingsListener(enabled) {
      if (enabled) {
        document.addEventListener("keydown", this.settingsShortcutListener);
      } else {
        document.removeEventListener("keydown", this.settingsShortcutListener);
      }
    }

    updateSettingsTranslationListeners(enabled) {
      if (enabled) {
        document.addEventListener("keydown", this.translationShortcutListener);
      } else {
        document.removeEventListener(
          "keydown",
          this.translationShortcutListener,
        );
      }
    }

    updateSelectionListeners(enabled) {
      if (enabled) {
        document.addEventListener("mouseup", this.mouseupButtonListener);
        document.addEventListener(
          "selectionchange",
          this.selectionButtonListener,
        );
      } else {
        document.removeEventListener("mouseup", this.mouseupButtonListener);
        document.removeEventListener(
          "selectionchange",
          this.selectionButtonListener,
        );
      }
    }

    updateTapListeners(enabled) {
      if (enabled) this.setupDocumentTapHandler();
    }

    setupEventListeners() {
      // Khởi tạo trạng thái ban đầu của các listeners
      const ocrOptions = this.translator.userSettings.settings.ocrOptions;
      const mediaOptions = this.translator.userSettings.settings.mediaOptions;
      const shortcuts = this.translator.userSettings.settings.shortcuts;
      const clickOptions = this.translator.userSettings.settings.clickOptions;
      const touchOptions = this.translator.userSettings.settings.touchOptions;

      if (ocrOptions?.enabled) {
        this.handleOCRStateChange(true);
      }

      if (mediaOptions?.enabled) {
        this.handleMediaStateChange(true);
      }

      // Khởi tạo shortcuts
      if (shortcuts?.settingsEnabled) {
        this.updateSettingsListener(true);
      }

      if (shortcuts?.enabled) {
        this.updateSettingsTranslationListeners(true);
      }

      // Khởi tạo translation button listeners nếu được bật
      if (clickOptions?.enabled) {
        this.updateSelectionListeners(true);
        this.translationButtonEnabled = true;
      }

      if (touchOptions?.enabled) {
        this.updateTapListeners(true);
        this.translationTapEnabled = true;
      }

      // Lắng nghe sự kiện settings thay đổi
      document.addEventListener("settingsChanged", (e) => {
        const newSettings = e.detail;

        this.handleOCRStateChange(newSettings.ocrOptions?.enabled);
        this.handleMediaStateChange(newSettings.mediaOptions?.enabled);

        // Cập nhật shortcuts
        this.updateSettingsListener(newSettings.shortcuts?.settingsEnabled);
        this.updateSettingsTranslationListeners(newSettings.shortcuts?.enabled);

        // Cập nhật translation button
        if (newSettings.clickOptions?.enabled !== undefined) {
          this.translationButtonEnabled = newSettings.clickOptions.enabled;
          this.updateSelectionListeners(newSettings.clickOptions.enabled);

          // Xóa nút dịch hiện tại nếu tính năng bị tắt
          if (!newSettings.clickOptions.enabled) {
            this.removeTranslateButton();
          }
        }

        if (newSettings.touchOptions?.enabled !== undefined) {
          this.translationTapEnabled = newSettings.touchOptions.enabled;
          this.updateTapListeners(newSettings.touchOptions.enabled);

          // Xóa nút dịch hiện tại nếu tính năng bị tắt
          if (!newSettings.touchOptions.enabled) {
            this.removeTranslateButton();
          }
        }

        this.cache = new TranslationCache(
          newSettings.cacheOptions.text.maxSize,
          newSettings.cacheOptions.text.expirationTime,
        );

        this.cache.clear();
        if (this.ocr?.imageCache) {
          this.ocr.imageCache.clear();
        }

        // Khởi tạo lại API config
        const apiConfig = {
          providers: CONFIG.API.providers,
          currentProvider: newSettings.apiProvider,
          apiKey: newSettings.apiKey,
          maxRetries: CONFIG.API.maxRetries,
          retryDelay: CONFIG.API.retryDelay,
        };
        this.api = new APIManager(apiConfig);

        this.handleOCRStateChange(newSettings.ocrOptions?.enabled);
        this.handleMediaStateChange(newSettings.ocrOptions?.enabled);
      });
    }

    showError(message, duration = 3000) {
      // const theme = CONFIG.THEME[CONFIG.THEME.mode];
      const errorDiv = document.createElement("div");
      errorDiv.className = "ocr-error";
      errorDiv.textContent = message;

      Object.assign(errorDiv.style, {
        position: "fixed",
        bottom: "80px",
        right: "20px",
        backgroundColor: "rgba(220, 53, 69, 0.9)",
        color: "white",
        padding: "12px 20px",
        borderRadius: "8px",
        fontSize: "14px",
        zIndex: "9999",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        animation: "fadeIn 0.3s ease",
      });

      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), duration);
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

    removeAllProcessingIndicators() {
      const indicators = document.querySelectorAll(
        ".translator-processing-indicator",
      );
      indicators.forEach((indicator) => {
        if (indicator && indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      });
    }
  }

  class MediaManager {
    constructor(translator) {
      this.translator = translator;
      this.isProcessing = false;
      this.mediaCache = new MediaCache();
    }

    async processMediaFile(file) {
      if (this.isProcessing) {
        throw new Error("Đang xử lý media khác, vui lòng đợi");
      }
      if (!this.isValidFormat(file)) {
        throw new Error("Định dạng file không được hỗ trợ");
      }
      if (!this.isValidSize(file)) {
        throw new Error(`File quá lớn (tối đa ${this.getMaxSizeInMB(file)}MB)`);
      }

      try {
        this.isProcessing = true;
        console.log("Processing file:", file.name, file.type);
        const base64Media = await this.fileToBase64(file);

        // Kiểm tra cache nếu được bật
        if (
          this.mediaCache &&
          this.translator.userSettings.settings.cacheOptions.media?.enabled
        ) {
          const cachedResult = await this.mediaCache.get(base64Media);
          if (cachedResult) {
            console.log("Returning cached result");
            this.translator.ui.displayPopup(cachedResult, null, "Bản dịch");
            return;
          }
        }

        const mediaSettings =
          this.translator.userSettings.settings.mediaOptions;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: "Đây là nội dung audio/video. Chỉ cần nghe thôi nên hãy lắng nghe thật kĩ và dịch sang tiếng Việt thật tự nhiên, đảm bảo truyền tải đúng ý nghĩa và ngữ cảnh của đoạn thoại thật chuẩn. Chỉ trả về bản dịch, không cần giải thích thêm.",
                },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64Media,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: mediaSettings.temperature,
            topP: mediaSettings.topP,
            topK: mediaSettings.topK,
          },
        };

        console.log("Making API request...");
        const response = await new Promise((resolve, reject) => {
          const selectedModel = this.translator.api.getGeminiModel();

          GM_xmlhttpRequest({
            method: "POST",
            url: `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${this.translator.userSettings.settings.apiKey.gemini}`,
            headers: {
              "Content-Type": "application/json",
            },
            data: JSON.stringify(requestBody),
            onload: (response) => {
              console.log("API response received:", response.status);
              if (response.status === 200) {
                try {
                  const result = JSON.parse(response.responseText);
                  console.log("API result:", result);
                  if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    resolve(result.candidates[0].content.parts[0].text);
                  } else {
                    reject(new Error("Không thể đọc kết quả từ API"));
                  }
                } catch (error) {
                  console.error("Parse error:", error);
                  reject(new Error("Không thể parse kết quả API"));
                }
              } else {
                console.error("API error:", response.responseText);
                reject(new Error(`API Error: ${response.status}`));
              }
            },
            onerror: (error) => {
              console.error("Connection error:", error);
              reject(new Error(`Lỗi kết nối: ${error}`));
            },
          });
        });

        console.log("API response processed");
        this.translator.ui.displayPopup(response, null, "Bản dịch");

        // Lưu cache nếu được bật
        if (
          this.mediaCache &&
          this.translator.userSettings.settings.cacheOptions.media?.enabled
        ) {
          await this.mediaCache.set(base64Media, response);
        }
      } catch (error) {
        console.error("Process error:", error);
        throw new Error(`Không thể xử lý file: ${error.message}`);
      } finally {
        this.isProcessing = false;
      }
    }

    isValidFormat(file) {
      // Lấy extension từ tên file
      const extension = file.name.split(".").pop().toLowerCase();

      // Mapping các extension phổ biến với MIME types
      const mimeMapping = {
        // Audio
        mp3: "audio/mp3",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/m4a",
        aac: "audio/aac",
        flac: "audio/flac",
        wma: "audio/wma",
        opus: "audio/opus",
        amr: "audio/amr",
        midi: "audio/midi",
        mid: "audio/midi",

        // Video
        mp4: "video/mp4",
        webm: "video/webm",
        ogv: "video/ogg",
        avi: "video/x-msvideo",
        mov: "video/quicktime",
        wmv: "video/x-ms-wmv",
        flv: "video/x-flv",
        "3gp": "video/3gpp",
        "3g2": "video/3gpp2",
        mkv: "video/x-matroska",
      };

      // Lấy MIME type từ extension
      const mimeType = mimeMapping[extension];

      // Kiểm tra nếu là audio
      if (mimeType?.startsWith("audio/")) {
        return CONFIG.MEDIA.audio.supportedFormats.includes(mimeType);
      }
      // Kiểm tra nếu là video
      else if (mimeType?.startsWith("video/")) {
        return CONFIG.MEDIA.video.supportedFormats.includes(mimeType);
      }

      return false;
    }

    isValidSize(file) {
      const maxSize = file.type.startsWith("audio/")
        ? CONFIG.MEDIA.audio.maxSize
        : CONFIG.MEDIA.video.maxSize;
      return file.size <= maxSize;
    }

    getMaxSizeInMB(file) {
      const maxSize = file.type.startsWith("audio/")
        ? CONFIG.MEDIA.audio.maxSize
        : CONFIG.MEDIA.video.maxSize;
      return Math.floor(maxSize / (1024 * 1024));
    }

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.readAsDataURL(file);
      });
    }
  }

  class Translator {
    constructor() {
      window.translator = this;
      this.userSettings = new UserSettings();
      this.cache = new TranslationCache(
        this.userSettings.settings.cacheOptions.text.maxSize,
        this.userSettings.settings.cacheOptions.text.expirationTime,
      );
      const apiConfig = {
        ...CONFIG.API,
        currentProvider: this.userSettings.getSetting("apiProvider"),
        apiKey: this.userSettings.getSetting("apiKey"),
      };
      this.api = new APIManager(apiConfig, () => this.userSettings.settings);
      this.ui = new UIManager(this);
      this.ui.setupEventListeners();
    }

    async translate(
      text,
      targetElement,
      isAdvanced = false,
      displaySimple = false,
    ) {
      if (!text) return;

      try {
        const prompt = this.createPrompt(text, isAdvanced);
        let translatedText;

        // Kiểm tra trạng thái enabled trước khi sử dụng cache
        const cacheEnabled =
          this.userSettings.settings.cacheOptions.text.enabled;

        if (cacheEnabled) {
          translatedText = this.cache.get(text, isAdvanced);
        }

        if (!translatedText) {
          translatedText = await this.api.request(prompt);

          // Chỉ lưu cache khi tính năng được bật
          if (cacheEnabled && translatedText) {
            this.cache.set(text, translatedText, isAdvanced);
          }
        }

        if (translatedText) {
          if (isAdvanced || displaySimple) {
            this.ui.displayPopup(translatedText, text);
          } else {
            this.ui.showTranslationBelow(targetElement, translatedText);
          }
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

    showSettingsUI() {
      const settingsUI = this.userSettings.createSettingsUI();
      document.body.appendChild(settingsUI);
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
