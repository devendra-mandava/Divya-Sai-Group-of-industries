import { useState, useRef, useCallback, useEffect } from "react";
import html2pdf from "html2pdf.js";

const LOGO_GROUP = "/DSGILogo.jpg";
const LOGO_ENTERPRISES = "/EnterprisesLogo.jpg";
const SIGNATURE = "/Signature.png";

const COMPANIES = {
  group: {
    name: "Divya Sai Group of Industries",
    address: "7-137, Kolavennu, Kankipadu(M), Krishna Dist - 521245, Vijayawada, Andhra Pradesh",
    gstin: "37AYUPM5278J1ZG",
    mobile: "9440258716",
    email: "",
    bankName: "DIVYA SAI GROUP OF INDUSTRIES",
    bankIfsc: "CNRB0013355",
    bankAccount: "120034642027",
    bankBranch: "Canara Bank, KANURU",
    upi: "202720258716@cnrb",
    logo: LOGO_GROUP,
    defaultGst: 18,
    gstRequired: true,
    docTypes: ["Invoice", "Quotation", "Dummy Bill"],
  },
  enterprises: {
    name: "Divya Sai Enterprises",
    address: "74-29/1-2, Santhi Street, Ayyappa Nagar, Vijayawada - 520007, Andhra Pradesh",
    gstin: "",
    mobile: "9440258716",
    email: "infodivyasaigroup@gmail.com",
    bankName: "DIVYA SAI ENTERPRISES",
    bankIfsc: "CNRB0013355",
    bankAccount: "120036690297",
    bankBranch: "Canara Bank, Kanuru Branch",
    upi: "202720258716@cnrb",
    logo: LOGO_ENTERPRISES,
    defaultGst: 0,
    gstRequired: false,
    docTypes: ["Invoice", "Quotation"],
  },
};

const ITEMS_CATALOG = [
  { id: "ip60", name: "Interlocking Pavers 60mm", hsn: "7016", type: "tile" },
  { id: "ip80", name: "Interlocking Pavers 80mm", hsn: "7016", type: "tile" },
  { id: "pt25", name: "Parking Tiles 25mm", hsn: "7016", type: "tile" },
  { id: "sch", name: "SetSure Concrete Hardener", hsn: "", type: "other" },
  { id: "ks", name: "Kerb Stones", hsn: "", type: "other" },
];

const PREDEFINED_NOTES = [
  "Sand, vibrator, and civil works are to be arranged by the customer at the work site. Our scope covers only the tile supply and laying work.",
  "Civil works and sand filling are within your scope.",
];

const toWords = (num) => {
  if (num === 0) return "Zero Rupees";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const scales = ["","Thousand","Lakh","Crore"];
  const convert = (n) => {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n/10)] + " " + (n%10 ? ones[n%10] + " " : "");
    return ones[Math.floor(n/100)] + " Hundred " + convert(n%100);
  };
  let result = "";
  const groups = [];
  groups.push(num % 1000); num = Math.floor(num/1000);
  while (num > 0) { groups.push(num % 100); num = Math.floor(num/100); }
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i]) result += convert(groups[i]) + scales[i] + " ";
  }
  return result.trim() + " Rupees";
};

const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmt = (n) => {
  if (n == null) return "0";
  return Number(n).toLocaleString("en-IN");
};

const MM_TO_PX = 3.7795275591;
const PRINT_CONTENT_HEIGHT_MM = 277;
const PRINT_CONTENT_HEIGHT_PX = PRINT_CONTENT_HEIGHT_MM * MM_TO_PX;
const EMPTY_ROW_HEIGHT_PX = 24;

function Landing({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:800, width:"100%", textAlign:"center" }}>
        <h1 style={{ color:"#e0e0e0", fontSize:16, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>Business Document Platform</h1>
        <h2 style={{ color:"#fff", fontSize:28, fontWeight:700, marginBottom:40 }}>Select Company & Document Type</h2>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center" }}>
          {Object.entries(COMPANIES).map(([key, co]) => (
            <div key={key} style={{ background:"rgba(255,255,255,0.07)", backdropFilter:"blur(10px)", borderRadius:16, padding:28, width:340, border:"1px solid rgba(255,255,255,0.12)", textAlign:"center" }}>
              <div style={{ width:80, height:80, borderRadius:12, background:"#fff", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                <img src={co.logo} alt="" style={{ width:70, height:70, objectFit:"contain" }} />
              </div>
              <h3 style={{ color:"#fff", fontSize:17, fontWeight:600, marginBottom:20, lineHeight:1.3 }}>{co.name}</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {co.docTypes.map(dt => (
                  <button key={dt} onClick={() => onSelect(key, dt)} style={{ padding:"12px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#e94560,#c23152)", color:"#fff", fontSize:15, fontWeight:600, cursor:"pointer", transition:"transform 0.15s" }}
                    onMouseOver={e => e.target.style.transform="scale(1.03)"}
                    onMouseOut={e => e.target.style.transform="scale(1)"}
                  >{dt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current, steps }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:24, overflowX:"auto", paddingBottom:8 }}>
      {steps.map((s,i) => (
        <div key={i} style={{ flex:1, minWidth:80, textAlign:"center" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background: i <= current ? "#c23152" : "#e0e0e0", color: i <= current ? "#fff" : "#888", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 4px", fontSize:13, fontWeight:700 }}>{i+1}</div>
          <div style={{ fontSize:11, color: i <= current ? "#c23152" : "#999", fontWeight: i===current ? 700 : 400 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:4 }}>{label}{required && <span style={{color:"#c23152"}}> *</span>}</label>
      {children}
    </div>
  );
}

const inputStyle = { width:"100%", padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:14, boxSizing:"border-box", outline:"none" };
const btnPrimary = { padding:"12px 28px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#c23152,#e94560)", color:"#fff", fontSize:15, fontWeight:600, cursor:"pointer" };
const btnSecondary = { padding:"12px 28px", border:"1px solid #d1d5db", borderRadius:10, background:"#fff", color:"#374151", fontSize:15, fontWeight:500, cursor:"pointer" };

export default function App() {
  const [view, setView] = useState("landing");
  const [companyKey, setCompanyKey] = useState(null);
  const [docType, setDocType] = useState(null);
  const [step, setStep] = useState(0);

  // Party
  const [party, setParty] = useState({ name:"", phone:"", address:"", gst:"", shipAddress:"", sameAsBilling:true });
  // Basic
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [docNumber, setDocNumber] = useState("");
  // Items
  const [items, setItems] = useState([{ catalogId:"ip60", description:"Ex-Factory", qty:"", unit:"SQF", rate:"" }]);
  // Additional
  const [extras, setExtras] = useState({ transport:false, transportMode:"direct", transportAmt:"", transportTons:"", transportRate:"",
    laying:false, layingSqft:"", layingRate:"",
    loading:false, loadingRate:"" });
  // Tax
  const [gstPercent, setGstPercent] = useState(18);
  const [applyGst, setApplyGst] = useState(true);
  // Notes
  const [notes, setNotes] = useState("");
  const [selectedPredefined, setSelectedPredefined] = useState([]);
  const [emptyRowCount, setEmptyRowCount] = useState(0);

  const pageRef = useRef();

  const company = companyKey ? COMPANIES[companyKey] : null;

  const handleSelect = (ck, dt) => {
    setCompanyKey(ck);
    setDocType(dt);
    setGstPercent(COMPANIES[ck].defaultGst);
    setApplyGst(COMPANIES[ck].gstRequired);
    setView("form");
    setStep(0);
  };

  const stepLabels = docType === "Invoice"
    ? ["Party","Details","Items","Extras","Tax","Notes","Preview"]
    : ["Party","Details","Items","Extras","Tax","Notes","Preview"];

  const updateParty = (k,v) => setParty(p => ({...p, [k]:v}));
  const updateExtras = (k,v) => setExtras(e => ({...e, [k]:v}));

  // Calculations
  const calcItems = items.map(it => {
    const cat = ITEMS_CATALOG.find(c => c.id === it.catalogId) || {};
    const q = parseFloat(it.qty) || 0;
    const r = parseFloat(it.rate) || 0;
    const taxable = q * r;
    return { ...it, ...cat, qty: q, rate: r, taxable };
  });

  const totalTaxableItems = calcItems.reduce((s,i) => s + i.taxable, 0);
  const totalQty = calcItems.reduce((s,i) => s + i.qty, 0);

  let transportAmt = 0;
  if (extras.transport) {
    if (extras.transportMode === "direct") transportAmt = parseFloat(extras.transportAmt) || 0;
    else transportAmt = (parseFloat(extras.transportTons)||0) * (parseFloat(extras.transportRate)||0);
  }
  let layingAmt = 0;
  if (extras.laying) layingAmt = (parseFloat(extras.layingSqft)||0) * (parseFloat(extras.layingRate)||0);
  let loadingAmt = 0;
  if (extras.loading) loadingAmt = totalQty * (parseFloat(extras.loadingRate)||0);

  const taxableValue = totalTaxableItems;
  const gstRate = applyGst ? (parseFloat(gstPercent)||0) : 0;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmt = Math.round(taxableValue * cgstRate / 100);
  const sgstAmt = Math.round(taxableValue * sgstRate / 100);
  const totalTax = cgstAmt + sgstAmt;
  const grandTotal = taxableValue + totalTax + transportAmt + layingAmt + loadingAmt;
  const allNotes = [
    ...selectedPredefined.map(i => PREDEFINED_NOTES[i]),
    ...(notes ? [notes] : [])
  ].join("\n");
  const shipAddr = party.sameAsBilling ? party.address : party.shipAddress;

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const frame = window.requestAnimationFrame(() => {
      const baseHeight = page.scrollHeight - emptyRowCount * EMPTY_ROW_HEIGHT_PX;
      const remainingSpace = PRINT_CONTENT_HEIGHT_PX - baseHeight;
      let nextCount = remainingSpace > 0 ? Math.floor(remainingSpace / EMPTY_ROW_HEIGHT_PX) : 0;

      while (nextCount > 0 && baseHeight + nextCount * EMPTY_ROW_HEIGHT_PX > PRINT_CONTENT_HEIGHT_PX) {
        nextCount -= 1;
      }

      if (nextCount !== emptyRowCount) {
        setEmptyRowCount(nextCount);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    emptyRowCount,
    calcItems.length,
    transportAmt,
    layingAmt,
    loadingAmt,
    gstRate,
    docType,
    party.name,
    party.address,
    party.phone,
    shipAddr,
    allNotes,
    vehicleNo,
    docNumber,
    docDate,
    dueDate,
  ]);

  const invoiceCSS = `
    .inv-doc { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
    .inv-page { width: 190mm; margin: 0 auto; background: #fff; }
    .inv-doc table { width:100%; border-collapse:collapse; }
    .inv-doc td, .inv-doc th { border:1px solid #999; padding:5px 8px; text-align:left; vertical-align:top; }
    .inv-doc th { background:#f8f0f2; font-weight:600; color:#5a1a2a; }
    .inv-doc .no-border td, .inv-doc .no-border th { border:none; padding:2px 4px; }
    .inv-doc .text-right { text-align:right; }
    .inv-doc .text-center { text-align:center; }
    .inv-doc .bold { font-weight:700; }
    .inv-doc .amount-cell { text-align:right; white-space:nowrap; }
    .inv-doc .header-right td { border:1px solid #999; padding:4px 8px; }
    .inv-doc .header-right .label { font-weight:600; font-size:10px; color:#5a1a2a; }
    .inv-doc .header-right .value { font-size:11px; }
    .inv-doc .empty-row td { height:22px; }
    .inv-doc .doc-type-bar { background:#7B1A2C; color:#fff; padding:6px 12px; font-weight:700; font-size:12px; }
    .inv-doc .doc-type-bar .original-badge { border:1px solid #fff; padding:2px 10px; font-size:10px; font-weight:600; color:#fff; float:right; margin-top:1px; }
    .inv-doc .total-row td { background:#f8f0f2; font-weight:700; }
    .inv-doc .company-name { font-weight:700; font-size:14px; color:#7B1A2C; margin-bottom:2px; }
    .inv-doc .section-label { font-weight:700; font-size:10px; color:#7B1A2C; margin-bottom:4px; }
    .inv-doc .bill-header { background:#7B1A2C; color:#fff; font-weight:700; font-size:10px; padding:3px 8px; }
    .inv-doc .amt-words { border:1px solid #999; padding:8px; background:#fdf8f9; }
    .inv-doc .footer-heading { font-weight:700; color:#7B1A2C; font-size:11px; margin-bottom:4px; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .print-root { padding: 0; }
    }
    @page { size:A4; margin:10mm; }
  `;

  const handleDownloadPdf = useCallback(async () => {
    const content = pageRef.current;
    if (!content) return;

    const safePartyName = (party.name || "customer")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const fileLabel = (docType || "document").replace(/\s+/g, "-").toLowerCase();
    const filename = `${fileLabel}-${safePartyName || "customer"}-${docDate || "download"}.pdf`;

    const options = {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: {
        mode: ["css", "legacy"],
      },
    };

    await html2pdf().set(options).from(content).save();
  }, [docDate, docType, party.name]);

  if (view === "landing") return <Landing onSelect={handleSelect} />;

  const docLabel = docType === "Dummy Bill" ? "Invoice" : docType;
  const dateLabel = docType === "Quotation" ? "Quotation Date" : "Invoice Date";
  const numLabel = docType === "Quotation" ? "Quotation No." : "Invoice No.";
  const dueDateLabel = docType === "Quotation" ? "Expiry Date" : "Due Date";

  const parsedDate = docDate ? new Date(docDate + "T00:00:00") : new Date();
  const parsedDue = dueDate ? new Date(dueDate + "T00:00:00") : null;

  // Form Steps
  const renderStep = () => {
    switch(step) {
      case 0: // Party
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Customer Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <FormField label="Name" required><input style={inputStyle} value={party.name} onChange={e => updateParty("name",e.target.value)} placeholder="Customer name" /></FormField>
              <FormField label="Phone"><input style={inputStyle} value={party.phone} onChange={e => updateParty("phone",e.target.value)} placeholder="Phone number" /></FormField>
            </div>
            <FormField label="Billing Address" required><textarea style={{...inputStyle, minHeight:60}} value={party.address} onChange={e => updateParty("address",e.target.value)} placeholder="Full address" /></FormField>
            <FormField label="GST (Optional)"><input style={inputStyle} value={party.gst} onChange={e => updateParty("gst",e.target.value)} placeholder="GSTIN" /></FormField>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <input type="checkbox" checked={party.sameAsBilling} onChange={e => updateParty("sameAsBilling",e.target.checked)} id="sab" />
              <label htmlFor="sab" style={{ fontSize:13, color:"#555" }}>Shipping address same as billing</label>
            </div>
            {!party.sameAsBilling && <FormField label="Shipping Address"><textarea style={{...inputStyle,minHeight:60}} value={party.shipAddress} onChange={e => updateParty("shipAddress",e.target.value)} /></FormField>}
          </div>
        );
      case 1: // Basic Details
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Document Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <FormField label={numLabel}><input style={inputStyle} value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="e.g. FY25-55" /></FormField>
              <FormField label={dateLabel} required><input type="date" style={inputStyle} value={docDate} onChange={e => setDocDate(e.target.value)} /></FormField>
              <FormField label={dueDateLabel}><input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} /></FormField>
              {docType === "Invoice" && <FormField label="Vehicle Number"><input style={inputStyle} value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="AP37TB8618" /></FormField>}
            </div>
          </div>
        );
      case 2: // Items
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Items</h3>
            {items.map((it,idx) => (
              <div key={idx} style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #e5e7eb" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontWeight:600, color:"#374151" }}>Item {idx+1}</span>
                  {items.length > 1 && <button onClick={() => setItems(items.filter((_,i) => i !== idx))} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:13 }}>Remove</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <FormField label="Product">
                    <select style={inputStyle} value={it.catalogId} onChange={e => { const n=[...items]; n[idx].catalogId=e.target.value; setItems(n); }}>
                      {ITEMS_CATALOG.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Description"><input style={inputStyle} value={it.description} onChange={e => { const n=[...items]; n[idx].description=e.target.value; setItems(n); }} /></FormField>
                  <FormField label="Quantity" required><input type="number" style={inputStyle} value={it.qty} onChange={e => { const n=[...items]; n[idx].qty=e.target.value; setItems(n); }} placeholder="e.g. 4000" /></FormField>
                  <FormField label="Unit">
                    <select style={inputStyle} value={it.unit} onChange={e => { const n=[...items]; n[idx].unit=e.target.value; setItems(n); }}>
                      <option value="SQF">SQF (Square Feet)</option>
                      <option value="PCS">Pieces</option>
                      <option value="KG">KG</option>
                      <option value="LTR">Litres</option>
                    </select>
                  </FormField>
                  <FormField label="Rate (₹)" required><input type="number" style={inputStyle} value={it.rate} onChange={e => { const n=[...items]; n[idx].rate=e.target.value; setItems(n); }} placeholder="e.g. 42" /></FormField>
                </div>
              </div>
            ))}
            <button onClick={() => setItems([...items, { catalogId:"ip60", description:"Ex-Factory", qty:"", unit:"SQF", rate:"" }])} style={{...btnSecondary, fontSize:13}}>+ Add Item</button>
          </div>
        );
      case 3: // Extras
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Additional Charges</h3>
            {/* Transport */}
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #e5e7eb" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={extras.transport} onChange={e => updateExtras("transport",e.target.checked)} id="tr" />
                <label htmlFor="tr" style={{ fontWeight:600 }}>Transportation</label>
              </div>
              {extras.transport && (
                <div>
                  <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.transportMode==="direct"} onChange={() => updateExtras("transportMode","direct")} /> Direct Amount</label>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.transportMode==="calc"} onChange={() => updateExtras("transportMode","calc")} /> Calculate (Tons × Rate)</label>
                  </div>
                  {extras.transportMode === "direct"
                    ? <FormField label="Amount (₹)"><input type="number" style={inputStyle} value={extras.transportAmt} onChange={e => updateExtras("transportAmt",e.target.value)} /></FormField>
                    : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <FormField label="Tons"><input type="number" style={inputStyle} value={extras.transportTons} onChange={e => updateExtras("transportTons",e.target.value)} /></FormField>
                        <FormField label="Rate per Ton (₹)"><input type="number" style={inputStyle} value={extras.transportRate} onChange={e => updateExtras("transportRate",e.target.value)} /></FormField>
                      </div>
                  }
                </div>
              )}
            </div>
            {/* Laying */}
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #e5e7eb" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={extras.laying} onChange={e => updateExtras("laying",e.target.checked)} id="ly" />
                <label htmlFor="ly" style={{ fontWeight:600 }}>Laying Charges</label>
              </div>
              {extras.laying && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <FormField label="Total Sqft"><input type="number" style={inputStyle} value={extras.layingSqft} onChange={e => updateExtras("layingSqft",e.target.value)} /></FormField>
                  <FormField label="Rate per Sqft (₹)"><input type="number" style={inputStyle} value={extras.layingRate} onChange={e => updateExtras("layingRate",e.target.value)} /></FormField>
                </div>
              )}
            </div>
            {/* Loading */}
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #e5e7eb" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={extras.loading} onChange={e => updateExtras("loading",e.target.checked)} id="ld" />
                <label htmlFor="ld" style={{ fontWeight:600 }}>Loading & Unloading</label>
              </div>
              {extras.loading && (
                <FormField label="Rate per unit (₹)"><input type="number" style={inputStyle} value={extras.loadingRate} onChange={e => updateExtras("loadingRate",e.target.value)} /></FormField>
              )}
            </div>
          </div>
        );
      case 4: // Tax
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Tax Settings</h3>
            {!company.gstRequired && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <input type="checkbox" checked={applyGst} onChange={e => setApplyGst(e.target.checked)} id="ag" />
                <label htmlFor="ag" style={{ fontWeight:600 }}>Apply GST</label>
              </div>
            )}
            {applyGst && (
              <FormField label="GST Percentage (%)">
                <input type="number" style={{...inputStyle, width:120}} value={gstPercent} onChange={e => setGstPercent(e.target.value)} />
              </FormField>
            )}
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginTop:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>Taxable Value:</span><span style={{ fontWeight:600 }}>₹ {fmt(taxableValue)}</span></div>
              {applyGst && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>CGST @ {cgstRate}%:</span><span>₹ {fmt(cgstAmt)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>SGST @ {sgstRate}%:</span><span>₹ {fmt(sgstAmt)}</span></div>
              </>}
              {transportAmt > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>Transportation:</span><span>₹ {fmt(transportAmt)}</span></div>}
              {layingAmt > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>Laying:</span><span>₹ {fmt(layingAmt)}</span></div>}
              {loadingAmt > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>Loading/Unloading:</span><span>₹ {fmt(loadingAmt)}</span></div>}
              <hr style={{ border:"none", borderTop:"2px solid #c23152", margin:"12px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700 }}><span>Grand Total:</span><span style={{ color:"#c23152" }}>₹ {fmt(grandTotal)}</span></div>
            </div>
          </div>
        );
      case 5: // Notes
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Notes & Terms</h3>
            {docType === "Quotation" && (
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8, display:"block" }}>Predefined Notes</label>
                {PREDEFINED_NOTES.map((n,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                    <input type="checkbox" checked={selectedPredefined.includes(i)} onChange={e => {
                      if (e.target.checked) setSelectedPredefined([...selectedPredefined, i]);
                      else setSelectedPredefined(selectedPredefined.filter(x => x !== i));
                    }} style={{ marginTop:3 }} />
                    <span style={{ fontSize:13, color:"#555" }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
            <FormField label="Custom Notes"><textarea style={{...inputStyle, minHeight:100}} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." /></FormField>
          </div>
        );
      case 6: // Preview
        return renderPreview();
      default: return null;
    }
  };

  const renderPreview = () => (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:"#1a1a2e" }}>Document Preview</h3>
        <button onClick={handleDownloadPdf} style={btnPrimary}>Download PDF</button>
      </div>
      <div style={{ border:"1px solid #ccc", borderRadius:8, overflow:"auto", background:"#fff" }}>
        <div>
          <style dangerouslySetInnerHTML={{ __html: invoiceCSS }} />
          <div ref={pageRef} className="inv-doc inv-page" style={{ padding:20, margin:"0 auto" }}>
          {/* Doc Type Bar */}
          <div className="doc-type-bar">
            {docType === "Dummy Bill" ? "TAX INVOICE" : docType.toUpperCase()}
            {docType !== "Quotation" && <span className="original-badge">ORIGINAL</span>}
          </div>
          {/* Header */}
          <table style={{ marginBottom:0 }}>
            <tbody>
              <tr>
                <td style={{ width:"50%", verticalAlign:"top" }} rowSpan={2}>
                  <table className="no-border" style={{ border:"none" }}><tbody>
                    <tr>
                      <td style={{ border:"none", width:70, verticalAlign:"top", padding:"4px" }}><img src={company.logo} alt="" style={{ width:60 }} /></td>
                      <td style={{ border:"none", padding:"4px" }}>
                        <div className="company-name">{company.name}</div>
                        <div style={{ fontSize:10, color:"#444", lineHeight:"1.4" }}>{company.address}</div>
                        <table className="no-border" style={{ fontSize:10, marginTop:4, border:"none" }}><tbody>
                          {company.gstin && <tr><td style={{ border:"none", padding:"1px 4px 1px 0", fontWeight:600, width:50 }}>GSTIN:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.gstin}</td><td style={{ border:"none", padding:"1px 4px", fontWeight:600, width:55 }}>Mobile:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.mobile}</td></tr>}
                          {!company.gstin && <tr><td style={{ border:"none", padding:"1px 4px 1px 0", fontWeight:600, width:55 }}>Mobile:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.mobile}</td></tr>}
                        </tbody></table>
                      </td>
                    </tr>
                  </tbody></table>
                </td>
                <td style={{ padding:0, verticalAlign:"top" }}>
                  <table className="header-right" style={{ marginBottom:0 }}>
                    <tbody>
                      <tr>
                        <td style={{ width:"34%" }}><span className="label">{numLabel}</span><br/><span className="value">{docNumber}</span></td>
                        <td style={{ width:"33%" }}><span className="label">{dateLabel}</span><br/><span className="value">{formatDate(parsedDate)}</span></td>
                        {parsedDue && <td style={{ width:"33%" }}><span className="label">{dueDateLabel}</span><br/><span className="value">{formatDate(parsedDue)}</span></td>}
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              {docType === "Invoice" && vehicleNo && (
                <tr>
                  <td style={{ padding:0, verticalAlign:"top" }}>
                    <table className="header-right" style={{ marginBottom:0 }}>
                      <tbody><tr><td><span className="label">Vehicle No.</span><br/><span className="value">{vehicleNo}</span></td></tr></tbody>
                    </table>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Bill To / Ship To */}
          <table style={{ marginBottom:0 }}>
            <tbody>
              <tr>
                <td className="bill-header" style={{ width:"50%" }}>BILL TO</td>
                <td className="bill-header">SHIP TO</td>
              </tr>
              <tr>
                <td style={{ verticalAlign:"top" }}>
                  <div style={{ fontWeight:700, fontSize:12 }}>{party.name}</div>
                  <div style={{ fontSize:10, lineHeight:"1.5" }}>Address: {party.address}</div>
                  <div style={{ fontSize:10 }}>Place of Supply: Andhra Pradesh</div>
                  {party.phone && <div style={{ fontSize:10 }}>Mobile: <strong>{party.phone}</strong></div>}
                </td>
                <td style={{ verticalAlign:"top" }}>
                  <div style={{ fontWeight:700, fontSize:12 }}>{party.name}</div>
                  <div style={{ fontSize:10, lineHeight:"1.5" }}>Address: {shipAddr}</div>
                </td>
              </tr>
            </tbody>
          </table>
          {/* Items Table */}
          <table>
            <thead><tr>
              <th style={{ width:45, textAlign:"center" }}>S.NO.</th><th>ITEMS</th><th style={{ width:55, textAlign:"center" }}>HSN</th><th style={{ width:80 }}>QTY.</th><th style={{ width:55, textAlign:"right" }}>RATE</th><th style={{ width:75, textAlign:"right" }}>TAX</th><th style={{ width:85, textAlign:"right" }}>AMOUNT</th>
            </tr></thead>
            <tbody>
              {calcItems.map((it,i) => (
                <tr key={i}>
                  <td className="text-center">{i+1}</td>
                  <td>{it.name}{it.description ? <><br/><span style={{fontSize:10,color:"#666"}}>{it.description}</span></> : ""}</td>
                  <td className="text-center">{it.hsn}</td>
                  <td>{fmt(it.qty)} {it.unit}</td>
                  <td className="text-right">{fmt(it.rate)}</td>
                  <td className="amount-cell">{fmt(Math.round(it.taxable * gstRate / 100))}<br/><span style={{fontSize:9}}>({gstRate}%)</span></td>
                  <td className="amount-cell">{fmt(it.taxable + Math.round(it.taxable * gstRate / 100))}</td>
                </tr>
              ))}
              {/* Empty rows to fill page */}
              {Array.from({ length: emptyRowCount }).map((_,i) => (
                <tr key={`empty-${i}`} className="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              ))}
              {/* Extra lines */}
              {extras.transport && transportAmt > 0 && (
                <tr><td></td><td style={{fontStyle:"italic"}}>{extras.transportMode==="calc" ? `Transportation: ${extras.transportTons} Tons × ${extras.transportRate}/-` : "Transportation"}</td><td>-</td><td>-</td><td className="amount-cell">{fmt(transportAmt)}</td><td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td><td className="amount-cell">{fmt(transportAmt)}</td></tr>
              )}
              {extras.loading && loadingAmt > 0 && (
                <tr><td></td><td style={{fontStyle:"italic"}}>Unloading {fmt(totalQty)} × {extras.loadingRate}/-</td><td>-</td><td>-</td><td className="amount-cell">{fmt(loadingAmt)}</td><td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td><td className="amount-cell">{fmt(loadingAmt)}</td></tr>
              )}
              {extras.laying && layingAmt > 0 && (
                <tr><td></td><td style={{fontStyle:"italic"}}>Laying: {extras.layingSqft}sqft × {extras.layingRate}/-</td><td>-</td><td>-</td><td className="amount-cell">{fmt(layingAmt)}</td><td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td><td className="amount-cell">{fmt(layingAmt)}</td></tr>
              )}
              {/* Total Row */}
              <tr className="total-row">
                <td colSpan={3} className="text-right">TOTAL</td>
                <td>{fmt(totalQty)}</td>
                <td></td>
                <td className="amount-cell">₹ {fmt(totalTax)}</td>
                <td className="amount-cell">₹ {fmt(grandTotal)}</td>
              </tr>
              {docType !== "Quotation" && (
                <tr><td colSpan={6} className="text-right" style={{ fontWeight:600 }}>RECEIVED AMOUNT</td><td className="amount-cell">₹ 0</td></tr>
              )}
            </tbody>
          </table>
          {/* Tax Breakdown */}
          {applyGst && gstRate > 0 && (
            <table style={{ marginTop:0 }}>
              <thead><tr>
                <th rowSpan={2}>HSN/SAC</th><th rowSpan={2}>Taxable Value</th>
                <th colSpan={2} className="text-center">CGST</th>
                <th colSpan={2} className="text-center">SGST</th>
                <th rowSpan={2}>Total Tax Amount</th>
              </tr><tr>
                <th className="text-center">Rate</th><th className="text-right">Amount</th>
                <th className="text-center">Rate</th><th className="text-right">Amount</th>
              </tr></thead>
              <tbody>
                {calcItems.map((it,i) => {
                  const c = Math.round(it.taxable * cgstRate / 100);
                  const s = Math.round(it.taxable * sgstRate / 100);
                  return it.hsn ? (
                    <tr key={i}><td>{it.hsn}</td><td className="amount-cell">{fmt(it.taxable)}</td><td className="text-center">{cgstRate}%</td><td className="amount-cell">{fmt(c)}</td><td className="text-center">{sgstRate}%</td><td className="amount-cell">{fmt(s)}</td><td className="amount-cell">₹ {fmt(c+s)}</td></tr>
                  ) : null;
                })}
              </tbody>
            </table>
          )}
          {/* Amount in words */}
          <div className="amt-words">
            <strong>Total Amount (in words)</strong><br/>{toWords(Math.round(grandTotal))}
          </div>
          {/* Footer: Bank, QR, Terms, Signature */}
          <table style={{ marginTop:0 }}>
            <tbody>
              <tr>
                <td style={{ width:"50%", verticalAlign:"top", fontSize:10 }}>
                  <div className="footer-heading">Bank Details</div>
                  <table className="no-border" style={{ fontSize:10, marginTop:2 }}><tbody>
                    <tr><td style={{ border:"none", width:80, padding:"1px 4px" }}>Name:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.bankName}</td></tr>
                    <tr><td style={{ border:"none", padding:"1px 4px" }}>IFSC Code:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.bankIfsc}</td></tr>
                    <tr><td style={{ border:"none", padding:"1px 4px" }}>Account No:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.bankAccount}</td></tr>
                    <tr><td style={{ border:"none", padding:"1px 4px" }}>Bank:</td><td style={{ border:"none", padding:"1px 4px" }}>{company.bankBranch}</td></tr>
                  </tbody></table>
                </td>
                <td style={{ width:"50%", verticalAlign:"top", fontSize:10 }}>
                  <div className="footer-heading">Payment QR Code</div>
                  <div style={{ marginTop:2 }}>UPI ID:<br/><strong>{company.upi}</strong></div>
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign:"top", fontSize:10 }}>
                  {allNotes && <><div className="footer-heading">Notes</div><span style={{ whiteSpace:"pre-wrap" }}>{allNotes}</span><br/><br/></>}
                  <div className="footer-heading">Terms and Conditions</div>
                  1. Goods once sold will not be taken back or exchanged<br/>
                  {docType === "Quotation" && <>2. Full payment for materials must be made before dispatch.<br/></>}
                  {docType === "Quotation" ? "3" : "2"}. All disputes are subject to Vijayawada jurisdiction only
                </td>
                <td style={{ textAlign:"center", verticalAlign:"bottom", fontSize:10 }}>
                  <img src={SIGNATURE} alt="" style={{ width:80, marginBottom:4 }} /><br/>
                  Authorised Signatory For<br/>{company.name}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => { setView("landing"); setStep(0); }} style={{ background:"none", border:"none", color:"#e94560", cursor:"pointer", fontSize:18, fontWeight:700 }}>←</button>
          <img src={company.logo} alt="" style={{ width:32, height:32, borderRadius:6, background:"#fff" }} />
          <span style={{ fontWeight:600, fontSize:14 }}>{company.name}</span>
        </div>
        <span style={{ background:"rgba(233,69,96,0.2)", color:"#e94560", padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:600 }}>{docType}</span>
      </div>
      {/* Main */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px" }}>
        <StepIndicator current={step} steps={stepLabels} />
        <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
          {renderStep()}
        </div>
        {/* Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:20 }}>
          <button onClick={() => setStep(Math.max(0, step-1))} disabled={step===0} style={{...btnSecondary, opacity:step===0?0.4:1}}>← Back</button>
          {step < 6
            ? <button onClick={() => setStep(step+1)} style={btnPrimary}>Next →</button>
            : <button onClick={handleDownloadPdf} style={btnPrimary}>Download PDF</button>
          }
        </div>
      </div>
    </div>
  );
}
