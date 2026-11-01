/**
 * Rights notice for reproduced lyrics.
 *
 * Shown in two places: under the lyrics on a song page (where the reproduction
 * actually happens) and in the site footer. The wording deliberately avoids
 * "fair use" — that claim needs a legal basis this site doesn't have — and
 * instead states what is true: no ownership is claimed, nothing is sold, and
 * content is removed on request.
 *
 * Set NEXT_PUBLIC_CONTACT_EMAIL to turn the takedown route into a real mailto.
 */

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

function Contact() {
  if (!CONTACT_EMAIL) {
    return <>contact the site owner</>;
  }
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-500 hover:text-sky-400 underline">
      {CONTACT_EMAIL}
    </a>
  );
}

export default function RightsNotice({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "short";
  className?: string;
}) {
  if (variant === "short") {
    return (
      <p className={`text-center text-xs leading-relaxed text-slate-600 ${className}`}>
        All lyrics and song credits remain the property of their respective rights holders and are
        shown for personal, non-commercial reference only. No ownership is claimed.
      </p>
    );
  }

  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      Lyrics and song credits remain the property of their respective rights holders — lyricists,
      composers, performers and publishers. They are reproduced here for personal, non-commercial
      reference only, and no ownership is claimed. If you are a rights holder and would like this
      song removed, <Contact /> and it will be taken down promptly.
    </p>
  );
}
