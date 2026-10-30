import { useState } from "react";
import Screen from "../components/Screen";
import mark from "../assets/mark.png";

interface Props {
  onBack: () => void;
  onSubmit: () => Promise<void>;
}

export default function GithubLogin({ onBack, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);

    try {
      await onSubmit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "GitHub sign in failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[11px] font-semibold text-[var(--p1)]"
      >
        &#8249; Back
      </button>

      <img
        src={mark}
        alt=""
        className="mx-auto mt-2.5 h-[54px] w-auto rounded-xl dark:box-content dark:bg-[#ECE7FF] dark:p-1.5"
      />

      <div className="text-center">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-.02em]">
          Sign in with GitHub
        </h1>

        <p className="mb-0 mt-[5px] text-xs leading-[1.45] text-[var(--muted)]">
          Continue securely through GitHub to connect your repositories.
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--card)] px-4 py-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]">
        <p className="m-0 text-xs leading-5 text-[var(--muted)]">
          Parity uses GitHub OAuth. Your GitHub password is entered only on
          GitHub and is never collected by Parity.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-0 mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(90,50,198,.3)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#fff"
              d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
            />
          </svg>

          {loading ? "Connecting..." : "Continue with GitHub"}
        </button>
      </div>

      <div className="flex-1" />

      <p className="m-0 text-center text-[11px] text-[var(--muted)]">
        Free for individuals &middot; No credit card needed
      </p>
    </Screen>
  );
}
