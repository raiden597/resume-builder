import { useState, useRef } from "react";

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
  const previewRef = useRef(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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

Instructions:
- Write a compelling professional summary (2-3 sentences)
- Format experience as bullet points starting with strong action verbs
- Tailor content to the job description if provided
- Include a skills section organized by category
- Keep it concise, impactful, and professional
- Use markdown formatting with ## for sections, **bold** for job titles/companies
- Return ONLY the resume content, no commentary`;

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
          model: "google/gemma-3-12b-it:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "API request failed");
      }

      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response received");
      setResume(text);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return (
          <h2 key={i} className="font-serif text-amber-400 text-base uppercase tracking-widest mt-6 mb-2 border-b border-stone-700 pb-1">
            {line.slice(3)}
          </h2>
        );
      if (line.startsWith("# "))
        return (
          <h1 key={i} className="font-serif text-2xl text-stone-100 mb-1">
            {line.slice(2)}
          </h1>
        );
      if (line.startsWith("- ")) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return (
          <li key={i} className="text-stone-300 text-sm leading-relaxed ml-3 list-disc font-mono"
            dangerouslySetInnerHTML={{ __html: content }} />
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      const content = line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-stone-100'>$1</strong>");
      return (
        <p key={i} className="text-stone-400 text-sm leading-relaxed font-mono"
          dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
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
      `}</style>

      {/* Header */}
      <header className="border-b border-stone-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-amber-500 flex items-center justify-center">
            <span className="text-stone-950 text-xs font-bold">R</span>
          </div>
          <span className="font-serif text-lg tracking-wide">ResuméAI</span>
          <span className="text-stone-600 text-xs font-mono ml-2 hidden sm:block">— craft your story</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-stone-500 text-xs font-mono">llama-powered · free</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        {/* LEFT: Form */}
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
              <textarea
                id="experience" rows={5} value={form.experience} onChange={update("experience")}
                placeholder={`Senior Dev at Acme Corp (2020–2024)\n• Led migration to microservices\n• Managed team of 6 engineers\n\nDev at StartupXYZ (2017–2020)\n• Built React dashboards`}
                className={inputClass}
              />
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
          </div>

          {error && (
            <div className="border border-red-800/50 bg-red-950/30 rounded-sm px-3 py-2.5 text-red-400 text-xs font-mono fade-in">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={generateResume}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-mono font-medium text-sm px-6 py-3.5 rounded-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="text-stone-400 text-xs">Generating</span><LoadingDots /></>
            ) : (
              <><span>✦</span><span>Generate Resume</span></>
            )}
          </button>

          <p className="text-stone-700 text-xs font-mono text-center">
            Powered by OpenRouter · Free · No data stored
          </p>
        </div>

        {/* RIGHT: Preview */}
        <div className="flex-1 bg-stone-900/40 p-8 lg:p-12 overflow-y-auto" ref={previewRef}>
          {!resume && !loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center py-20">
              <div className="w-20 h-20 rounded-full border border-stone-700 flex items-center justify-center">
                <span className="text-3xl text-stone-600">✦</span>
              </div>
              <div>
                <p className="font-serif text-stone-400 text-xl mb-2">Your resume preview</p>
                <p className="text-stone-600 text-xs font-mono max-w-xs">
                  Fill in your details and click Generate to create a tailored, professional resume.
                </p>
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
              <div className="bg-stone-950 border border-stone-800 rounded-sm p-8 lg:p-10 shadow-2xl">
                {renderMarkdown(resume)}
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={() => {
                    const blob = new Blob([resume], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${form.name.replace(/\s+/g, "_")}_Resume.txt`;
                    a.click();
                  }}
                  className="flex items-center gap-2 border border-stone-700 hover:border-amber-500/50 hover:text-amber-400 text-stone-400 text-xs font-mono px-4 py-2.5 rounded-sm transition-all"
                >
                  ↓ Download .txt
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(resume)}
                  className="flex items-center gap-2 border border-stone-700 hover:border-amber-500/50 hover:text-amber-400 text-stone-400 text-xs font-mono px-4 py-2.5 rounded-sm transition-all"
                >
                  ⎘ Copy to Clipboard
                </button>
                <button
                  onClick={() => setResume(null)}
                  className="flex items-center gap-2 border border-stone-700 hover:border-stone-500 text-stone-600 text-xs font-mono px-4 py-2.5 rounded-sm transition-all ml-auto"
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}