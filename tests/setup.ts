import "@testing-library/jest-dom/vitest";
if (!globalThis.CSS)
  Object.defineProperty(globalThis, "CSS", {
    value: {
      escape: (value: string) =>
        value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`),
    },
  });
if (!Blob.prototype.arrayBuffer)
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
