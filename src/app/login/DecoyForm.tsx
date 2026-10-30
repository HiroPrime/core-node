"use client";

import { useRef, useState } from "react";

/**
 * Decoy sign-in. It does nothing, on purpose: Submit ALWAYS says the credentials are wrong.
 * Nothing typed here leaves the page or is kept: no fetch/XHR, no logging, no storage, no state holding the values.
 * The inputs have no `name`, so even if the form were submitted natively (before hydration), the browser would send no fields.
 */
export default function DecoyForm() {
  const [shown, setShown] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      className="login-form"
      autoComplete="off"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.current?.reset();
        setShown(true);
      }}
    >
      <label className="login-field">
        <span>Username</span>
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} />
      </label>
      <label className="login-field">
        <span>Password</span>
        <input type="password" autoComplete="new-password" />
      </label>
      <button type="submit" className="login-submit">Submit</button>
      {shown ? <p role="alert" className="login-error">Incorrect username or password</p> : null}
    </form>
  );
}