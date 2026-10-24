"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function JoinList() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  return (
    <section className="join-band" aria-labelledby="keep-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="join-band-bg" src="/charlie/keep-up.png" alt="" />
      <div className="join-band-front">
        <h2 id="keep-up">Keep up with me</h2>
        {done ? (
          <p className="join-ok">You&apos;re on it.</p>
        ) : (
          <form
            className="join-form"
            onSubmit={(event) => {
              event.preventDefault();
              const address = email.trim();
              if (!address) return;
              setError("");
              const supabase = createClient();
              void supabase
                .rpc("submit_lead", {
                  p_email: address,
                  p_source: "corenode",
                  p_website: website,
                })
                .then(({ data, error: rpcError }) => {
                  if (rpcError || data !== true) {
                    setError("Couldn't add that email. Try again in a bit.");
                    return;
                  }
                  setDone(true);
                });
            }}
          >
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email"
            />
            <input
              type="text"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
            />
            <button type="submit">Join</button>
            {error ? <p className="join-ok">{error}</p> : null}
          </form>
        )}
      </div>
    </section>
  );
}
