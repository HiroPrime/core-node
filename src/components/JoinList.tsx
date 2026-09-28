"use client";

import { useState } from "react";

export function JoinList() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="join-band" aria-labelledby="keep-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="join-band-bg" src="/charlie/keep-up.jpg" alt="" />
      <div className="join-band-front">
        <h2 id="keep-up">Keep up with me</h2>
        {done ? (
          <p className="join-ok">You&apos;re on it.</p>
        ) : (
          <form
            className="join-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.trim()) return;
              setDone(true);
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
            <button type="submit">Join</button>
          </form>
        )}
      </div>
    </section>
  );
}
