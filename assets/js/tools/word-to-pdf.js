renderToolHeader("word-to-pdf", "Best-effort DOCX → PDF conversion, rendered entirely in your browser.");

// Basic readable styling for the converted DOCX content (mammoth output is
// mostly unstyled semantic HTML — headings/tables/lists need this to look
// clean rather than run together).
if(!document.getElementById("docxPreviewStyles")){
  const style = document.createElement("style");
  style.id = "docxPreviewStyles";
  style.textContent = `
    .docx-preview h1,.docx-preview h2,.docx-preview h3{margin:1.1em 0 .5em;line-height:1.3;font-weight:700}
    .docx-preview h1{font-size:1.6em} .docx-preview h2{font-size:1.35em} .docx-preview h3{font-size:1.15em}
    .docx-preview p{margin:0 0 .9em}
    .docx-preview ul,.docx-preview ol{margin:0 0 .9em;padding-left:1.4em}
    .docx-preview li{margin-bottom:.3em}
    .docx-preview table{border-collapse:collapse;width:100%;margin:0 0 1em}
    .docx-preview td,.docx-preview th{border:1px solid #ccc;padding:6px 10px;font-size:.92em;vertical-align:top}
    .docx-preview img{max-width:100%;height:auto}
    .docx-preview a{color:var(--brand)}
  `;
  document.head.appendChild(style);
}

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const previewStage = document.getElementById("previewStage");
const actionsRow = document.getElementById("actionsRow");
const stage = document.getElementById("stage");
let renderNode = null;
let fileName = "document";

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  if(!file.name.toLowerCase().endsWith(".docx")){ toast("Please choose a .docx file"); return; }
  fileName = file.name.replace(/\.docx$/i,"");
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${bytesToSize(file.size)} — converting…</p>`;

  const arrayBuffer = await fileToArrayBuffer(file);
  const result = await mammoth.convertToHtml({ arrayBuffer });

  // Render in a plain block container (not flex) — html2canvas measures
  // flex-centered children unreliably, which was causing overlapping /
  // "broken" looking text in the exported PDF.
  previewStage.style.display = "block";
  previewStage.style.textAlign = "center";
  previewStage.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "docx-preview";
  wrap.style.cssText = "background:#fff;width:700px;max-width:100%;margin:0 auto;padding:56px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#222;box-shadow:var(--shadow-md);border-radius:4px;text-align:left;word-wrap:break-word;overflow-wrap:break-word;box-sizing:border-box";
  wrap.innerHTML = result.value;
  previewStage.appendChild(wrap);
  renderNode = wrap;
  actionsRow.style.display = "flex";

  if(result.messages && result.messages.length){
    console.log("mammoth conversion notes:", result.messages);
  }
}

document.getElementById("exportBtn").addEventListener("click", async ()=>{
  if(!renderNode){ toast("Upload a .docx file first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"capture",label:"Rendering document"},{key:"finalize",label:"Finalizing PDF"}]);
  ui.set("capture","active");

  const blob = await nodeToPdfBlob(renderNode, {pageSize:"a4", orientation:"portrait"}, pct=>ui.progress(pct));
  ui.set("capture","done"); ui.set("finalize","done"); ui.progress(100);

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>PDF ready</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}.pdf`));
});
