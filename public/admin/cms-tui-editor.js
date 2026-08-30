/**
 * Decap CMS custom widget: Toast UI Editor
 * Registers as widget name "tui-markdown".
 * Image uploads go through hanjeon R2 endpoint POST /api/media.
 */
(function () {
  var UPLOAD_URL = "/api/media";
  var MAX_WIDTH = 800;
  var JPEG_QUALITY = 0.8;

  function compressImage(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return Promise.resolve(file);
    }
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      return Promise.resolve(file);
    }

    return new Promise(function (resolve) {
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var width = img.naturalWidth;
        var height = img.naturalHeight;
        if (!width || !height) {
          resolve(file);
          return;
        }
        var scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
        if (scale === 1 && file.size < 300 * 1024) {
          resolve(file);
          return;
        }
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob(
          function (blob) {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            var ext = outputType === "image/png" ? ".png" : ".jpg";
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, "") + ext, {
                type: outputType,
                lastModified: Date.now(),
              }),
            );
          },
          outputType,
          outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  function uploadImage(file) {
    return compressImage(file).then(function (compressed) {
      var form = new FormData();
      form.append("file", compressed, compressed.name || "image.png");
      return fetch(UPLOAD_URL, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || "HTTP " + response.status);
          });
        }
        return response.json().then(function (data) {
          if (!data || !data.url) throw new Error("업로드 응답에 url이 없습니다.");
          return data.url;
        });
      });
    });
  }

  function getEditorCtor() {
    if (window.toastui && window.toastui.Editor) return window.toastui.Editor;
    if (window.Editor) return window.Editor;
    return null;
  }

  var TuiMarkdownControl = createClass({
    getInitialState: function () {
      return { ready: false, error: "" };
    },

    componentDidMount: function () {
      var self = this;
      var Editor = getEditorCtor();
      if (!Editor) {
        this.setState({
          error: "Toast UI Editor를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        });
        return;
      }

      var initial = typeof this.props.value === "string" ? this.props.value : "";
      var height = (this.props.field && this.props.field.get("height")) || "420px";
      var initialEditType =
        (this.props.field && this.props.field.get("initial_edit_type")) || "wysiwyg";
      var previewStyle =
        (this.props.field && this.props.field.get("preview_style")) || "tab";

      try {
        this._editor = new Editor({
          el: this._mountEl,
          height: String(height),
          initialEditType: String(initialEditType),
          previewStyle: String(previewStyle),
          initialValue: initial,
          usageStatistics: false,
          language: "ko-KR",
          placeholder: "본문을 작성하세요…",
          toolbarItems: [
            ["heading", "bold", "italic", "strike"],
            ["hr", "quote"],
            ["ul", "ol", "task", "indent", "outdent"],
            ["table", "image", "link"],
            ["code", "codeblock"],
            ["scrollSync"],
          ],
          hooks: {
            addImageBlobHook: function (blob, callback) {
              var file =
                blob instanceof File
                  ? blob
                  : new File([blob], "image.png", {
                      type: blob.type || "image/png",
                    });
              uploadImage(file)
                .then(function (url) {
                  callback(url, "image");
                })
                .catch(function (err) {
                  alert("이미지 업로드 실패: " + (err && err.message ? err.message : err));
                });
              return false;
            },
          },
          events: {
            change: function () {
              if (!self._editor || self._applyingExternal) return;
              var md = self._editor.getMarkdown();
              self._lastEmitted = md;
              self.props.onChange(md);
            },
          },
        });
        this._lastEmitted = initial;
        this.setState({ ready: true });
      } catch (err) {
        this.setState({
          error: "에디터 초기화 실패: " + (err && err.message ? err.message : String(err)),
        });
      }
    },

    componentDidUpdate: function (prevProps) {
      if (!this._editor) return;
      var next = typeof this.props.value === "string" ? this.props.value : "";
      var prev = typeof prevProps.value === "string" ? prevProps.value : "";
      if (next === prev) return;
      if (next === this._lastEmitted) return;
      this._applyingExternal = true;
      try {
        this._editor.setMarkdown(next, false);
        this._lastEmitted = next;
      } finally {
        this._applyingExternal = false;
      }
    },

    componentWillUnmount: function () {
      if (this._editor) {
        try {
          this._editor.destroy();
        } catch (e) {
          /* ignore */
        }
        this._editor = null;
      }
    },

    isValid: function () {
      if (!this.props.field || this.props.field.get("required") === false) {
        return true;
      }
      var value =
        this._editor && typeof this._editor.getMarkdown === "function"
          ? this._editor.getMarkdown()
          : this.props.value;
      if (!value || !String(value).trim()) {
        return { error: { message: "본문을 입력해 주세요." } };
      }
      return true;
    },

    render: function () {
      var self = this;
      return h(
        "div",
        {
          id: this.props.forID,
          className: (this.props.classNameWrapper || "") + " cms-tui-editor-wrap",
        },
        this.state.error
          ? h("p", { className: "cms-tui-editor-error" }, this.state.error)
          : null,
        h("div", {
          className: "cms-tui-editor",
          ref: function (el) {
            self._mountEl = el;
          },
        }),
      );
    },
  });

  var TuiMarkdownPreview = createClass({
    render: function () {
      var value = this.props.value || "";
      return h(
        "div",
        { className: "cms-tui-preview" },
        h("pre", { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } }, value),
      );
    },
  });

  window.TuiMarkdownControl = TuiMarkdownControl;
  window.TuiMarkdownPreview = TuiMarkdownPreview;

  if (window.CMS && typeof CMS.registerWidget === "function") {
    CMS.registerWidget("tui-markdown", TuiMarkdownControl, TuiMarkdownPreview);
  }
})();
