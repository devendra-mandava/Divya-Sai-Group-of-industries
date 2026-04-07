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

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const PREDEFINED_NOTES = [
  "Sand, vibrator, and civil works are to be arranged by the customer at the work site. Our scope covers only the tile supply and laying work.",
  "Civil works and sand filling are within your scope.",
];

const DEFAULT_PARTY = {
  name: "",
  phone: "",
  gst: "",
  street: "",
  city: "",
  state: "Andhra Pradesh",
  pincode: "",
  shipStreet: "",
  shipCity: "",
  shipState: "Andhra Pradesh",
  shipPincode: "",
  sameAsBilling: true,
};

const DEFAULT_ITEM = { catalogId:"ip60", description:"Ex-Factory", qty:"", unit:"SQF", rate:"" };

const DEFAULT_EXTRAS = {
  transport:false, transportMode:"direct", transportAmt:"", transportTons:"", transportRate:"",
  laying:false, layingMode:"sqft", layingSqft:"", layingRate:"", layingTotal:"",
  unloading:false, unloadingMode:"sqft", unloadingSqft:"", unloadingRate:"", unloadingTotal:"",
};

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
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmt = (n) => {
  if (n == null) return "0";
  return Number(n).toLocaleString("en-IN");
};

const composeAddr = (street, city, state, pincode) =>
  [street, city, state && pincode ? `${state} - ${pincode}` : state || pincode].filter(Boolean).join(", ");

const parseStoredDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = parseStoredDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
};

const sanitizePhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const MM_TO_PX = 3.7795275591;
const PRINT_CONTENT_HEIGHT_MM = 277;
const PRINT_CONTENT_HEIGHT_PX = PRINT_CONTENT_HEIGHT_MM * MM_TO_PX;
const EMPTY_ROW_HEIGHT_PX = 24;
const BASE_VISIBLE_ITEM_ROWS = 6;
const MAX_ADAPTIVE_EMPTY_ROWS = 5;

const getAdaptiveEmptyRowCount = (itemCount, maxRowsThatFit = Number.POSITIVE_INFINITY) => {
  const safeItemCount = Math.max(Number(itemCount) || 0, 0);
  const desiredRows = Math.max(0, Math.min(MAX_ADAPTIVE_EMPTY_ROWS, BASE_VISIBLE_ITEM_ROWS - safeItemCount));
  return Math.min(desiredRows, Math.max(0, Math.floor(maxRowsThatFit)));
};

function PrintableDocument({ company, data, invoiceCSS, pageRef }) {
  const {
    docType,
    numLabel,
    dateLabel,
    dueDateLabel,
    docNumber,
    parsedDate,
    parsedDue,
    vehicleNo,
    party,
    billingAddr,
    shipAddr,
    calcItems,
    gstRate,
    totalQty,
    totalTax,
    grandTotal,
    transportAmt,
    layingAmt,
    unloadingAmt,
    extras,
    cgstRate,
    sgstRate,
    allNotes,
    emptyRowCount,
    receivedAmount,
    balanceAmount,
  } = data;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: invoiceCSS }} />
      <div ref={pageRef} className="inv-doc inv-page" style={{ padding:20, margin:"0 auto" }}>
        <div className="doc-type-bar">
          {docType === "Dummy Bill" ? "TAX INVOICE" : docType.toUpperCase()}
          {docType !== "Quotation" && <span className="original-badge">ORIGINAL</span>}
        </div>
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
                        {company.email && <tr><td style={{ border:"none", padding:"1px 4px 1px 0", fontWeight:600, width:55 }}>Email:</td><td style={{ border:"none", padding:"1px 4px" }} colSpan={3}>{company.email}</td></tr>}
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
        <table style={{ marginBottom:0 }}>
          <tbody>
            <tr>
              <td className="bill-header" style={{ width:"50%" }}>BILL TO</td>
              <td className="bill-header">SHIP TO</td>
            </tr>
            <tr>
              <td style={{ verticalAlign:"top" }}>
                <div style={{ fontWeight:700, fontSize:12 }}>{party.name}</div>
                <div style={{ fontSize:10, lineHeight:"1.5" }}>Address: {billingAddr}</div>
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
        <table>
          <thead><tr>
            <th style={{ width:45, textAlign:"center" }}>S.NO.</th><th>ITEMS</th><th style={{ width:55, textAlign:"center" }}>HSN</th><th style={{ width:80 }}>QTY.</th><th style={{ width:55, textAlign:"right" }}>RATE</th>{gstRate > 0 && <th style={{ width:75, textAlign:"right" }}>TAX</th>}<th style={{ width:85, textAlign:"right" }}>AMOUNT</th>
          </tr></thead>
          <tbody>
            {calcItems.map((it, i) => (
              <tr key={i}>
                <td className="text-center">{i+1}</td>
                <td>{it.name}{it.description ? <><br/><span style={{fontSize:10,color:"#666"}}>{it.description}</span></> : ""}</td>
                <td className="text-center">{it.hsn}</td>
                <td>{fmt(it.qty)} {it.unit}</td>
                <td className="text-right">{fmt(it.rate)}</td>
                {gstRate > 0 && <td className="amount-cell">{fmt(Math.round(it.taxable * gstRate / 100))}<br/><span style={{fontSize:9}}>({gstRate}%)</span></td>}
                <td className="amount-cell">{fmt(it.taxable + Math.round(it.taxable * gstRate / 100))}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row"><td></td><td></td><td></td><td></td><td></td>{gstRate > 0 && <td></td>}<td></td></tr>
            ))}
            {extras.transport && transportAmt > 0 && (
              <tr><td></td><td style={{fontStyle:"italic"}}>{extras.transportMode==="calc" ? `Transportation: ${extras.transportTons} Tons × ${extras.transportRate}/-` : "Transportation"}</td><td>-</td><td>-</td><td className="amount-cell">{fmt(transportAmt)}</td>{gstRate > 0 && <td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td>}<td className="amount-cell">{fmt(transportAmt)}</td></tr>
            )}
            {extras.unloading && unloadingAmt > 0 && (
              <tr><td></td><td style={{fontStyle:"italic"}}>{extras.unloadingMode==="sqft" ? `Unloading: ${extras.unloadingSqft}sqft × ${extras.unloadingRate}/-` : "Unloading"}</td><td>-</td><td>-</td><td className="amount-cell">{fmt(unloadingAmt)}</td>{gstRate > 0 && <td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td>}<td className="amount-cell">{fmt(unloadingAmt)}</td></tr>
            )}
            {extras.laying && layingAmt > 0 && (
              <tr><td></td><td style={{fontStyle:"italic"}}>{extras.layingMode==="sqft" ? `Laying: ${extras.layingSqft}sqft × ${extras.layingRate}/-` : "Laying"}</td><td>-</td><td>-</td><td className="amount-cell">{fmt(layingAmt)}</td>{gstRate > 0 && <td className="amount-cell">0<br/><span style={{fontSize:9}}>(0%)</span></td>}<td className="amount-cell">{fmt(layingAmt)}</td></tr>
            )}
            <tr className="total-row">
              <td colSpan={3} className="text-right">TOTAL</td>
              <td>{fmt(totalQty)}</td>
              <td></td>
              {gstRate > 0 && <td className="amount-cell">₹ {fmt(totalTax)}</td>}
              <td className="amount-cell">₹ {fmt(grandTotal)}</td>
            </tr>
            {docType !== "Quotation" && (
              <>
                <tr><td colSpan={gstRate > 0 ? 6 : 5} className="text-right" style={{ fontWeight:600 }}>RECEIVED AMOUNT</td><td className="amount-cell">₹ {fmt(receivedAmount)}</td></tr>
                <tr><td colSpan={gstRate > 0 ? 6 : 5} className="text-right" style={{ fontWeight:600 }}>BALANCE TO RECEIVE</td><td className="amount-cell">₹ {fmt(balanceAmount)}</td></tr>
              </>
            )}
          </tbody>
        </table>
        {gstRate > 0 && (
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
              {calcItems.map((it, i) => {
                const c = Math.round(it.taxable * cgstRate / 100);
                const s = Math.round(it.taxable * sgstRate / 100);
                return it.hsn ? (
                  <tr key={i}><td>{it.hsn}</td><td className="amount-cell">{fmt(it.taxable)}</td><td className="text-center">{cgstRate}%</td><td className="amount-cell">{fmt(c)}</td><td className="text-center">{sgstRate}%</td><td className="amount-cell">{fmt(s)}</td><td className="amount-cell">₹ {fmt(c+s)}</td></tr>
                ) : null;
              })}
            </tbody>
          </table>
        )}
        <div className="amt-words">
          <strong>Total Amount (in words)</strong><br/>{toWords(Math.round(grandTotal))}
        </div>
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
  );
}

function Landing({ onSelect, onHistory, authUser, onLogout }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:800, width:"100%", textAlign:"center", position:"relative" }}>
        <div style={{ position:"absolute", top:0, right:0, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ color:"#e0e0e0", fontSize:13 }}>{authUser?.fullName || authUser?.username}</span>
          <button onClick={onLogout} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12 }}>Logout</button>
        </div>
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
                <button onClick={() => onHistory(key)} style={{ padding:"12px 20px", border:"1px solid rgba(255,255,255,0.3)", borderRadius:10, background:"transparent", color:"#e0e0e0", fontSize:14, fontWeight:500, cursor:"pointer", marginTop:4, transition:"transform 0.15s" }}
                  onMouseOver={e => { e.target.style.transform="scale(1.03)"; e.target.style.background="rgba(255,255,255,0.1)"; }}
                  onMouseOut={e => { e.target.style.transform="scale(1)"; e.target.style.background="transparent"; }}
                >History</button>
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

function AuthScreen({ mode, onModeChange, credentials, onCredentialsChange, onSubmit, submitting, error }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#fff", borderRadius:20, padding:28, boxShadow:"0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <h1 style={{ margin:"0 0 8px", fontSize:26, color:"#1a1a2e" }}>DSGI Portal</h1>
          <p style={{ margin:0, color:"#6b7280", fontSize:14 }}>
            {mode === "login" ? "Sign in to access invoices, quotations, and history." : "Create an account to protect your business data."}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:20, background:"#f3f4f6", padding:4, borderRadius:12 }}>
          {["login", "signup"].map((tab) => (
            <button
              key={tab}
              onClick={() => onModeChange(tab)}
              style={{
                flex:1,
                border:"none",
                borderRadius:10,
                padding:"10px 12px",
                cursor:"pointer",
                fontWeight:600,
                background: mode === tab ? "#fff" : "transparent",
                color: mode === tab ? "#c23152" : "#6b7280",
                boxShadow: mode === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          {mode === "signup" && (
            <FormField label="Full Name">
              <input style={inputStyle} value={credentials.fullName} onChange={(e) => onCredentialsChange("fullName", e.target.value)} placeholder="Your name" />
            </FormField>
          )}
          <FormField label="Username" required>
            <input style={inputStyle} value={credentials.username} onChange={(e) => onCredentialsChange("username", e.target.value)} placeholder="Choose a username" autoComplete="username" />
          </FormField>
          <FormField label="Password" required>
            <input type="password" style={inputStyle} value={credentials.password} onChange={(e) => onCredentialsChange("password", e.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </FormField>
          {error && <div style={{ marginBottom:16, color:"#b91c1c", fontSize:13, background:"#fef2f2", border:"1px solid #fecaca", padding:"10px 12px", borderRadius:10 }}>{error}</div>}
          <button type="submit" disabled={submitting} style={{ ...btnPrimary, width:"100%", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Login" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authCredentials, setAuthCredentials] = useState({ fullName: "", username: "", password: "" });
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("landing");
  const [companyKey, setCompanyKey] = useState(null);
  const [docType, setDocType] = useState(null);
  const [step, setStep] = useState(0);

  // Party
  const [party, setParty] = useState({ ...DEFAULT_PARTY });
  const [partiesList, setPartiesList] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  // History
  const [historyDocs, setHistoryDocs] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTab, setHistoryTab] = useState("Invoice");
  // Basic
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [partyId, setPartyId] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  // Items
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }]);
  // Additional
  const [extras, setExtras] = useState({ ...DEFAULT_EXTRAS });
  // Tax
  const [gstPercent, setGstPercent] = useState(18);
  const [applyGst, setApplyGst] = useState(true);
  // Notes
  const [notes, setNotes] = useState("");
  const [selectedPredefined, setSelectedPredefined] = useState([]);
  const [emptyRowCount, setEmptyRowCount] = useState(0);
  const [historyDownloadDoc, setHistoryDownloadDoc] = useState(null);

  const pageRef = useRef();
  const historyPageRef = useRef();

  const company = companyKey ? COMPANIES[companyKey] : null;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          setAuthUser(null);
          setAuthLoading(false);
          return;
        }
        const data = await res.json();
        setAuthUser(data.user || null);
      } catch {
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateAuthCredentials = (key, value) => {
    setAuthCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload = authMode === "login"
        ? { username: authCredentials.username, password: authCredentials.password }
        : { username: authCredentials.username, password: authCredentials.password, fullName: authCredentials.fullName };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.error || `Failed to ${authMode}`);
        return;
      }
      setAuthUser(data.user || null);
      setAuthCredentials({ fullName: "", username: "", password: "" });
      setAuthError("");
    } catch {
      setAuthError("Unable to connect right now. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout; clear client state either way.
    }
    setAuthUser(null);
    setAuthMode("login");
    setAuthCredentials({ fullName: "", username: "", password: "" });
    setAuthError("");
    setView("landing");
    setCompanyKey(null);
    setDocType(null);
    setHistoryDocs([]);
    setHistoryDownloadDoc(null);
  }, []);

  // Fetch parties for autocomplete
  const fetchParties = async (ck) => {
    try {
      const res = await fetch(`/api/parties?company=${ck}`);
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) { const data = await res.json(); setPartiesList(data); }
    } catch { /* offline fallback */ }
  };

  // Fetch next doc number from counter
  const fetchNextNumber = async (ck, dt) => {
    if (dt === "Dummy Bill") return;
    try {
      const res = await fetch(`/api/counter?company=${ck}&doc_type=${dt}`);
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) { const data = await res.json(); setDocNumber(data.docNumber); }
    } catch { /* offline fallback */ }
  };

  // Fetch history documents
  const fetchHistory = async (ck, search = "") => {
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/documents?company=${ck}${q}`);
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) { const data = await res.json(); setHistoryDocs(data); }
    } catch { setHistoryDocs([]); }
  };

  const resetDocumentState = (ck, dt) => {
    setDocType(dt);
    setGstPercent(COMPANIES[ck].defaultGst);
    setApplyGst(COMPANIES[ck].gstRequired);
    setParty({ ...DEFAULT_PARTY });
    setPartiesList([]);
    setShowPartySuggestions(false);
    setHistoryDocs([]);
    setDocDate(new Date().toISOString().slice(0,10));
    setDueDate("");
    setVehicleNo("");
    setDocNumber("");
    setPartyId(null);
    setReceivedAmount("");
    setEditingDocumentId(null);
    setItems([{ ...DEFAULT_ITEM }]);
    setExtras({ ...DEFAULT_EXTRAS });
    setNotes("");
    setSelectedPredefined([]);
    setEmptyRowCount(0);
  };

  const handleSelect = (ck, dt) => {
    setCompanyKey(ck);
    resetDocumentState(ck, dt);
    setView("form");
    setStep(0);
    fetchParties(ck);
    fetchNextNumber(ck, dt);
  };

  const handleHistory = (ck) => {
    setCompanyKey(ck);
    setHistorySearch("");
    setHistoryTab("Invoice");
    setEditingDocumentId(null);
    setView("history");
    fetchHistory(ck);
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
  if (extras.laying) {
    if (extras.layingMode === "direct") layingAmt = parseFloat(extras.layingTotal) || 0;
    else layingAmt = (parseFloat(extras.layingSqft)||0) * (parseFloat(extras.layingRate)||0);
  }
  let unloadingAmt = 0;
  if (extras.unloading) {
    if (extras.unloadingMode === "direct") unloadingAmt = parseFloat(extras.unloadingTotal) || 0;
    else unloadingAmt = (parseFloat(extras.unloadingSqft)||0) * (parseFloat(extras.unloadingRate)||0);
  }

  const taxableValue = totalTaxableItems;
  const gstRate = applyGst ? (parseFloat(gstPercent)||0) : 0;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmt = Math.round(taxableValue * cgstRate / 100);
  const sgstAmt = Math.round(taxableValue * sgstRate / 100);
  const totalTax = cgstAmt + sgstAmt;
  const grandTotal = taxableValue + totalTax + transportAmt + layingAmt + unloadingAmt;
  const receivedAmountValue = parseFloat(receivedAmount) || 0;
  const balanceAmount = Math.max(grandTotal - receivedAmountValue, 0);
  const allNotes = [
    ...selectedPredefined.map(i => PREDEFINED_NOTES[i]),
    ...(notes ? [notes] : [])
  ].join("\n");
  const billingAddr = composeAddr(party.street, party.city, party.state, party.pincode);
  const shipAddr = party.sameAsBilling ? billingAddr : composeAddr(party.shipStreet, party.shipCity, party.shipState, party.shipPincode);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const frame = window.requestAnimationFrame(() => {
      const baseHeight = page.scrollHeight - emptyRowCount * EMPTY_ROW_HEIGHT_PX;
      const remainingSpace = PRINT_CONTENT_HEIGHT_PX - baseHeight;
      const maxRowsThatFit = remainingSpace > 0 ? Math.floor(remainingSpace / EMPTY_ROW_HEIGHT_PX) : 0;
      const nextCount = getAdaptiveEmptyRowCount(calcItems.length, maxRowsThatFit);

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
    unloadingAmt,
    gstRate,
    docType,
    party.name,
    billingAddr,
    party.phone,
    shipAddr,
    allNotes,
    vehicleNo,
    docNumber,
    docDate,
    dueDate,
    receivedAmountValue,
    balanceAmount,
  ]);

  const invoiceCSS = `
    .inv-doc { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
    .inv-page { width: 180mm; max-width: 180mm; margin: 0 auto; background: #fff; overflow: hidden; }
    .inv-doc table { width:100%; border-collapse:collapse; table-layout:fixed; }
    .inv-doc td, .inv-doc th { border:1px solid #999; padding:4px 6px; text-align:left; vertical-align:top; word-wrap:break-word; overflow-wrap:break-word; overflow:hidden; }
    .inv-doc th { background:#f8f0f2; font-weight:600; color:#5a1a2a; }
    .inv-doc .no-border { table-layout:auto; }
    .inv-doc .no-border td, .inv-doc .no-border th { border:none; padding:2px 4px; overflow:visible; }
    .inv-doc .text-right { text-align:right; }
    .inv-doc .text-center { text-align:center; }
    .inv-doc .bold { font-weight:700; }
    .inv-doc .amount-cell { text-align:right; }
    .inv-doc .header-right { table-layout:auto; }
    .inv-doc .header-right td { border:1px solid #999; padding:4px 8px; }
    .inv-doc .header-right .label { font-weight:600; font-size:10px; color:#5a1a2a; }
    .inv-doc .header-right .value { font-size:11px; }
    .inv-doc .empty-row td { height:22px; }
    .inv-doc .doc-type-bar { background:#7B1A2C; color:#fff; padding:6px 12px; font-weight:700; font-size:12px; }
    .inv-doc .doc-type-bar .original-badge { border:1px solid #fff; padding:2px 10px; font-size:10px; font-weight:600; color:#fff; float:right; margin-top:1px; }
    .inv-doc .total-row td { background:#f8f0f2; font-weight:700; }
    .inv-doc .company-name { font-weight:700; font-size:13px; color:#7B1A2C; margin-bottom:2px; word-wrap:break-word; }
    .inv-doc .section-label { font-weight:700; font-size:10px; color:#7B1A2C; margin-bottom:4px; }
    .inv-doc .bill-header { background:#7B1A2C; color:#fff; font-weight:700; font-size:10px; padding:3px 8px; }
    .inv-doc .amt-words { border:1px solid #999; padding:8px; background:#fdf8f9; word-wrap:break-word; overflow-wrap:break-word; font-size:10px; }
    .inv-doc .footer-heading { font-weight:700; color:#7B1A2C; font-size:11px; margin-bottom:4px; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .print-root { padding: 0; }
    }
    @page { size:A4; margin:10mm; }
  `;

  const getPdfFilename = useCallback((documentData) => {
    const safePartyName = (documentData.party.name || "customer")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    const safeDocNum = (documentData.docNumber || "draft").replace(/[\/\\]/g, "-");
    const docLabel2 = documentData.docType === "Dummy Bill" ? "Invoice" : documentData.docType;
    return `${safeDocNum}_${safePartyName}_${docLabel2}.pdf`;
  }, []);

  const downloadPdfFromNode = useCallback(async (content, filename) => {
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
  }, []);

  const dateLabel = docType === "Quotation" ? "Quotation Date" : "Invoice Date";
  const numLabel = docType === "Quotation" ? "Quotation No." : "Invoice No.";
  const dueDateLabel = docType === "Quotation" ? "Expiry Date" : "Due Date";
  const parsedDate = docDate ? new Date(docDate + "T00:00:00") : new Date();
  const parsedDue = dueDate ? new Date(dueDate + "T00:00:00") : null;

  const currentDocumentData = {
    docType,
    numLabel,
    dateLabel,
    dueDateLabel,
    docNumber,
    parsedDate,
    parsedDue,
    vehicleNo,
    party,
    billingAddr,
    shipAddr,
    calcItems,
    gstRate,
    cgstRate,
    sgstRate,
    cgstAmt,
    sgstAmt,
    totalTax,
    totalQty,
    grandTotal,
    transportAmt,
    layingAmt,
    unloadingAmt,
    extras,
    allNotes,
    emptyRowCount,
    receivedAmount: receivedAmountValue,
    balanceAmount,
  };

  const buildHistoryDocumentData = useCallback((doc) => {
    const savedParty = doc.party_json || {};
    const historyParty = {
      ...DEFAULT_PARTY,
      ...savedParty,
      name: doc.party_name || savedParty.name || "",
      phone: doc.party_phone || savedParty.phone || doc.linked_party_phone || "",
      street: savedParty.street || doc.linked_party_street || "",
      city: savedParty.city || doc.linked_party_city || "",
      state: savedParty.state || doc.linked_party_state || "Andhra Pradesh",
      pincode: savedParty.pincode || doc.linked_party_pincode || "",
      shipStreet: savedParty.shipStreet || doc.linked_party_ship_street || "",
      shipCity: savedParty.shipCity || doc.linked_party_ship_city || "",
      shipState: savedParty.shipState || doc.linked_party_ship_state || "Andhra Pradesh",
      shipPincode: savedParty.shipPincode || doc.linked_party_ship_pincode || "",
      sameAsBilling: savedParty.sameAsBilling ?? true,
    };
    const historyItems = Array.isArray(doc.items_json) ? doc.items_json : [];
    const historyExtras = { ...DEFAULT_EXTRAS, ...(doc.extras_json || {}) };
    const historyTax = doc.tax_json || {};
    const historyApplyGst = Boolean(historyTax.applyGst);
    const historyGstRate = historyApplyGst ? (parseFloat(historyTax.gstPercent) || 0) : 0;
    const normalizedItems = historyItems.map((it) => {
      const cat = ITEMS_CATALOG.find((c) => c.id === it.catalogId) || {};
      const qty = parseFloat(it.qty) || 0;
      const rate = parseFloat(it.rate) || 0;
      return { ...cat, ...it, qty, rate, taxable: qty * rate };
    });
    const historyTaxableValue = normalizedItems.reduce((sum, it) => sum + it.taxable, 0);
    const historyTransportAmt = historyExtras.transport
      ? historyExtras.transportMode === "direct"
        ? parseFloat(historyExtras.transportAmt) || 0
        : (parseFloat(historyExtras.transportTons) || 0) * (parseFloat(historyExtras.transportRate) || 0)
      : 0;
    const historyLayingAmt = historyExtras.laying
      ? historyExtras.layingMode === "direct"
        ? parseFloat(historyExtras.layingTotal) || 0
        : (parseFloat(historyExtras.layingSqft) || 0) * (parseFloat(historyExtras.layingRate) || 0)
      : 0;
    const historyUnloadingAmt = historyExtras.unloading
      ? historyExtras.unloadingMode === "direct"
        ? parseFloat(historyExtras.unloadingTotal) || 0
        : (parseFloat(historyExtras.unloadingSqft) || 0) * (parseFloat(historyExtras.unloadingRate) || 0)
      : 0;
    const historyCgstAmt = parseFloat(historyTax.cgstAmt) || Math.round(historyTaxableValue * (historyGstRate / 2) / 100);
    const historySgstAmt = parseFloat(historyTax.sgstAmt) || Math.round(historyTaxableValue * (historyGstRate / 2) / 100);
    const historyGrandTotal = parseFloat(doc.grand_total) || (historyTaxableValue + historyCgstAmt + historySgstAmt + historyTransportAmt + historyLayingAmt + historyUnloadingAmt);
    const historyReceivedAmount = parseFloat(doc.received_amount) || 0;

    return {
      docType: doc.doc_type,
      numLabel: doc.doc_type === "Quotation" ? "Quotation No." : "Invoice No.",
      dateLabel: doc.doc_type === "Quotation" ? "Quotation Date" : "Invoice Date",
      dueDateLabel: doc.doc_type === "Quotation" ? "Expiry Date" : "Due Date",
      docNumber: doc.doc_number,
      parsedDate: parseStoredDate(doc.doc_date) || new Date(),
      parsedDue: parseStoredDate(doc.due_date),
      vehicleNo: doc.vehicle_no || "",
      party: historyParty,
      billingAddr: composeAddr(historyParty.street, historyParty.city, historyParty.state, historyParty.pincode),
      shipAddr: historyParty.sameAsBilling
        ? composeAddr(historyParty.street, historyParty.city, historyParty.state, historyParty.pincode)
        : composeAddr(historyParty.shipStreet, historyParty.shipCity, historyParty.shipState, historyParty.shipPincode),
      calcItems: normalizedItems,
      gstRate: historyGstRate,
      cgstRate: historyGstRate / 2,
      sgstRate: historyGstRate / 2,
      cgstAmt: historyCgstAmt,
      sgstAmt: historySgstAmt,
      totalTax: historyCgstAmt + historySgstAmt,
      totalQty: normalizedItems.reduce((sum, it) => sum + it.qty, 0),
      grandTotal: historyGrandTotal,
      transportAmt: historyTransportAmt,
      layingAmt: historyLayingAmt,
      unloadingAmt: historyUnloadingAmt,
      extras: historyExtras,
      allNotes: doc.notes || "",
      emptyRowCount: getAdaptiveEmptyRowCount(normalizedItems.length),
      receivedAmount: historyReceivedAmount,
      balanceAmount: Math.max(historyGrandTotal - historyReceivedAmount, 0),
    };
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const content = pageRef.current;
    if (!content) return;

    // Save to DB (fire-and-forget, only for Invoice/Quotation)
    if (docType !== "Dummy Bill" && companyKey && docNumber) {
      const partySnapshot = { ...party };
      try {
        const partyRes = await fetch("/api/parties", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company: companyKey, name: party.name, phone: party.phone, gst: party.gst, street: party.street, city: party.city, state: party.state, pincode: party.pincode, ship_street: party.shipStreet, ship_city: party.shipCity, ship_state: party.shipState, ship_pincode: party.shipPincode })
        });
        const partyData = partyRes.ok ? await partyRes.json() : {};
        fetch("/api/documents", {
          method: editingDocumentId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editingDocumentId ? { id: editingDocumentId } : {}),
            company: companyKey,
            doc_type: docType,
            doc_number: docNumber,
            party_id: partyData.id || partyId,
            party_name: party.name,
            party_phone: party.phone,
            party_json: partySnapshot,
            doc_date: docDate,
            due_date: dueDate || null,
            grand_total: grandTotal,
            received_amount: receivedAmountValue,
            vehicle_no: vehicleNo,
            items_json: calcItems,
            extras_json: extras,
            tax_json: { gstPercent, applyGst, cgstAmt, sgstAmt, totalTax },
            notes: allNotes,
          })
        }).catch(() => {});
      } catch { /* offline */ }
    }

    await downloadPdfFromNode(content, getPdfFilename(currentDocumentData));
    if (companyKey) fetchHistory(companyKey, historySearch);
  }, [allNotes, applyGst, calcItems, companyKey, currentDocumentData, docDate, docNumber, docType, downloadPdfFromNode, dueDate, editingDocumentId, extras, getPdfFilename, grandTotal, gstPercent, historySearch, party, partyId, receivedAmountValue, sgstAmt, cgstAmt, totalTax, vehicleNo]);

  const handleHistoryDownload = useCallback(async (doc) => {
    const data = buildHistoryDocumentData(doc);
    setHistoryDownloadDoc(data);
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    if (!historyPageRef.current) return;
    await downloadPdfFromNode(historyPageRef.current, getPdfFilename(data));
  }, [buildHistoryDocumentData, downloadPdfFromNode, getPdfFilename]);

  const getHistoryBalance = useCallback((doc) => {
    const grandTotalValue = parseFloat(doc.grand_total) || 0;
    const receivedAmountValue2 = parseFloat(doc.received_amount) || 0;
    return Math.max(grandTotalValue - receivedAmountValue2, 0);
  }, []);

  const handleWhatsappReminder = useCallback((doc) => {
    const phone = sanitizePhoneNumber(doc.party_phone);
    if (!phone) {
      window.alert("No phone number is available for this party.");
      return;
    }
    const balance = getHistoryBalance(doc);
    if (balance <= 0) {
      window.alert("No balance is pending for this invoice.");
      return;
    }
    const message = `Hi sir/ma'am,
Your payment of ₹ ${fmt(balance)} against invoice number: ${doc.doc_number} is pending.

Please clear the payment as soon as possible.

Thank you,
Divya Sai Group of Industries`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }, [getHistoryBalance]);

  const handleHistoryEdit = useCallback((doc) => {
    const savedParty = doc.party_json || {};
    const restoredParty = {
      ...DEFAULT_PARTY,
      ...savedParty,
      name: doc.party_name || savedParty.name || "",
      phone: doc.party_phone || savedParty.phone || doc.linked_party_phone || "",
      street: savedParty.street || doc.linked_party_street || "",
      city: savedParty.city || doc.linked_party_city || "",
      state: savedParty.state || doc.linked_party_state || "Andhra Pradesh",
      pincode: savedParty.pincode || doc.linked_party_pincode || "",
      shipStreet: savedParty.shipStreet || doc.linked_party_ship_street || "",
      shipCity: savedParty.shipCity || doc.linked_party_ship_city || "",
      shipState: savedParty.shipState || doc.linked_party_ship_state || "Andhra Pradesh",
      shipPincode: savedParty.shipPincode || doc.linked_party_ship_pincode || "",
      sameAsBilling: savedParty.sameAsBilling ?? true,
    };
    const restoredItems = Array.isArray(doc.items_json) && doc.items_json.length > 0
      ? doc.items_json.map((it) => ({
          catalogId: it.catalogId || "ip60",
          description: it.description || "",
          qty: it.qty != null ? String(it.qty) : "",
          unit: it.unit || "SQF",
          rate: it.rate != null ? String(it.rate) : "",
        }))
      : [{ ...DEFAULT_ITEM }];
    const restoredExtras = { ...DEFAULT_EXTRAS, ...(doc.extras_json || {}) };
    const restoredTax = doc.tax_json || {};

    setCompanyKey(doc.company);
    setDocType(doc.doc_type);
    setGstPercent(restoredTax.gstPercent ?? COMPANIES[doc.company].defaultGst);
    setApplyGst(restoredTax.applyGst ?? COMPANIES[doc.company].gstRequired);
    setParty(restoredParty);
    setPartiesList([]);
    setShowPartySuggestions(false);
    setDocDate(toDateInputValue(doc.doc_date) || new Date().toISOString().slice(0,10));
    setDueDate(toDateInputValue(doc.due_date));
    setVehicleNo(doc.vehicle_no || "");
    setDocNumber(doc.doc_number || "");
    setPartyId(doc.party_id || null);
    setReceivedAmount(doc.received_amount != null ? String(doc.received_amount) : "");
    setEditingDocumentId(doc.id);
    setItems(restoredItems);
    setExtras(restoredExtras);
    setNotes(doc.notes || "");
    setSelectedPredefined([]);
    setEmptyRowCount(0);
    setView("form");
    setStep(0);
    fetchParties(doc.company);
  }, []);

  const handleHistoryDelete = useCallback(async (doc) => {
    if (!window.confirm(`Are you sure you want to delete ${doc.doc_type} ${doc.doc_number}?`)) return;

    try {
      const res = await fetch(`/api/documents?id=${doc.id}&company=${doc.company}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setHistoryDocs((prev) => prev.filter((item) => item.id !== doc.id));
    } catch {
      window.alert("Failed to delete document. Please try again.");
    }
  }, []);

  if (authLoading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#374151" }}>
        Checking session...
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); }}
        credentials={authCredentials}
        onCredentialsChange={updateAuthCredentials}
        onSubmit={handleAuthSubmit}
        submitting={authSubmitting}
        error={authError}
      />
    );
  }

  if (view === "landing") return <Landing onSelect={handleSelect} onHistory={handleHistory} authUser={authUser} onLogout={handleLogout} />;

  // Form Steps
  const renderStep = () => {
    switch(step) {
      case 0: { // Party
        const filtered = partiesList.filter(p => p.name.toLowerCase().includes((party.name||"").toLowerCase())).slice(0,8);
        const selectParty = (p) => {
          setParty({ name:p.name, phone:p.phone||"", gst:p.gst||"", street:p.street||"", city:p.city||"", state:p.state||"Andhra Pradesh", pincode:p.pincode||"", shipStreet:p.ship_street||"", shipCity:p.ship_city||"", shipState:p.ship_state||"Andhra Pradesh", shipPincode:p.ship_pincode||"", sameAsBilling:true });
          setPartyId(p.id);
          setShowPartySuggestions(false);
        };
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Customer Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <FormField label="Name" required>
                <div style={{ position:"relative" }}>
                  <input style={inputStyle} value={party.name} onChange={e => { updateParty("name",e.target.value); setShowPartySuggestions(true); setPartyId(null); }} onFocus={() => setShowPartySuggestions(true)} onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)} placeholder="Customer name" />
                  {showPartySuggestions && party.name && filtered.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, maxHeight:200, overflowY:"auto", zIndex:10, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
                      {filtered.map(p => (
                        <div key={p.id} onMouseDown={() => selectParty(p)} style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, borderBottom:"1px solid #f3f4f6" }}
                          onMouseOver={e => e.target.style.background="#f3f4f6"} onMouseOut={e => e.target.style.background="#fff"}>
                          <strong>{p.name}</strong>{p.city ? <span style={{color:"#888"}}> — {p.city}</span> : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>
              <FormField label="Phone"><input style={inputStyle} value={party.phone} onChange={e => updateParty("phone",e.target.value)} placeholder="Phone number" /></FormField>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8, marginTop:4 }}>Billing Address</div>
            <FormField label="Street / Area" required><input style={inputStyle} value={party.street} onChange={e => updateParty("street",e.target.value)} placeholder="Street, area, landmark" /></FormField>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <FormField label="City" required><input style={inputStyle} value={party.city} onChange={e => updateParty("city",e.target.value)} placeholder="City" /></FormField>
              <FormField label="State" required>
                <select style={inputStyle} value={party.state} onChange={e => updateParty("state",e.target.value)}>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Pincode"><input style={inputStyle} value={party.pincode} onChange={e => updateParty("pincode",e.target.value)} placeholder="500001" maxLength={6} /></FormField>
            </div>
            <FormField label="GST (Optional)"><input style={inputStyle} value={party.gst} onChange={e => updateParty("gst",e.target.value)} placeholder="GSTIN" /></FormField>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <input type="checkbox" checked={party.sameAsBilling} onChange={e => updateParty("sameAsBilling",e.target.checked)} id="sab" />
              <label htmlFor="sab" style={{ fontSize:13, color:"#555" }}>Shipping address same as billing</label>
            </div>
            {!party.sameAsBilling && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Shipping Address</div>
                <FormField label="Street / Area"><input style={inputStyle} value={party.shipStreet} onChange={e => updateParty("shipStreet",e.target.value)} placeholder="Street, area, landmark" /></FormField>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <FormField label="City"><input style={inputStyle} value={party.shipCity} onChange={e => updateParty("shipCity",e.target.value)} placeholder="City" /></FormField>
                  <FormField label="State">
                    <select style={inputStyle} value={party.shipState} onChange={e => updateParty("shipState",e.target.value)}>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Pincode"><input style={inputStyle} value={party.shipPincode} onChange={e => updateParty("shipPincode",e.target.value)} placeholder="500001" maxLength={6} /></FormField>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 1: // Basic Details
        return (
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:"#1a1a2e" }}>Document Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <FormField label={numLabel} required={docType !== "Dummy Bill"}><input style={{...inputStyle, ...(docType !== "Dummy Bill" && !docNumber ? {borderColor:"#ef4444"} : {})}} value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder={docType === "Quotation" ? "e.g. 1" : "e.g. FY27-01"} /></FormField>
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
                <input type="checkbox" checked={extras.laying} onChange={e => {
                  updateExtras("laying",e.target.checked);
                  if (e.target.checked && !extras.layingSqft) updateExtras("layingSqft", String(totalQty));
                }} id="ly" />
                <label htmlFor="ly" style={{ fontWeight:600 }}>Laying Charges</label>
              </div>
              {extras.laying && (
                <div>
                  <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.layingMode==="sqft"} onChange={() => updateExtras("layingMode","sqft")} /> Sqft × Rate</label>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.layingMode==="direct"} onChange={() => updateExtras("layingMode","direct")} /> Enter Total</label>
                  </div>
                  {extras.layingMode === "direct"
                    ? <FormField label="Total Amount (₹)"><input type="number" style={inputStyle} value={extras.layingTotal} onChange={e => updateExtras("layingTotal",e.target.value)} /></FormField>
                    : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <FormField label="Total Sqft"><input type="number" style={inputStyle} value={extras.layingSqft} onChange={e => updateExtras("layingSqft",e.target.value)} /></FormField>
                        <FormField label="Rate per Sqft (₹)"><input type="number" style={inputStyle} value={extras.layingRate} onChange={e => updateExtras("layingRate",e.target.value)} /></FormField>
                      </div>
                  }
                </div>
              )}
            </div>
            {/* Unloading */}
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #e5e7eb" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={extras.unloading} onChange={e => {
                  updateExtras("unloading",e.target.checked);
                  if (e.target.checked && !extras.unloadingSqft) updateExtras("unloadingSqft", String(totalQty));
                }} id="ul" />
                <label htmlFor="ul" style={{ fontWeight:600 }}>Unloading</label>
              </div>
              {extras.unloading && (
                <div>
                  <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.unloadingMode==="sqft"} onChange={() => updateExtras("unloadingMode","sqft")} /> Sqft × Rate</label>
                    <label style={{ fontSize:13 }}><input type="radio" checked={extras.unloadingMode==="direct"} onChange={() => updateExtras("unloadingMode","direct")} /> Enter Total</label>
                  </div>
                  {extras.unloadingMode === "direct"
                    ? <FormField label="Total Amount (₹)"><input type="number" style={inputStyle} value={extras.unloadingTotal} onChange={e => updateExtras("unloadingTotal",e.target.value)} /></FormField>
                    : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <FormField label="Total Sqft"><input type="number" style={inputStyle} value={extras.unloadingSqft} onChange={e => updateExtras("unloadingSqft",e.target.value)} /></FormField>
                        <FormField label="Rate per Sqft (₹)"><input type="number" style={inputStyle} value={extras.unloadingRate} onChange={e => updateExtras("unloadingRate",e.target.value)} /></FormField>
                      </div>
                  }
                </div>
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
              {unloadingAmt > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span>Unloading:</span><span>₹ {fmt(unloadingAmt)}</span></div>}
              {docType !== "Quotation" && (
                <FormField label="Received Amount (₹)">
                  <input type="number" style={{...inputStyle, marginTop:8}} value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder="Enter received amount" />
                </FormField>
              )}
              <hr style={{ border:"none", borderTop:"2px solid #c23152", margin:"12px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700 }}><span>Grand Total:</span><span style={{ color:"#c23152" }}>₹ {fmt(grandTotal)}</span></div>
              {docType !== "Quotation" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}><span>Received Amount:</span><span>₹ {fmt(receivedAmountValue)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontWeight:700 }}><span>Balance To Receive:</span><span>₹ {fmt(balanceAmount)}</span></div>
              </>}
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
        <h3 style={{ fontSize:18, fontWeight:700, color:"#1a1a2e" }}>{editingDocumentId ? "Edit Document" : "Document Preview"}</h3>
        <button onClick={handleDownloadPdf} style={btnPrimary}>Download PDF</button>
      </div>
      <div style={{ border:"1px solid #ccc", borderRadius:8, overflow:"auto", background:"#fff" }}>
        <PrintableDocument company={company} data={currentDocumentData} invoiceCSS={invoiceCSS} pageRef={pageRef} />
      </div>
    </div>
  );

  // History View
  if (view === "history" && company) {
    const invoices = historyDocs.filter(d => d.doc_type === "Invoice");
    const quotations = historyDocs.filter(d => d.doc_type === "Quotation");
    const listToShow = historyTab === "Invoice" ? invoices : quotations;
    const amountLabel = historyTab === "Invoice" ? "Balance" : "Amount";
    return (
      <div style={{ minHeight:"100vh", background:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background:"#1a1a2e", color:"#fff", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:isMobile ? "flex-start" : "center", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
            <button onClick={() => setView("landing")} style={{ background:"none", border:"none", color:"#e94560", cursor:"pointer", fontSize:18, fontWeight:700 }}>←</button>
            <img src={company.logo} alt="" style={{ width:32, height:32, borderRadius:6, background:"#fff" }} />
            <span style={{ fontWeight:600, fontSize:14, lineHeight:1.3 }}>{company.name}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", justifyContent:isMobile ? "flex-start" : "flex-end" }}>
            <span style={{ color:"#e0e0e0", fontSize:13, wordBreak:"break-word" }}>{authUser.fullName || authUser.username}</span>
            <button onClick={handleLogout} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12 }}>Logout</button>
          </div>
        </div>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 12px" }}>
          {/* Search */}
          <div style={{ marginBottom:16 }}>
            <input style={{...inputStyle, maxWidth:isMobile ? "100%" : 400}} placeholder="Search by party name..." value={historySearch} onChange={e => { setHistorySearch(e.target.value); fetchHistory(companyKey, e.target.value); }} />
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {["Invoice","Quotation"].map(tab => (
              <button key={tab} onClick={() => setHistoryTab(tab)} style={{ padding:"8px 20px", border:"none", borderRadius:8, background: historyTab===tab ? "#c23152" : "#e5e7eb", color: historyTab===tab ? "#fff" : "#374151", fontWeight:600, fontSize:14, cursor:"pointer" }}>
                {tab === "Invoice" ? `Sales (${invoices.length})` : `Quotes (${quotations.length})`}
              </button>
            ))}
          </div>
          {/* List */}
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
            {listToShow.length === 0 ? (
              <div style={{ padding:32, textAlign:"center", color:"#999" }}>No {historyTab === "Invoice" ? "invoices" : "quotations"} found</div>
            ) : isMobile ? (
              <div style={{ padding:12 }}>
                {listToShow.map((d) => (
                  <div key={d.id} style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:14, marginBottom:12, background:"#fff" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, color:"#111827", fontSize:15 }}>{d.doc_number}</div>
                        <div style={{ color:"#6b7280", fontSize:12, marginTop:2 }}>{parseStoredDate(d.doc_date)?.toLocaleDateString("en-IN") || "-"}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11, color:"#6b7280" }}>{amountLabel}</div>
                        <div style={{ fontWeight:700, color:"#111827" }}>₹ {fmt(historyTab === "Invoice" ? getHistoryBalance(d) : d.grand_total)}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom:6, fontWeight:600, color:"#1f2937" }}>{d.party_name}</div>
                    <div style={{ marginBottom:12, color:"#6b7280", fontSize:13 }}>{d.party_phone || "-"}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:8 }}>
                      {d.doc_type === "Invoice"
                        ? <button
                            onClick={() => handleWhatsappReminder(d)}
                            style={{ background:"#25D366", border:"none", borderRadius:10, minHeight:40, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center" }}
                            title="Send WhatsApp reminder"
                          >
                            <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                              <path fill="#fff" d="M19.11 17.33c-.27-.14-1.57-.77-1.82-.86-.24-.09-.42-.14-.6.14-.18.27-.69.86-.85 1.04-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.3-.79-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.42.12-.56.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.3.95 2.56 1.08 2.74.14.18 1.86 2.84 4.51 3.98.63.27 1.13.43 1.51.55.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.26.22-.62.22-1.15.15-1.26-.07-.11-.25-.18-.52-.32Zm-3.02 10.41h-.01a13.1 13.1 0 0 1-6.68-1.83l-.48-.28-4.96 1.3 1.33-4.83-.31-.5a13.02 13.02 0 0 1-2.01-6.96c0-7.18 5.84-13.02 13.02-13.02 3.48 0 6.74 1.36 9.2 3.82a12.93 12.93 0 0 1 3.81 9.2c0 7.18-5.84 13.02-13.01 13.02Zm11.07-24.09A15.56 15.56 0 0 0 16.01 0C7.18 0 0 7.18 0 16c0 2.82.74 5.57 2.14 8l-2.28 8.31 8.51-2.23A15.9 15.9 0 0 0 16.01 32C24.83 32 32 24.82 32 16a15.5 15.5 0 0 0-4.84-11.35Z" />
                            </svg>
                          </button>
                        : <div style={{ minHeight:40 }}></div>
                      }
                      <button onClick={() => handleHistoryEdit(d)} style={{ ...btnSecondary, padding:"10px 12px", fontSize:12 }}>Edit</button>
                      <button onClick={() => handleHistoryDelete(d)} style={{ ...btnSecondary, padding:"10px 12px", fontSize:12, color:"#b91c1c", borderColor:"#fecaca" }}>Delete</button>
                      <button onClick={() => handleHistoryDownload(d)} style={{ ...btnSecondary, padding:"10px 12px", fontSize:12 }}>Download PDF</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
                    <th style={{ padding:"10px 16px", textAlign:"left", fontWeight:600 }}>No.</th>
                    <th style={{ padding:"10px 16px", textAlign:"left", fontWeight:600 }}>Party</th>
                    <th style={{ padding:"10px 16px", textAlign:"left", fontWeight:600 }}>Phone</th>
                    <th style={{ padding:"10px 16px", textAlign:"left", fontWeight:600 }}>Date</th>
                    <th style={{ padding:"10px 16px", textAlign:"right", fontWeight:600 }}>{amountLabel}</th>
                    <th style={{ padding:"10px 16px", textAlign:"center", fontWeight:600 }}>WhatsApp</th>
                    <th style={{ padding:"10px 16px", textAlign:"center", fontWeight:600 }}>Edit</th>
                    <th style={{ padding:"10px 16px", textAlign:"center", fontWeight:600 }}>Delete</th>
                    <th style={{ padding:"10px 16px", textAlign:"center", fontWeight:600 }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {listToShow.map(d => (
                    <tr key={d.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                      <td style={{ padding:"10px 16px", fontWeight:600 }}>{d.doc_number}</td>
                      <td style={{ padding:"10px 16px" }}>{d.party_name}</td>
                      <td style={{ padding:"10px 16px", color:"#666" }}>{d.party_phone || "-"}</td>
                      <td style={{ padding:"10px 16px", color:"#666" }}>{parseStoredDate(d.doc_date)?.toLocaleDateString("en-IN") || "-"}</td>
                      <td style={{ padding:"10px 16px", textAlign:"right", fontWeight:600 }}>₹ {fmt(historyTab === "Invoice" ? getHistoryBalance(d) : d.grand_total)}</td>
                      <td style={{ padding:"10px 16px", textAlign:"center" }}>
                        {d.doc_type === "Invoice"
                          ? <button
                              onClick={() => handleWhatsappReminder(d)}
                              style={{ background:"#25D366", border:"none", borderRadius:999, width:36, height:36, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center" }}
                              title="Send WhatsApp reminder"
                            >
                              <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                                <path fill="#fff" d="M19.11 17.33c-.27-.14-1.57-.77-1.82-.86-.24-.09-.42-.14-.6.14-.18.27-.69.86-.85 1.04-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.3-.79-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.42.12-.56.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.3.95 2.56 1.08 2.74.14.18 1.86 2.84 4.51 3.98.63.27 1.13.43 1.51.55.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.26.22-.62.22-1.15.15-1.26-.07-.11-.25-.18-.52-.32Zm-3.02 10.41h-.01a13.1 13.1 0 0 1-6.68-1.83l-.48-.28-4.96 1.3 1.33-4.83-.31-.5a13.02 13.02 0 0 1-2.01-6.96c0-7.18 5.84-13.02 13.02-13.02 3.48 0 6.74 1.36 9.2 3.82a12.93 12.93 0 0 1 3.81 9.2c0 7.18-5.84 13.02-13.01 13.02Zm11.07-24.09A15.56 15.56 0 0 0 16.01 0C7.18 0 0 7.18 0 16c0 2.82.74 5.57 2.14 8l-2.28 8.31 8.51-2.23A15.9 15.9 0 0 0 16.01 32C24.83 32 32 24.82 32 16a15.5 15.5 0 0 0-4.84-11.35Z" />
                              </svg>
                            </button>
                          : "-"
                        }
                      </td>
                      <td style={{ padding:"10px 16px", textAlign:"center" }}>
                        <button onClick={() => handleHistoryEdit(d)} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12 }}>Edit</button>
                      </td>
                      <td style={{ padding:"10px 16px", textAlign:"center" }}>
                        <button onClick={() => handleHistoryDelete(d)} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12, color:"#b91c1c", borderColor:"#fecaca" }}>Delete</button>
                      </td>
                      <td style={{ padding:"10px 16px", textAlign:"center" }}>
                        <button onClick={() => handleHistoryDownload(d)} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12 }}>Download PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {historyDownloadDoc && (
          <div style={{ position:"fixed", left:-10000, top:0, width:"210mm", background:"#fff", pointerEvents:"none" }}>
            <PrintableDocument company={company} data={historyDownloadDoc} invoiceCSS={invoiceCSS} pageRef={historyPageRef} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f3f4f6", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => { setView("landing"); setStep(0); }} style={{ background:"none", border:"none", color:"#e94560", cursor:"pointer", fontSize:18, fontWeight:700 }}>←</button>
          <img src={company.logo} alt="" style={{ width:32, height:32, borderRadius:6, background:"#fff" }} />
          <span style={{ fontWeight:600, fontSize:14 }}>{company.name}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ color:"#e0e0e0", fontSize:13 }}>{authUser.fullName || authUser.username}</span>
          <span style={{ background:"rgba(233,69,96,0.2)", color:"#e94560", padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:600 }}>{docType}</span>
          <button onClick={handleLogout} style={{ ...btnSecondary, padding:"8px 14px", fontSize:12 }}>Logout</button>
        </div>
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
            ? <button onClick={() => {
                if (step === 1 && docType !== "Dummy Bill" && !docNumber.trim()) { alert("Document number is required."); return; }
                setStep(step+1);
              }} style={btnPrimary}>Next →</button>
            : <button onClick={handleDownloadPdf} style={btnPrimary}>Download PDF</button>
          }
        </div>
      </div>
    </div>
  );
}
