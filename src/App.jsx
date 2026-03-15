import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";

const LoadingDots = () => (
  <span className="inline-flex gap-1 items-center">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </span>
);

const InputField = ({ label, id, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs tracking-widest uppercase font-mono text-stone-400">
      {label}
    </label>
    {children}
  </div>
);

const inputClass =
  "bg-stone-900 border border-stone-700 rounded-sm px-3 py-2.5 text-stone-100 font-mono text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors resize-none w-full";

const templates = {
  classic: {
    h1: "font-serif text-2xl text-stone-100 mb-1",
    h2: "font-serif text-amber-400 text-base uppercase tracking-widest mt-6 mb-2 border-b border-stone-700 pb-1",
    li: "text-stone-300 text-sm leading-relaxed ml-3 list-disc font-mono",
    p: "text-stone-400 text-sm leading-relaxed font-mono",
  },
  modern: {
    h1: "text-3xl font-bold text-white mb-1 tracking-tight",
    h2: "text-sm font-bold text-emerald-400 uppercase tracking-widest mt-6 mb-2 border-l-2 border-emerald-400 pl-3",
    li: "text-stone-300 text-sm leading-relaxed ml-4 list-disc",
    p: "text-stone-300 text-sm leading-relaxed",
  },
  minimal: {
    h1: "text-2xl font-light text-stone-100 mb-1 tracking-widest uppercase",
    h2: "text-xs text-stone-500 uppercase tracking-widest mt-8 mb-3 font-mono",
    li: "text-stone-400 text-sm leading-relaxed ml-3 list-disc font-light",
    p: "text-stone-400 text-sm leading-relaxed font-light",
  },
};

export default function ResumeGenerator() {
  const [form, setForm] = useState({
    name: "",
    title: "",
    email: "",
    experience: "",
    skills: "",
    jobDescription: "",
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paid, setPaid] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [template, setTemplate] = useState("classic");
  const previewRef = useRef(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaid = params.get("paid") === "true";
    const hasResume = !!sessionStorage.getItem("resume");
    const wasRedirected = !!sessionStorage.getItem("redirected");

    if (!isPaid || !hasResume || !wasRedirected) return;

    const verifyPayment = async () => {
      setVerifying(true);
      try {
        const res = await fetch("/.netlify/functions/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_link_id: params.get("razorpay_payment_link_id"),
            razorpay_payment_link_reference_id: params.get("razorpay_payment_link_reference_id"),
            razorpay_payment_link_status: params.get("razorpay_payment_link_status"),
            razorpay_payment_id: params.get("razorpay_payment_id"),
            razorpay_signature: params.get("razorpay_signature"),
          }),
        });

        const data = await res.json();

        if (data.verified) {
          const savedResume = sessionStorage.getItem("resume");
          const savedForm = sessionStorage.getItem("resumeForm");
          const savedTemplate = sessionStorage.getItem("resumeTemplate");
          if (savedResume) setResume(savedResume);
          if (savedForm) setForm(JSON.parse(savedForm));
          if (savedTemplate) setTemplate(savedTemplate);
          setPaid(true);
          sessionStorage.removeItem("redirected");
          window.history.replaceState({}, "", "/");
        } else {
          setError("Payment verification failed. Please contact support.");
        }
      } catch (err) {
        setError("Could not verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, []);

  const generateResume = async () => {
    if (!form.name || !form.experience || !form.skills) {
      setError("Please fill in Name, Experience, and Skills at minimum.");
      return;
    }
    setError(null);
    setLoading(true);
    setResume(null);

    const prompt = `You are a professional resume writer. Create a polished, ATS-optimized resume in clean markdown format.

Candidate Info:
- Name: ${form.name}
- Professional Title: ${form.title || "Professional"}
- Email: ${form.email || ""}
- Work Experience: ${form.experience}
- Skills: ${form.skills}
${form.jobDescription ? `\nTarget Job Description:\n${form.jobDescription}` : ""}

STRICT FORMATTING RULES — follow exactly:
- Start with # Full Name on line 1
- Every section MUST start with ## (e.g. ## Professional Summary)
- ALWAYS put a blank line before and after every ## heading
- Use ONLY - for bullet points, never use * or •
- Use **bold** only for job titles and company names
- Do NOT merge a heading and text on the same line
- Write a compelling 2-3 sentence professional summary
- Include skills organized by category
- Return ONLY the resume, no extra commentary`;

    try {
      const models = [
        "openai/gpt-oss-20b:free",
        "openai/gpt-oss-120b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "qwen/qwen3-4b:free",
        "google/gemma-3-12b-it:free",
        "google/gemma-3-27b-it:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
      ];

      let text = null;
      for (const model of models) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
              "HTTP-Referer": window.location.href,
              "X-Title": "ResumeAI",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
            }),
          });
          const data = await res.json();
          if (!res.ok) continue;
          text = data.choices?.[0]?.message?.content;
          if (text) break;
        } catch {
          continue;
        }
      }

      if (!text) throw new Error("All models are busy. Please try again in a few minutes.");
      text = text.replace(/^```markdown\n?/i, "").replace(/^```\n?/, "").replace(/```$/, "").trim();
      text = text.replace(/^(#{1,3})([^ #])/gm, "$1 $2");
      // Bold short job title lines containing "at" or a year
text = text.replace(/^\* (.{5,80}(?:\bat\b|\d{4}).{0,40})$/gm, (match, p1) => {
  return p1.length < 80 ? `**${p1}**` : `- ${p1}`;
});
// Convert remaining * bullets to -
text = text.replace(/^\* /gm, "- ");
      setResume(text);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    const t = templates[template];
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return <h2 key={i} className={t.h2}>{line.slice(3)}</h2>;
      if (line.startsWith("# "))
        return <h1 key={i} className={t.h1}>{line.slice(2)}</h1>;
      if (line.startsWith("- ")) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return <li key={i} className={t.li} dangerouslySetInnerHTML={{ __html: content }} />;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      const content = line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-stone-100'>$1</strong>");
      return <p key={i} className={t.p} dangerouslySetInnerHTML={{ __html: content }} />;
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "Failed to create payment link");
      sessionStorage.setItem("resume", resume);
      sessionStorage.setItem("resumeForm", JSON.stringify(form));
      sessionStorage.setItem("resumeTemplate", template);
      sessionStorage.setItem("redirected", "true");
      window.location.href = data.url;
    } catch (err) {
      setError(`Payment error: ${err.message}`);
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const accentColor = {
      classic: [180, 120, 0],
      modern: [52, 211, 153],
      minimal: [120, 120, 120],
    }[template];

    resume.split("\n").forEach((line) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (line.startsWith("# ")) {
        doc.setFont("helvetica", template === "minimal" ? "normal" : "bold");
        doc.setFontSize(template === "minimal" ? 16 : 20);
        doc.setTextColor(30, 30, 30);
        doc.text(line.slice(2), margin, y); y += 10;
      } else if (line.startsWith("## ")) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.setTextColor(...accentColor);
        if (template === "modern") {
          doc.setFillColor(...accentColor);
          doc.rect(margin, y - 4, 2, 5, "F");
          doc.text(line.slice(3).toUpperCase(), margin + 5, y);
        } else {
          doc.text(line.slice(3).toUpperCase(), margin, y);
          if (template === "classic") {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y + 1, pageWidth - margin, y + 1);
          }
        }
        y += 8;
      } else if (line.startsWith("- ")) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        const cleaned = line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1");
        doc.splitTextToSize(`• ${cleaned}`, maxWidth - 5).forEach((l) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(l, margin + 3, y); y += 5;
        });
      } else if (line.trim() === "") {
        y += 3;
      } else {
        const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
        doc.setFont("helvetica", line.includes("**") ? "bold" : "normal");
        doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        doc.splitTextToSize(cleaned, maxWidth).forEach((l) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(l, margin, y); y += 5;
        });
      }
    });

    doc.save(`${form.name.replace(/\s+/g, "_")}_Resume_${template}.pdf`);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Mono:wght@300;400;500&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1c1917; }
        ::-webkit-scrollbar-thumb { background: #44403c; border-radius: 2px; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeSlideIn 0.4s ease-out forwards; }
        .blur-paywall { -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 70%); mask-image: linear-gradient(to bottom, black 30%, transparent 70%); }
      `}</style>

      <header className="border-b border-stone-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-amber-500 flex items-center justify-center">
            <span className="text-stone-950 text-xs font-bold">R</span>
          </div>
          <span className="font-serif text-lg tracking-wide">ResuméAI</span>
          <span className="text-stone-600 text-xs font-mono ml-2 hidden sm:block">— craft your story</span>
        </div>
        <div className="flex items-center gap-2">
          {paid && <span className="text-amber-500 text-xs font-mono border border-amber-500/30 px-2 py-0.5 rounded-sm">✦ unlocked</span>}
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-stone-500 text-xs font-mono">ai-powered</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        <div className="w-full lg:w-[420px] lg:min-w-[420px] border-r border-stone-800 p-8 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="font-serif text-xl text-stone-100 mb-1">Build Your Resume</h2>
            <p className="text-stone-500 text-xs font-mono">Fill in your details. AI does the rest.</p>
          </div>

          <div className="h-px bg-stone-800" />

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Full Name *" id="name">
                <input id="name" value={form.name} onChange={update("name")} placeholder="Jane Smith" className={inputClass} />
              </InputField>
              <InputField label="Job Title" id="title">
                <input id="title" value={form.title} onChange={update("title")} placeholder="Sr. Engineer" className={inputClass} />
              </InputField>
            </div>
            <InputField label="Email" id="email">
              <input id="email" value={form.email} onChange={update("email")} placeholder="jane@example.com" className={inputClass} />
            </InputField>
            <InputField label="Work Experience *" id="experience">
              <textarea id="experience" rows={5} value={form.experience} onChange={update("experience")}
                placeholder={`Senior Dev at Acme Corp (2020–2024)\n• Led migration to microservices\n• Managed team of 6 engineers\n\nDev at StartupXYZ (2017–2020)\n• Built React dashboards`}
                className={inputClass} />
            </InputField>
            <InputField label="Skills *" id="skills">
              <textarea id="skills" rows={3} value={form.skills} onChange={update("skills")}
                placeholder="React, TypeScript, Node.js, AWS, PostgreSQL, Python" className={inputClass} />
            </InputField>
            <div className="h-px bg-stone-800" />
            <InputField label="Target Job Description (optional)" id="jobDescription">
              <textarea id="jobDescription" rows={4} value={form.jobDescription} onChange={update("jobDescription")}
                placeholder="Paste the job description here to tailor your resume..." className={inputClass} />
            </InputField>

            {/* Template Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-widest uppercase font-mono text-stone-400">Template</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "classic", label: "Classic", dot: "bg-amber-500" },
                  { id: "modern", label: "Modern", dot: "bg-emerald-500" },
                  { id: "minimal", label: "Minimal", dot: "bg-stone-400" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`py-2.5 text-xs font-mono rounded-sm border transition-all flex flex-col items-center gap-1.5 ${
                      template === t.id
                        ? "border-amber-500 text-amber-400 bg-amber-500/10"
                        : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-400"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${t.dot}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="border border-red-800/50 bg-red-950/30 rounded-sm px-3 py-2.5 text-red-400 text-xs font-mono fade-in">
              ⚠ {error}
            </div>
          )}

          <button onClick={generateResume} disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-mono font-medium text-sm px-6 py-3.5 rounded-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2">
            {loading ? <><span className="text-stone-400 text-xs">Generating</span><LoadingDots /></> : <><span>✦</span><span>Generate Resume</span></>}
          </button>

          <div className="border border-stone-800 rounded-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-xs font-mono">Preview</span>
              <span className="text-stone-400 text-xs font-mono">Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-xs font-mono">Full Resume + PDF Download</span>
              <span className="text-amber-400 text-xs font-mono">₹9 (Limited Time)</span>
            </div>
            <div className="h-px bg-stone-800 my-1" />
            <p className="text-stone-600 text-xs font-mono">One-time payment · Instant unlock · No subscription</p>
          </div>

          <p className="text-stone-700 text-xs font-mono text-center">Powered by OpenRouter · No data stored</p>
        </div>

        <div className="flex-1 bg-stone-900/40 p-8 lg:p-12 overflow-y-auto" ref={previewRef}>
          {verifying ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <LoadingDots />
              <p className="text-stone-500 text-xs font-mono animate-pulse">Verifying payment...</p>
            </div>
          ) : !resume && !loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center py-20">
              <div className="w-20 h-20 rounded-full border border-stone-700 flex items-center justify-center">
                <span className="text-3xl text-stone-600">✦</span>
              </div>
              <div>
                <p className="font-serif text-stone-400 text-xl mb-2">Your resume preview</p>
                <p className="text-stone-600 text-xs font-mono max-w-xs">Fill in your details and click Generate to create a tailored, professional resume.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {["Professional Summary", "Work Experience", "Skills"].map((s) => (
                  <div key={s} className="border border-stone-800 rounded-sm px-3 py-1.5 text-stone-600 text-xs font-mono">{s}</div>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <LoadingDots />
              <p className="text-stone-500 text-xs font-mono animate-pulse">Crafting your resume...</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto fade-in">
              {/* Template badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-stone-600 text-xs font-mono">Template:</span>
                <span className="text-xs font-mono capitalize px-2 py-0.5 rounded-sm border border-stone-700 text-stone-400">
                  {template}
                </span>
                {!paid && (
                  <span className="text-xs font-mono text-stone-600 ml-auto">switch template anytime</span>
                )}
              </div>

              <div className="relative bg-stone-950 border border-stone-800 rounded-sm shadow-2xl overflow-hidden">
                <div className={`p-8 lg:p-10 ${!paid ? "blur-paywall" : ""}`}>
                  {renderMarkdown(resume)}
                </div>
                {!paid && (
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center pb-10 pt-20"
                    style={{ background: "linear-gradient(to bottom, transparent, #0c0a09 40%)" }}>
                    <div className="text-center px-6">
                      <div className="w-10 h-10 rounded-full border border-amber-500/40 flex items-center justify-center mx-auto mb-3">
                        <span className="text-amber-500 text-lg">🔒</span>
                      </div>
                      <p className="font-serif text-stone-200 text-lg mb-1">Your resume is ready</p>
                      <p className="text-stone-500 text-xs font-mono mb-5">Unlock to download as PDF</p>
                      <button onClick={handlePayment} disabled={loading}
                        className="bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-mono font-medium text-sm px-8 py-3.5 rounded-sm tracking-wider uppercase transition-all duration-200 inline-flex items-center gap-2 shadow-lg">
                        {loading ? <><span className="text-stone-400 text-xs">Please wait</span><LoadingDots /></> : <>✦ Unlock Full Resume — ₹9</>}
                      </button>
                      <p className="text-stone-600 text-xs font-mono mt-3">One-time payment · Secure checkout via Razorpay</p>
                    </div>
                  </div>
                )}
              </div>

              {paid && (
                <div className="flex flex-wrap gap-3 mt-5 fade-in">
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-mono mb-1 w-full">
                    ✦ Full resume unlocked
                  </div>
                  <button onClick={downloadPDF}
                    className="flex items-center gap-2 border border-amber-500/50 hover:border-amber-400 hover:text-amber-400 text-amber-500 text-xs font-mono px-4 py-2.5 rounded-sm transition-all">
                    ↓ Download PDF
                  </button>
                  <button onClick={() => {
                    const blob = new Blob([resume], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${form.name.replace(/\s+/g, "_")}_Resume.txt`;
                    a.click();
                  }} className="flex items-center gap-2 border border-stone-700 hover:border-amber-500/50 hover:text-amber-400 text-stone-400 text-xs font-mono px-4 py-2.5 rounded-sm transition-all">
                    ↓ Download .txt
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(resume)}
                    className="flex items-center gap-2 border border-stone-700 hover:border-amber-500/50 hover:text-amber-400 text-stone-400 text-xs font-mono px-4 py-2.5 rounded-sm transition-all">
                    ⎘ Copy to Clipboard
                  </button>
                  <button onClick={() => { setResume(null); setPaid(false); sessionStorage.clear(); }}
                    className="flex items-center gap-2 border border-stone-700 hover:border-stone-500 text-stone-600 text-xs font-mono px-4 py-2.5 rounded-sm transition-all ml-auto">
                    ↺ Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}