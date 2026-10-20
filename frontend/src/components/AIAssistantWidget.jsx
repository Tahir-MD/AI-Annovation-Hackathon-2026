import React, { useEffect, useRef, useState } from "react";
import { SparkleIcon, SendIcon } from "./Icons.jsx";
import {
  getAiStatus, askDonorAssistant, askReceiverAssistant, askHospitalAssistant,
  askAdminAssistant, askStaffAssistant, askGuestAssistant,
} from "../services/api";

const ASK_FUNCTIONS = {
  donor: askDonorAssistant,
  receiver: askReceiverAssistant,
  hospital: askHospitalAssistant,
  admin: askAdminAssistant,
  staff: askStaffAssistant,
  guest: askGuestAssistant,
};

const WELCOME_MESSAGE = {
  donor: "Hi! I'm your LifeFlow assistant. Ask me about eligibility, points, matching, or how to read a request before accepting it.",
  receiver: "Hi! I'm your LifeFlow assistant. Ask me about your request status, the stock-check-first process, or how to rate a donor.",
  hospital: "Hi! I'm your LifeFlow assistant. Ask me about your inventory, shortage forecasts, staff shifts, or donor matching.",
  admin: "Hi! I'm your LifeFlow assistant. Ask me about platform-wide trends, moderation, or how any feature works.",
  staff: "Hi! I'm your LifeFlow assistant. Ask me how to log a visitor, or how to print your shift record at the end of duty.",
  guest: "Hi! I'm the LifeFlow assistant. Ask me how LifeFlow works, how blood type matching works, or how to register as a donor, patient, or hospital.",
};

export default function AIAssistantWidget({ role }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getAiStatus()
      .then((response) => setIsConfigured(response.data.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const askFunction = ASK_FUNCTIONS[role];
    setMessages((prev) => [...prev, { from: "user", text }]);
    setDraft("");
    setIsSending(true);
    try {
      const response = await askFunction(text);
      setMessages((prev) => [...prev, { from: "ai", text: response.data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { from: "ai", text: "Sorry, something went wrong reaching the assistant. Please try again." }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="ai-widget">
      {isOpen && (
        <div className="ai-panel">
          <div className="ai-panel-head">
            <span><SparkleIcon size={17} color="#B01E28" /> LifeFlow AI assistant</span>
            <button className="ai-panel-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="ai-panel-body" ref={scrollRef}>
            {isConfigured === false && (
              <div className="ai-bubble ai-bubble-ai">
                The AI assistant isn't turned on for this server yet. Ask your admin to set the
                <code> GROQ_API_KEY</code> environment variable (a free key is available at
                console.groq.com/keys) and restart the backend.
              </div>
            )}
            {isConfigured !== false && <div className="ai-bubble ai-bubble-ai">{WELCOME_MESSAGE[role]}</div>}
            {messages.map((message, index) => (
              <div className={`ai-bubble ${message.from === "user" ? "ai-bubble-user" : "ai-bubble-ai"}`} key={index}>
                {message.text}
              </div>
            ))}
            {isSending && <div className="ai-bubble ai-bubble-ai ai-bubble-typing">Thinking…</div>}
          </div>
          <form className="ai-panel-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask anything about LifeFlow…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" aria-label="Send" disabled={isSending}><SendIcon size={16} color="#fff" /></button>
          </form>
        </div>
      )}
      <button className="ai-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Open AI assistant">
        <SparkleIcon size={22} color="#fff" />
      </button>
    </div>
  );
}
