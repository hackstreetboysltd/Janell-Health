/**
 * Post–account-picker / sign-out hold — Sherehe-style voided stub,
 * not the idle sign-in form.
 */
export function AuthLoadingStub({ status }: { status: string }) {
  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <article
        className="auth-loading-stub auth-loading-stub--solo"
        aria-labelledby="auth-loading-title"
      >
        <div className="auth-loading-punch" aria-hidden="true" />
        <h1 id="auth-loading-title">{status}</h1>
      </article>
    </div>
  );
}
