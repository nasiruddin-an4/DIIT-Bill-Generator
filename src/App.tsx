import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  FileText,
  Settings2,
  Download,
  Bot,
  Sparkles,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { numberToWords } from "./utils/numberToWords";
import diitLogo from "./diitLogo.webp";
import metaLogo from "./Meta-Logo.png";
import JSZip from "jszip";

// @ts-ignore
import html2pdf from "html2pdf.js";

const generateReqRefNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(1, "0");

  const storageKey = `diit_req_seq_${year}_${month}`;
  let currentSeq = parseInt(localStorage.getItem(storageKey) || "0", 10);
  currentSeq += 1;

  localStorage.setItem(storageKey, currentSeq.toString());

  const seqPadded = currentSeq.toString().padStart(1, "0");
  return `Promotion/FB/${month}/${seqPadded}`;
};

const generateFbRefNumber = () => {
  return Array.from(
    { length: 12 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
};

const generateFbTransactionId = () => {
  const part1 = Array.from(
    { length: 16 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
  const part2 = Array.from(
    { length: 8 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
  return `${part1}-${part2}`;
};

const getRecommendation = (title: string) => {
  const upperTitle = title.toUpperCase();
  if (upperTitle.includes("MBA")) {
    return {
      recommendedBy: "Md. Omar Faruk",
      recommendedByTitle: "Assistant Professor & Head of the Department \nDIIT",
    };
  } else if (upperTitle.includes("MTHM")) {
    return {
      recommendedBy: "Md. Jahidul Islam Rony",
      recommendedByTitle: "Head of the Department, THM \nDIIT",
    };
  } else if (upperTitle.includes("THM")) {
    return {
      recommendedBy: "Md. Jahidul Islam Rony",
      recommendedByTitle: "Head of the Department, THM \nDIIT",
    };
  } else {
    return {
      recommendedBy: "Mahbubur Rahman",
      recommendedByTitle: "Assistant Director \nDIIT",
    };
  }
};

type BillType = "requisition" | "facebook";

interface BillItem {
  id: string;
  description: string;
  duration: string;
  amount: number;
}

interface BillData {
  refNo: string;
  date: string;
  subject: string;
  items: BillItem[];
  vatPercent: number;
  preparedBy: string;
  preparedByTitle: string;
  recommendedBy: string;
  recommendedByTitle: string;
  approvedBy: string;
  approvedByTitle: string;
}

interface FacebookCampaignItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  impressions: string;
  amount: number;
}

interface FacebookBillData {
  accountName: string;
  accountId: string;
  date: string;
  paymentMethod: string;
  refNumber: string;
  transactionId: string;
  items: FacebookCampaignItem[];
  vatPercent: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  filledData?: boolean;
}

const QUICK_ACTIONS = [
  { label: "🎓 DIIT Admission", prompt: "DIIT Admission Going on, 1st to 15th of this month, 30000 taka" },
  { label: "📚 MBA Program", prompt: "MBA Program Admission, 1st to 30th of this month, 25000 taka" },
  { label: "🏨 THM Program", prompt: "THM Program Admission, 1st to 15th of this month, 20000 taka" },
  { label: "🎯 Custom", prompt: "" },
];

export default function App() {
  const [billType, setBillType] = useState<BillType>("requisition");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBoth, setIsGeneratingBoth] = useState(false);
  const [adsTitle, setAdsTitle] = useState("DIIT Admission Going on");
  const [smartPrompt, setSmartPrompt] = useState("");
  const apiKey = process.env.GROQ_API_KEY || "";
  const [isProcessing, setIsProcessing] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm your DIIT Bill Assistant. Tell me about your Facebook promotion and I'll fill both bills instantly!\n\nTry: \"DIIT Admission, 1st to 15th March, 30000 taka\"",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const [data, setData] = useState<BillData>(() => ({
    refNo: generateReqRefNo(),
    date: new Date().toISOString().split("T")[0],
    subject:
      "Approval Request for Facebook Promotional Budget \u2013 \u201CDIIT Admission Going on\u201D",
    items: [
      {
        id: crypto.randomUUID(),
        description:
          "Promotion for \u201CDIIT Admission is Going On\u201D",
        duration: "15 Day",
        amount: 20000,
      },
    ],
    vatPercent: 18,
    preparedBy: "Sohana Morsalina",
    preparedByTitle:
      "Sr. Officer\nDaffodil Institute of IT (DIIT)",
    recommendedBy: "Mahbubur Rahman",
    recommendedByTitle: "Assistant Director\nDIIT",
    approvedBy: "Prof. Dr. Mohammed Shakhawat Hossain",
    approvedByTitle: "Principal, DIIT",
  }));

  const [fbData, setFbData] = useState<FacebookBillData>(() => ({
    accountName: "Blue_Space_AD Account",
    accountId: "2670376169783049",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Visa \u00B7 5602",
    refNumber: generateFbRefNumber(),
    transactionId: generateFbTransactionId(),
    items: [
      {
        id: crypto.randomUUID(),
        name: "DIIT ads \u201CAdmission Going on 26th Batch\u201D",
        startDate: "2026-03-24T00:00",
        endDate: "2026-03-16T23:59",
        impressions: "(ongoing)",
        amount: 30000,
      },
    ],
    vatPercent: 18,
  }));

  const subTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = (subTotal * data.vatPercent) / 100;
  const totalAmount = subTotal + vatAmount;
  const amountInWords = numberToWords(totalAmount);

  const fbSubTotal = fbData.items.reduce((sum, item) => sum + item.amount, 0);
  const fbVatAmount = (fbSubTotal * fbData.vatPercent) / 100;
  const fbTotalAmount = fbSubTotal + fbVatAmount;

  const addItem = () => {
    setData({
      ...data,
      items: [
        ...data.items,
        {
          id: crypto.randomUUID(),
          description: "",
          duration: "",
          amount: 0,
        },
      ],
    });
  };

  const removeItem = (id: string) => {
    if (data.items.length > 1) {
      setData({
        ...data,
        items: data.items.filter((item) => item.id !== id),
      });
    }
  };

  const updateItem = (
    id: string,
    field: keyof BillItem,
    value: string | number,
  ) => {
    setData({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    });
  };

  const addFbItem = () => {
    setFbData({
      ...fbData,
      items: [
        ...fbData.items,
        {
          id: crypto.randomUUID(),
          name: "",
          startDate: new Date().toISOString().slice(0, 16),
          endDate: new Date().toISOString().slice(0, 16),
          impressions: "",
          amount: 0,
        },
      ],
    });
  };

  const removeFbItem = (id: string) => {
    if (fbData.items.length > 1) {
      setFbData({
        ...fbData,
        items: fbData.items.filter((item) => item.id !== id),
      });
    }
  };

  const updateFbItem = (
    id: string,
    field: keyof FacebookCampaignItem,
    value: string | number,
  ) => {
    setFbData({
      ...fbData,
      items: fbData.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("bill-preview");
    if (!element) return;

    setIsGenerating(true);
    const opt = {
      margin: 0,
      filename: `${billType === "requisition" ? "Requisition_Bill" : "Facebook_Invoice"}_${(billType === "requisition" ? data.refNo : fbData.refNumber).replace(/\//g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    } as any;

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBoth = async () => {
    setIsGenerating(true);

    const zip = new JSZip();
    const originalType = billType;

    try {
      // 1. Generate Requisition Bill
      setBillType("requisition");
      await new Promise((resolve) => setTimeout(resolve, 500));

      const reqElement = document.getElementById("bill-preview");
      if (reqElement) {
        const opt = {
          margin: 0,
          filename: `Requisition_Bill_${data.refNo.replace(/\//g, "_")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        } as any;

        const reqBlob = await html2pdf()
          .set(opt)
          .from(reqElement)
          .output("blob");
        zip.file(opt.filename, reqBlob);
      }

      // 2. Generate Facebook Invoice
      setBillType("facebook");
      await new Promise((resolve) => setTimeout(resolve, 500));

      const fbElement = document.getElementById("bill-preview");
      if (fbElement) {
        const opt2 = {
          margin: 0,
          filename: `Facebook_Invoice_${fbData.refNumber.replace(/\//g, "_")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        } as any;

        const fbBlob = await html2pdf()
          .set(opt2)
          .from(fbElement)
          .output("blob");
        zip.file(opt2.filename, fbBlob);
      }

      // 3. Download the ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DIIT_Bills_${data.refNo.replace(/\//g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate zip", err);
    } finally {
      setBillType(originalType);
      setIsGeneratingBoth(false);
      setIsGenerating(false);
    }
  };

  const handleSmartFill = async () => {
    if (!smartPrompt) return;

    if (!apiKey) {
      alert(
        "GROQ_API_KEY is not set in your .env file.",
      );
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: `Extract the following details from this text: title, from_date (YYYY-MM-DD format), to_date (YYYY-MM-DD format), days (integer number, or null if not explicitly stated), amount (integer number). Return ONLY a valid JSON object with these exact keys. If a date is not given in full, guess the year as ${new Date().getFullYear()}. Text: "${smartPrompt}"`,
              },
            ],
            temperature: 0,
          }),
        },
      );

      const resData = await response.json();
      if (resData.error) throw new Error(resData.error.message);

      const textResponse = resData.choices[0].message.content;
      const cleanJson = textResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      applyParsedData(parsed);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to parse the text. Please ensure your API key is correct or check the prompt.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply parsed AI data to both bills
  const applyParsedData = (parsed: any) => {
    let calculatedDays = parsed.days;
    if (!calculatedDays && parsed.from_date && parsed.to_date) {
      const start = new Date(parsed.from_date);
      const end = new Date(parsed.to_date);
      calculatedDays =
        Math.round(
          Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
    }

    const newReqData = { ...data };
    newReqData.refNo = generateReqRefNo();
    if (parsed.title) {
      newReqData.subject = `Approval Request for Facebook Promotional Budget \u2013 \u201C${parsed.title}\u201D`;
      newReqData.items[0].description = `Promotion for \u201C${parsed.title}\u201D`;

      const rec = getRecommendation(parsed.title);
      newReqData.recommendedBy = rec.recommendedBy;
      newReqData.recommendedByTitle = rec.recommendedByTitle;

      setAdsTitle(parsed.title);
    }
    if (calculatedDays)
      newReqData.items[0].duration = `${calculatedDays} Day${calculatedDays > 1 ? "s" : ""}`;
    if (parsed.amount) newReqData.items[0].amount = Number(parsed.amount);
    if (parsed.from_date) newReqData.date = parsed.from_date;
    setData(newReqData);

    const newFbData = { ...fbData };
    newFbData.refNumber = generateFbRefNumber();
    newFbData.transactionId = generateFbTransactionId();
    if (parsed.title)
      newFbData.items[0].name = `DIIT ads \u201C${parsed.title}\u201D`;
    if (parsed.from_date) {
      newFbData.items[0].startDate = `${parsed.from_date}T00:00`;
      newFbData.date = parsed.from_date;
    }
    if (parsed.to_date)
      newFbData.items[0].endDate = `${parsed.to_date}T23:59`;
    if (parsed.amount) newFbData.items[0].amount = Number(parsed.amount);
    setFbData(newFbData);

    return { parsed, calculatedDays };
  };

  // Scroll chat to bottom
  const scrollChatToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Add message to chat
  const addMessage = (
    role: ChatMessage["role"],
    content: string,
    filledData?: boolean,
  ) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      filledData,
    };
    setChatMessages((prev) => [...prev, msg]);
    scrollChatToBottom();
    return msg;
  };

  // Main chat handler
  const handleChatSend = async (overrideInput?: string) => {
    const input = overrideInput || chatInput;
    if (!input.trim()) return;

    if (!apiKey) {
      addMessage(
        "assistant",
        "⚠️ GROQ_API_KEY is not set in the .env file. Please add it and restart the dev server.",
      );
      return;
    }

    // Add user message
    addMessage("user", input);
    setChatInput("");
    if (chatInputRef.current) chatInputRef.current.style.height = "auto";
    setIsAiTyping(true);

    // Build conversation context for the AI
    const currentData = {
      title: adsTitle,
      date: data.date,
      amount: data.items[0]?.amount,
      duration: data.items[0]?.duration,
      subject: data.subject,
    };

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a DIIT Bill Generator assistant. You help fill Facebook promotion bills for Daffodil Institute of IT (DIIT).

Current bill data: ${JSON.stringify(currentData)}
Current year: ${new Date().getFullYear()}

Your job is to extract or update bill details from user messages. Always respond with a JSON object with these keys:
- action: "fill" (new bill) or "update" (modify existing) or "chat" (just conversation)
- title: string or null
- from_date: YYYY-MM-DD or null
- to_date: YYYY-MM-DD or null
- days: integer or null
- amount: integer or null
- message: a friendly confirmation message describing what you did

If the user asks to change/update something specific (like amount, dates, title), set action to "update" and only include the fields being changed (set others to null).
If the user is asking a question or chatting, set action to "chat" and put your response in message.
If dates are partial (e.g. "1st to 15th March"), guess the full date using current year.

Return ONLY a valid JSON object, no markdown or extra text.`,
              },
              {
                role: "user",
                content: input,
              },
            ],
            temperature: 0,
          }),
        },
      );

      const resData = await response.json();
      if (resData.error) throw new Error(resData.error.message);

      const textResponse = resData.choices[0].message.content;
      const cleanJson = textResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.action === "chat") {
        addMessage("assistant", parsed.message || "I'm here to help!");
      } else {
        // Apply the data
        applyParsedData(parsed);

        // Build confirmation message
        let confirmMsg = parsed.message || "\u2705 Done! I've updated the bills.";
        const details: string[] = [];
        if (parsed.title) details.push(`\ud83d\udccc Title: ${parsed.title}`);
        if (parsed.from_date)
          details.push(`\ud83d\udcc5 From: ${parsed.from_date}`);
        if (parsed.to_date) details.push(`\ud83d\udcc5 To: ${parsed.to_date}`);
        if (parsed.amount)
          details.push(
            `\ud83d\udcb0 Amount: ${Number(parsed.amount).toLocaleString()} BDT`,
          );

        if (details.length > 0) {
          confirmMsg += "\n\n" + details.join("\n");
        }

        confirmMsg +=
          "\n\n\ud83d\udca1 You can say things like \"change amount to 50000\" or \"update dates to next month\" to make adjustments.";

        addMessage("assistant", confirmMsg, true);
      }
    } catch (err: any) {
      console.error(err);
      addMessage(
        "assistant",
        `\u274c Oops! Something went wrong: ${err.message || "Please check your API key and try again."}`,
      );
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle Enter key in chat
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden print:bg-white print:h-auto print:overflow-visible">
      {/* Top Header / Tab Switcher */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              DIIT Bill Generator
            </h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setBillType("requisition")}
              className={cn(
                "flex-1 sm:flex-none py-2 px-6 rounded-lg text-sm font-bold transition-all",
                billType === "requisition"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-700",
              )}
            >
              Requisition Bill
            </button>
            <button
              onClick={() => setBillType("facebook")}
              className={cn(
                "flex-1 sm:flex-none py-2 px-6 rounded-lg text-sm font-bold transition-all",
                billType === "facebook"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-700",
              )}
            >
              Facebook Bill
            </button>
          </div>

          <button
            onClick={handleDownloadBoth}
            disabled={isGenerating}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2 px-5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-200/50 hover:shadow-lg active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Download Both PDFs"}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Sidebar / Form */}
        <div className="w-full lg:w-[450px] shrink-0 bg-white border-r border-slate-200 px-8 py-4 pb-10 overflow-y-auto print:hidden">
          <div className="space-y-6">
            {/* AI Chat Assistant */}
            <section className="rounded-2xl border border-indigo-100/80 shadow-lg overflow-hidden bg-white">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    AI Bill Assistant
                  </h2>
                  <p className="text-[10px] text-indigo-200">
                    Powered by Groq • Llama 3.3
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-200 font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-3 py-2 bg-indigo-50/50 border-b border-indigo-100/50 flex gap-1.5 overflow-x-auto">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.prompt) {
                        handleChatSend(action.prompt);
                      } else {
                        chatInputRef.current?.focus();
                      }
                    }}
                    disabled={isAiTyping}
                    className="chip-glow shrink-0 px-2.5 py-1 bg-white border border-indigo-200/60 rounded-full text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Chat Messages Area */}
              <div className="h-[280px] overflow-y-auto chat-scrollbar px-3 py-3 space-y-3 bg-gradient-to-b from-slate-50/80 to-white">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "chat-message-enter flex",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mr-2 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-md"
                          : "bg-white border border-slate-200/80 text-slate-700 rounded-bl-md shadow-sm",
                        msg.filledData && "border-emerald-200 bg-emerald-50/50",
                      )}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <p
                        className={cn(
                          "text-[9px] mt-1 opacity-60",
                          msg.role === "user"
                            ? "text-indigo-200 text-right"
                            : "text-slate-400",
                        )}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isAiTyping && (
                  <div className="flex items-start gap-2 chat-message-enter">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="ai-shimmer px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                      <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full" />
                      <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full" />
                      <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>



              {/* Chat Input */}
              <div className="px-3 py-2 border-t border-slate-100 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type your bill details or ask a question..."
                    rows={1}
                    style={{ height: "auto" }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-none overflow-hidden transition-colors placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => handleChatSend()}
                    disabled={isAiTyping || !chatInput.trim()}
                    className="shrink-0 p-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 text-center">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </section>

            {billType === "requisition" ? (
              <>
                <section>
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> General Info
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-blue-600 mb-1">
                        Ads Title
                      </label>
                      <input
                        type="text"
                        value={adsTitle}
                        onChange={(e) => {
                          const title = e.target.value;
                          setAdsTitle(title);
                          const rec = getRecommendation(title);
                          setData((prev) => ({
                            ...prev,
                            subject: `Approval Request for Facebook Promotional Budget \u2013 \u201C${title}\u201D`,
                            recommendedBy: rec.recommendedBy,
                            recommendedByTitle: rec.recommendedByTitle,
                            items: prev.items.map((item) => ({
                              ...item,
                              description: `Promotion for \u201C${title}\u201D`,
                            })),
                          }));
                        }}
                        placeholder="e.g. DIIT Admission Going on"
                        className="w-full px-3 py-2 border-2 border-blue-200 bg-blue-50/50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={data.date}
                        onChange={(e) =>
                          setData({ ...data, date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Subject
                      </label>
                      <textarea
                        rows={2}
                        value={data.subject}
                        onChange={(e) =>
                          setData({ ...data, subject: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                      <Settings2 className="w-4 h-4" /> Item Details
                    </h2>
                    <button
                      onClick={addItem}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-bold transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-6">
                    {data.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative group"
                      >
                        {data.items.length > 1 && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Settings2 className="w-3 h-3 rotate-45" />
                          </button>
                        )}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Description {index + 1}
                            </label>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Duration
                              </label>
                              <input
                                type="text"
                                value={item.duration}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "duration",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Amount (BDT)
                              </label>
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "amount",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        VAT Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={data.vatPercent}
                        onChange={(e) =>
                          setData({
                            ...data,
                            vatPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Signatories
                  </h2>
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                        Prepared By
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={data.preparedBy}
                        onChange={(e) =>
                          setData({ ...data, preparedBy: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2"
                      />
                      <textarea
                        placeholder="Title/Dept"
                        style={{ height: "90px" }}
                        value={data.preparedByTitle}
                        onChange={(e) =>
                          setData({ ...data, preparedByTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                        Recommended By
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={data.recommendedBy}
                        onChange={(e) =>
                          setData({ ...data, recommendedBy: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2"
                      />
                      <textarea
                        placeholder="Title/Dept"
                        style={{ height: "60px" }}
                        value={data.recommendedByTitle}
                        onChange={(e) =>
                          setData({
                            ...data,
                            recommendedByTitle: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                        Approved By
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={data.approvedBy}
                        onChange={(e) =>
                          setData({ ...data, approvedBy: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2"
                      />
                      <textarea
                        placeholder="Title/Dept"
                        style={{ height: "50px" }}
                        value={data.approvedByTitle}
                        onChange={(e) =>
                          setData({ ...data, approvedByTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Account Info
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={fbData.accountName}
                        onChange={(e) =>
                          setFbData({ ...fbData, accountName: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account ID
                      </label>
                      <input
                        type="text"
                        value={fbData.accountId}
                        onChange={(e) =>
                          setFbData({ ...fbData, accountId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Transaction Details
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={fbData.date}
                        onChange={(e) =>
                          setFbData({ ...fbData, date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Payment Method
                      </label>
                      <input
                        type="text"
                        value={fbData.paymentMethod}
                        onChange={(e) =>
                          setFbData({
                            ...fbData,
                            paymentMethod: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
                        <span>Reference Number</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFbData({
                              ...fbData,
                              refNumber: generateFbRefNumber(),
                            })
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Generate New
                        </button>
                      </label>
                      <input
                        type="text"
                        value={fbData.refNumber}
                        onChange={(e) =>
                          setFbData({ ...fbData, refNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
                        <span>Transaction ID</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFbData({
                              ...fbData,
                              transactionId: generateFbTransactionId(),
                            })
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Generate New
                        </button>
                      </label>
                      <input
                        type="text"
                        value={fbData.transactionId}
                        onChange={(e) =>
                          setFbData({
                            ...fbData,
                            transactionId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                      <Settings2 className="w-4 h-4" /> Campaign Details
                    </h2>
                    <button
                      onClick={addFbItem}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-bold transition-colors"
                    >
                      + Add Campaign
                    </button>
                  </div>
                  <div className="space-y-8">
                    {fbData.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative group"
                      >
                        {fbData.items.length > 1 && (
                          <button
                            onClick={() => removeFbItem(item.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Settings2 className="w-3 h-3 rotate-45" />
                          </button>
                        )}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Campaign Name {index + 1}
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateFbItem(item.id, "name", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Start Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                value={item.startDate}
                                onChange={(e) =>
                                  updateFbItem(
                                    item.id,
                                    "startDate",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                End Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                value={item.endDate}
                                onChange={(e) =>
                                  updateFbItem(
                                    item.id,
                                    "endDate",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Impressions
                              </label>
                              <input
                                type="text"
                                value={item.impressions}
                                onChange={(e) =>
                                  updateFbItem(
                                    item.id,
                                    "impressions",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Amount (BDT)
                              </label>
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateFbItem(
                                    item.id,
                                    "amount",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        VAT Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={fbData.vatPercent}
                        onChange={(e) =>
                          setFbData({
                            ...fbData,
                            vatPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto flex flex-col items-center bg-slate-200/50 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="bill-preview"
            className="w-full max-w-[794px] print:w-full print:max-w-none"
          >
            {billType === "requisition" ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                className="w-full bg-white shadow-xl px-20 py-12 min-h-[1123px] flex flex-col print:shadow-none print:px-20 print:py-12 text-[16px]"
              >
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                  <img
                    src={diitLogo}
                    alt="DIIT Logo"
                    className="h-12 mb-2 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://picsum.photos/seed/diit/200/100";
                    }}
                  />
                  <p className="text-slate-800">
                    Daffodil Plaza, 4/2 Sobhanbag, Dhanmondi, Dhaka-1207
                  </p>
                </div>

                {/* Date */}
                <div className="mb-4">
                  <p className="font-bold mt-4">
                    {new Date(data.date)
                      .toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                      .replace(/\//g, ".")}
                  </p>
                </div>

                {/* Recipient */}
                <div className="mb-2">
                  <p>To</p>
                  <p className="font-bold">Principal</p>
                  <p>Daffodil Institute of IT (DIIT)</p>
                  <p className="font-bold mt-4">Subject: {data.subject}</p>
                </div>

                {/* Salutation & Body */}
                <div className="mb-2">
                  <p className="mb-2">Sir,</p>
                  <p className="leading-relaxed">
                    I would like to state that to inspire and connect with
                    prospective students and the public, we plan to run targeted
                    Facebook promotions for our{" "}
                    <span className="font-bold">{adsTitle}</span>. To ensure
                    wide digital reach and engagement, we seek your approval for
                    the following Facebook promotional budget.
                  </p>
                </div>

                {/* Table */}
                <div className="mb-2 overflow-hidden border-black/70">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="border border-black/30 px-4 py-2 w-10 text-center">
                          Sl.
                        </th>
                        <th className="border border-black/30 px-4 py-2">
                          Description
                        </th>
                        <th className="border border-black/30 px-4 py-2 w-28 text-center">
                          Duration
                        </th>
                        <th className="border border-black/30 px-4 py-2 w-24 text-center">
                          BDT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="border border-black/30 px-4 py-2 text-center">
                            {(index + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="border border-black/30 px-4 py-2 italic font-semibold text-sm">
                            {item.description}
                          </td>
                          <td className="border border-black/30 px-4 py-2 text-center">
                            {item.duration}
                          </td>
                          <td className="border border-black/30 px-4 py-2 text-right">
                            {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="border border-black/30 px-4 py-2"></td>
                        <td className="border border-black/30 px-4 py-2"></td>
                        <td className="border border-black/30 px-4 py-2 text-center text-sm">
                          VAT ({data.vatPercent}%)
                        </td>
                        <td className="border border-black/30 px-4 py-2 text-right">
                          {vatAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="border border-black/30 px-4 py-2"></td>
                        <td className="border border-black/30 px-4 py-2"></td>
                        <td className="border border-black/30 px-4 py-2 text-center text-sm font-bold">
                          Total BDT:
                        </td>
                        <td className="border border-black/30 px-4 py-2 text-right font-bold">
                          {totalAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="border border-black/30 px-4 py-2"
                          colSpan={4}
                        >
                          <span className="font-bold italic">In Words: </span>
                          <span className="italic">{amountInWords}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatories */}
                <div className="grid grid-cols-3 gap-8 pt-14 text-[13px]">
                  <div>
                    <p className="mb-12">With best regards,</p>
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-lg">{data.preparedBy}</p>
                      <p className="whitespace-pre-line">
                        {data.preparedByTitle}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-12">Recommended by:</p>
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-lg">{data.recommendedBy}</p>
                      <p className="whitespace-pre-line text-sm">
                        {data.recommendedByTitle}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-12">Approved by:</p>
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-lg">{data.approvedBy}</p>
                      <p className="whitespace-pre-line text-sm">
                        {data.approvedByTitle}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                className="w-full bg-white shadow-xl px-20 py-20 min-h-[1123px] flex flex-col print:shadow-none print:px-20 print:py-12 text-[14px]"
              >
                {/* Meta Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-slate-900">
                      Tax Invoice {fbData.accountName}
                    </h2>
                    <p className="text-slate-600">
                      Account ID: {fbData.accountId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={metaLogo}
                      alt=""
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                </div>

                <div className="w-full h-[1px] bg-slate-300 mb-8" />

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-4">
                  <div>
                    <p className="text-slate-600 font-medium">
                      Invoice/Payment Date
                    </p>
                    <p className="font-bold text-slate-900">
                      {new Date(fbData.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-bold">Paid</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Payment Method</p>
                    <p className="font-bold text-slate-900">
                      {fbData.paymentMethod}
                    </p>
                    <p className="text-slate-900">
                      Reference Number:{" "}
                      <span className="font-bold">{fbData.refNumber}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-[28px] font-bold text-slate-900">
                      {fbTotalAmount.toLocaleString()} BDT
                    </h3>
                    <p className="text-slate-600 text-[10px]">
                      VAT: {fbVatAmount.toLocaleString()} BDT (Rate:{" "}
                      {fbData.vatPercent}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium mb-1">
                      Transaction ID
                    </p>
                    <p className="font-bold text-slate-900">
                      {fbData.transactionId}
                    </p>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-slate-200 mb-20" />

                {/* Campaign Details */}
                <div className="mb-12">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    Campaign Details
                  </h3>
                  <div className="w-full h-[1px] bg-slate-300 mb-4" />

                  {fbData.items.map((item) => (
                    <div key={item.id} className="mb-10 last:mb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">
                            {item.name || "Untitled Campaign"}
                          </h4>
                          <p className="text-slate-600 text-[12px] flex justify-between gap-10">
                            <span>
                              From{" "}
                              {item.startDate
                                ? new Date(item.startDate).toLocaleString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )
                                : ""}{" "}
                              to{" "}
                              {item.endDate
                                ? new Date(item.endDate).toLocaleString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )
                                : ""}
                            </span>
                            <span>Impressions {item.impressions}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            BDT {item.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="w-full border-b border-dashed border-slate-300 mt-3" />
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-auto flex justify-between items-end text-slate-400">
                  <div>
                    <p>Facebook Ireland Limited</p>
                    <p>4 Grand Canal Square, Grand Canal Harbour</p>
                    <p>Dublin 2, Ireland</p>
                    <p>BIN: 003901928-0208</p>
                  </div>
                  <div>
                    <p>Bangladesh</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 w-full max-w-[800px] grid grid-cols-1 gap-4 print:hidden pb-12">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-sm transition-all shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-6 h-6" />
              <span className="text-lg">Print Document</span>
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #bill-preview {
            margin: 0;
            box-shadow: none;
            width: 210mm;
            max-width: 210mm;
            min-height: 297mm;
          }
        }
      `,
        }}
      />
    </div>
  );
}
