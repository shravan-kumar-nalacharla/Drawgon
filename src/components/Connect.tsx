import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { Field } from "./Primitives";
import {
  getGeminiApiKey,
  removeGeminiApiKey,
  setGeminiApiKey,
} from "../services/session";
import { validateKey } from "../services/gemini/client";
export function Connect({
  model,
  setModel,
  onContinue,
  onConnection,
}: {
  model: string;
  setModel: (v: string) => void;
  onContinue: () => void;
  onConnection: (v: boolean) => void;
}) {
  const [key, setKey] = useState(getGeminiApiKey),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [valid, setValid] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function validate() {
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    try {
      await validateKey(key.trim(), model, c.signal);
      c.signal.throwIfAborted();
      setGeminiApiKey(key);
      setValid(true);
      onConnection(true);
    } catch (e) {
      if (!c.signal.aborted) {
        setError(e instanceof Error ? e.message : "Connection failed.");
        setValid(false);
        onConnection(false);
      }
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="connect-page">
      <div className="step-icon">
        <KeyRound size={25} />
      </div>
      <p className="eyebrow">YOUR KEY. YOUR CREATIVE SPACE.</p>
      <h1>Connect Gemini</h1>
      <p className="lede">
        Use your own Gemini API key. It stays in this browser session and is
        sent directly to Google.
      </p>
      <div className="connection-form">
        <Field label="Gemini API key">
          <div className="input-with-button">
            <input
              type={show ? "text" : "password"}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setValid(false);
                onConnection(false);
                removeGeminiApiKey();
              }}
              placeholder="Enter your Gemini API key"
            />
            <button
              className="icon-button"
              type="button"
              aria-label={show ? "Hide API key" : "Show API key"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </Field>
        <a
          className="small-link"
          href="https://ai.google.dev/gemini-api/docs/api-key"
          target="_blank"
          rel="noreferrer"
        >
          How do I get a Gemini API key? ↗
        </a>
        <details>
          <summary>Advanced Settings</summary>
          <Field label="Gemini model">
            <input
              disabled={busy}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setValid(false);
                onConnection(false);
              }}
            />
          </Field>
          <small>
            Availability and usage limits depend on your Google API project.
          </small>
        </details>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {valid && (
          <p role="status" className="notice success">
            Gemini connected
          </p>
        )}
        <div className="button-row">
          <button
            disabled={busy || !key.trim() || !model.trim()}
            onClick={validate}
          >
            {busy ? "Validating key…" : "Validate Key"}
          </button>
          <button
            className="primary"
            disabled={!valid || busy}
            onClick={onContinue}
          >
            Continue <ArrowRight size={17} />
          </button>
        </div>
        {key && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              removeGeminiApiKey();
              setKey("");
              setValid(false);
              onConnection(false);
            }}
          >
            Remove API key
          </button>
        )}
      </div>
      <div className="privacy-note">
        <ShieldCheck size={21} />
        <p>
          Your Gemini API key is stored only in this browser session and is
          never saved to our database — because this application has no
          database. Google’s API data policies apply to requests.
        </p>
      </div>
    </section>
  );
}
