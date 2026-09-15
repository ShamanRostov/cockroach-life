async function post(url) {
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const out = document.getElementById("pipeOut");

document.getElementById("runForecast")?.addEventListener("click", async () => {
  out.textContent = "Считаем прогноз…";
  try {
    await post("/api/forecast/run");
    location.reload();
  } catch (err) {
    out.textContent = String(err);
  }
});

document.querySelectorAll("button[data-api]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    out.textContent = `Запрос ${btn.dataset.api}…`;
    try {
      const data = await post(btn.dataset.api);
      out.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      out.textContent = String(err);
    }
  });
});
