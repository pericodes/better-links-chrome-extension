window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data.id !== "string" || typeof data.code !== "string") return;
  try {
    const fn = new Function("text", data.code);
    const result = fn(data.text);
    let text = "";
    if (typeof result === "string") text = result;
    else if (result && typeof result === "object" && typeof result.text === "string") text = result.text;
    event.source.postMessage({ id: data.id, text: text }, "*");
  } catch (error) {
    event.source.postMessage({ id: data.id, error: true }, "*");
  }
});
